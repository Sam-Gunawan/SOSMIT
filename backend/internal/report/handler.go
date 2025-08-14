// == Handles all API requests related to Report ==
package report

import (
	"database/sql"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// Handler holds the report service.
type Handler struct {
	service *Service
}

// NewHandler creates a new report handler with the provided report service.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// GetOpnameStatsHandler retrieves the opname statistics for a given opname session ID.
func (handler *Handler) GetOpnameStatsHandler(context *gin.Context) {
	sessionIDStr := context.Param("session-id")
	if sessionIDStr == "" {
		context.JSON(http.StatusBadRequest, gin.H{"error": "session-id is required"})
		log.Printf("⚠ session_id is required but not provided")
		return
	}

	sessionID, err := strconv.ParseInt(sessionIDStr, 10, 64)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": "invalid session-id format"})
		log.Printf("⚠ Invalid session-id format: %s", sessionIDStr)
		return
	}

	// Call the service to get opname stats
	stats, err := handler.service.GetOpnameStats(sessionID)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch opname stats: " + err.Error()})
		log.Printf("❌ Error fetching opname stats for session ID %d: %v", sessionID, err)
		return
	}
	if stats == nil {
		context.JSON(http.StatusNotFound, gin.H{"message": "no opname stats found for session ID: " + strconv.FormatInt(sessionID, 10)})
		log.Printf("⚠ No opname stats found for session ID: %d", sessionID)
		return
	}

	// Return the opname stats
	context.JSON(http.StatusOK, gin.H{
		"working_assets":   stats.WorkingAssets,
		"broken_assets":    stats.BrokenAssets,
		"misplaced_assets": stats.MisplacedAssets,
		"missing_assets":   stats.MissingAssets,
	})
}

// GenerateBAPHandler streams the BAP PDF for a session.
func (handler *Handler) GenerateBAPHandler(context *gin.Context) {
	sessionIDStr := context.Param("session-id")
	if sessionIDStr == "" {
		context.JSON(http.StatusBadRequest, gin.H{"error": "session-id is required"})
		return
	}

	sessionID, err := strconv.ParseInt(sessionIDStr, 10, 64)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": "invalid session-id"})
		return
	}

	start := time.Now()
	log.Printf("[REPORT] START GenerateBAP session=%d", sessionID)

	pdfBytes, filename, err := handler.service.GenerateAndAssembleBAP(sessionID)
	if err != nil {
		log.Printf("[REPORT] ERROR GenerateBAP session=%d err=%v", sessionID, err)
		context.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate BAP PDF", "detail": err.Error()})
		return
	}

	log.Printf("[REPORT] DONE GenerateBAP session=%d bytes=%d elapsed=%s", sessionID, len(pdfBytes), time.Since(start))

	context.Header("Content-Type", "application/pdf")
	context.Header("Content-Disposition", "attachment; filename="+filename)
	context.Data(http.StatusOK, "application/pdf", pdfBytes)
}

// GetBAPRecapHandler returns recap rows (no nullable conversions needed besides basic types)
func (handler *Handler) GetBAPRecapHandler(context *gin.Context) {
	sessionIDStr := context.Param("session-id")
	if sessionIDStr == "" {
		context.JSON(http.StatusBadRequest, gin.H{"error": "session-id is required"})
		return
	}

	sessionID, err := strconv.ParseInt(sessionIDStr, 10, 64)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": "invalid session-id"})
		return
	}

	recap, err := handler.service.repo.GetBAPRecap(sessionID)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch recap", "detail": err.Error()})
		return
	}

	context.JSON(http.StatusOK, gin.H{"recap": recap})
}

// GetBAPDetailsHandler returns serialized detail rows with nullable fields flattened
func (handler *Handler) GetBAPDetailsHandler(context *gin.Context) {
	sessionIDStr := context.Param("session-id")
	if sessionIDStr == "" {
		context.JSON(http.StatusBadRequest, gin.H{"error": "session-id is required"})
		return
	}

	sessionID, err := strconv.ParseInt(sessionIDStr, 10, 64)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": "invalid session-id"})
		return
	}

	details, err := handler.service.repo.GetBAPDetails(sessionID)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch details", "detail": err.Error()})
		return
	}

	// Nullable helpers (allowed one-liners per your guideline)
	ns := func(ns sql.NullString) interface{} {
		if ns.Valid {
			return ns.String
		}
		return nil
	}
	ni := func(ni sql.NullInt64) interface{} {
		if ni.Valid {
			return ni.Int64
		}
		return nil
	}

	serialized := make([]gin.H, 0, len(details))
	for _, row := range details {
		var actionNotes interface{} = ns(row.ActionNotes)
		if actionNotes == nil {
			actionNotes = "-"
		}
		var costCenter interface{} = ni(row.CostCenterID)
		if costCenter == nil {
			costCenter = "-"
		}
		serialized = append(serialized, gin.H{
			"category":       row.Category,
			"company":        row.Company,
			"asset_tag":      row.AssetTag,
			"asset_name":     row.AssetName,
			"equipments":     ns(row.Equipments),
			"user_and_pos":   row.UserNameAndPosition,
			"asset_status":   row.AssetStatus,
			"action_notes":   actionNotes,
			"cost_center_id": costCenter,
		})
	}

	context.JSON(http.StatusOK, gin.H{"details": serialized})
}

// SetActionNotesHandler updates the action note for a specific asset change record
func (handler *Handler) SetActionNotesHandler(context *gin.Context) {
	// Security check: ensure user is authorized
	position, ok := context.Get("position")
	if !ok {
		context.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	if strings.ToLower(position.(string)) != "l1 support" {
		context.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	// Get user id from claims
	userID, ok := context.Get("user_id")
	if !ok {
		context.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	assetChangeIDStr := context.Param("asset-change-id")
	if assetChangeIDStr == "" {
		context.JSON(http.StatusBadRequest, gin.H{"error": "asset-change-id is required"})
		return
	}

	assetChangeID, err := strconv.ParseInt(assetChangeIDStr, 10, 64)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": "invalid asset-change-id"})
		return
	}

	var requestBody struct {
		ActionNotes string `json:"action_notes"`
	}
	if err := context.ShouldBindJSON(&requestBody); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if err := handler.service.SetActionNotes(assetChangeID, userID.(int64), requestBody.ActionNotes); err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "failed to set action notes", "detail": err.Error()})
		return
	}

	context.JSON(http.StatusOK, gin.H{"status": "success"})
}

// DeleteActionNotesHandler removes the action note for a specific asset change record
func (handler *Handler) DeleteActionNotesHandler(context *gin.Context) {
	// Security check: ensure user is authorized
	position, ok := context.Get("position")
	if !ok {
		context.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	if strings.ToLower(position.(string)) != "l1 support" {
		context.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	// Get user id from claims
	userID, ok := context.Get("user_id")
	if !ok {
		context.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	assetChangeIDStr := context.Param("asset-change-id")
	if assetChangeIDStr == "" {
		context.JSON(http.StatusBadRequest, gin.H{"error": "asset-change-id is required"})
		return
	}

	assetChangeID, err := strconv.ParseInt(assetChangeIDStr, 10, 64)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": "invalid asset-change-id"})
		return
	}

	if err := handler.service.DeleteActionNotes(assetChangeID, userID.(int64)); err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete action notes", "detail": err.Error()})
		return
	}

	context.JSON(http.StatusOK, gin.H{"status": "success"})
}
