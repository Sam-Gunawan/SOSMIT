// == Handles all API requests related to Report ==
package report

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// Handler holds the report service.
type Handler struct{ service *Service }

// NewHandler creates a new report handler with the provided report service.
func NewHandler(service *Service) *Handler { return &Handler{service: service} }

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
func (handler *Handler) GenerateBAPHandler(c *gin.Context) {
	sessionIDStr := c.Param("session-id")
	if sessionIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "session-id is required"})
		return
	}
	sessionID, err := strconv.ParseInt(sessionIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session-id"})
		return
	}
	start := time.Now()
	log.Printf("[REPORT] START GenerateBAP session=%d", sessionID)
	pdfBytes, filename, err := handler.service.GenerateAndAssembleBAP(sessionID)
	if err != nil {
		log.Printf("[REPORT] ERROR GenerateBAP session=%d err=%v", sessionID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate BAP PDF", "detail": err.Error()})
		return
	}
	log.Printf("[REPORT] DONE GenerateBAP session=%d bytes=%d elapsed=%s", sessionID, len(pdfBytes), time.Since(start))
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}
