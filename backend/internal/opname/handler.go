// == Handles API requests related to Opname ==
package opname

import (
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/Sam-Gunawan/SOSMIT/backend/internal/asset"
	"github.com/Sam-Gunawan/SOSMIT/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

// NewHandler creates a new Opname handler with the provided service.
func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

type RequestWithLocation struct {
	SiteID *int `json:"site_id"`
	DeptID *int `json:"dept_id"`
}

// validateSessionID checks if the session ID is valid and returns an error if not.
func validateSessionID(sessionIDstr string) (int, error) {
	sessionID, err := strconv.Atoi(sessionIDstr)
	if err != nil || sessionID <= 0 {
		log.Printf("⚠ Invalid session ID: %s", sessionIDstr)
		return -1, err
	}
	return sessionID, nil
}

// StartNewSessionHandler handles the creation of a new opname session.
func (handler *Handler) StartNewSessionHandler(context *gin.Context) {
	// Bind the request body to RequestWithLocation struct
	var request RequestWithLocation
	if err := context.ShouldBindJSON(&request); err != nil {
		log.Printf("❌ Error binding request body: %v", err)
		context.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid request body: " + err.Error(),
		})
		return
	}

	// Get the user ID from context (placed by auth middleware)
	userID, exists := context.Get("user_id")
	if !exists {
		context.JSON(http.StatusUnauthorized, gin.H{
			"error": "user unauthorized, user_id not found in context",
		})
		return
	}

	// Call the service with the validated user ID and site ID
	newSessionID, err := handler.service.StartNewSession(int(userID.(int64)), request.SiteID, request.DeptID)
	if err != nil {
		context.JSON(http.StatusConflict, gin.H{
			"error": "failed to start new opname: " + err.Error(),
		})
		return
	}

	// If successful, return the new session ID
	context.JSON(http.StatusCreated, gin.H{
		"message":    "New opname session started successfully",
		"session_id": newSessionID,
	})
}

// GetSessionByIDHandler retrieves an opname session by its ID.
func (handler *Handler) GetSessionByIDHandler(context *gin.Context) {
	sessionIDstr := context.Param("session-id")
	sessionID, err := validateSessionID(sessionIDstr)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid session_id, must be a positive integer",
		})
		return
	}

	// Call the service to get the session by ID
	session, err := handler.service.GetSessionByID(sessionID)
	if err != nil {
		log.Printf("❌ Error retrieving opname session by ID %d: %v", sessionID, err)
		context.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to retrieve opname session: " + err.Error(),
		})
		return
	}
	if session == nil {
		log.Printf("⚠ No opname session found with ID: %d", sessionID)
		context.JSON(http.StatusNotFound, gin.H{
			"error": "opname session not found",
		})
		return
	}

	context.JSON(http.StatusOK, gin.H{
		"session_id":          session.ID,
		"start_date":          session.StartDate,
		"end_date":            utils.SerializeNS(session.EndDate),
		"status":              session.Status,
		"user_id":             session.UserID,
		"manager_reviewer_id": utils.SerializeNI(session.ManagerReviewerID),
		"manager_reviewed_at": utils.SerializeNS(session.ManagerReviewedAt),
		"l1_reviewer_id":      utils.SerializeNI(session.L1ReviewerID),
		"l1_reviewed_at":      utils.SerializeNS(session.L1ReviewedAt),
		"site_id":             session.SiteID,
	})
}

// DeleteSessionHandler handles the cancellation of an opname session.
func (handler *Handler) DeleteSessionHandler(context *gin.Context) {
	// Get the session ID from the URL parameter, api/opname/:session-id/cancel
	sessionIDstr := context.Param("session-id")
	sessionID, err := validateSessionID(sessionIDstr)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid session_id, must be a positive integer",
		})
		return
	}

	// Get the user ID and position from context (placed by auth middleware)
	userID, _ := context.Get("user_id")
	userPosition, _ := context.Get("position")

	// Call the service to cancel the session
	err = handler.service.DeleteSession(sessionID, int(userID.(int64)), userPosition.(string))
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to cancel opname session: " + err.Error(),
		})
		return
	}

	// If successful, return a success message
	context.JSON(http.StatusOK, gin.H{
		"message": "Opname session cancelled successfully",
	})
}

// AssetChangeRequest represents a request to change an asset during an opname session.
// This struct can be extended with fields as needed to capture the changes made to an asset.
type AssetChangeRequest struct {
	AssetTag             string  `json:"asset_tag" binding:"required"`
	NewStatus            *string `json:"new_status"`
	NewStatusReason      *string `json:"new_status_reason"`
	NewSerialNumber      *string `json:"new_serial_number"`
	NewCondition         *int    `json:"new_condition"`
	NewConditionNotes    *string `json:"new_condition_notes"`
	NewLossNotes         *string `json:"new_loss_notes"`
	NewConditionPhotoURL *string `json:"new_condition_photo_url"`
	NewLocation          *string `json:"new_location"`
	NewRoom              *string `json:"new_room"`
	NewEquipments        *string `json:"new_equipments"`
	NewOwnerID           *int    `json:"new_owner_id"`
	NewOwnerPosition     *string `json:"new_owner_position"`
	NewOwnerDepartment   *string `json:"new_owner_department"`
	NewOwnerDivision     *string `json:"new_owner_division"`
	NewOwnerCostCenter   *int    `json:"new_owner_cost_center"`
	NewSubSiteID         *int    `json:"new_sub_site_id"`
	NewOwnerSiteID       *int    `json:"new_owner_site_id"`
	ChangeReason         string  `json:"change_reason"`
	ProcessingStatus     string  `json:"processing_status" binding:"required,oneof=pending edited all_good"`
}

// ProcessAssetChangesHandler handles the processing of asset changes during an opname session.
func (handler *Handler) ProcessAssetChangesHandler(context *gin.Context) {
	// Bind the request body to AssetChangeRequest struct
	var assetChangeRequest AssetChangeRequest
	if err := context.ShouldBindJSON(&assetChangeRequest); err != nil {
		log.Printf("❌ Error binding request body: %v", err)
		context.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid request body: " + err.Error(),
		})
		return
	}

	// Get and validate session ID
	sessionIDstr := context.Param("session-id")
	sessionID, err := strconv.Atoi(sessionIDstr)
	if err != nil {
		log.Printf("⚠ Invalid session ID: %s", sessionIDstr)
		context.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid session_id, must be an integer",
		})
		return
	}
	if sessionID < -1 {
		log.Printf("⚠ Invalid session ID: %d", sessionID)
		context.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid session_id, must be greater than -1",
		})
		return
	}

	// Map the asset change request to an AssetChange struct
	// NOTE: This should match the database schema for asset changes.
	changedAsset := AssetChange{
		SessionID:            sessionID,
		AssetTag:             assetChangeRequest.AssetTag,
		NewStatus:            assetChangeRequest.NewStatus,
		NewStatusReason:      assetChangeRequest.NewStatusReason,
		NewSerialNumber:      assetChangeRequest.NewSerialNumber,
		NewCondition:         assetChangeRequest.NewCondition,
		NewConditionNotes:    assetChangeRequest.NewConditionNotes,
		NewConditionPhotoURL: assetChangeRequest.NewConditionPhotoURL,
		NewLossNotes:         assetChangeRequest.NewLossNotes,
		NewLocation:          assetChangeRequest.NewLocation,
		NewRoom:              assetChangeRequest.NewRoom,
		NewEquipments:        assetChangeRequest.NewEquipments,
		NewOwnerID:           assetChangeRequest.NewOwnerID,
		NewOwnerPosition:     assetChangeRequest.NewOwnerPosition,
		NewOwnerDepartment:   assetChangeRequest.NewOwnerDepartment,
		NewOwnerDivision:     assetChangeRequest.NewOwnerDivision,
		NewOwnerCostCenter:   assetChangeRequest.NewOwnerCostCenter,
		NewSubSiteID:         assetChangeRequest.NewSubSiteID,
		NewOwnerSiteID:       assetChangeRequest.NewOwnerSiteID,
		ChangeReason:         assetChangeRequest.ChangeReason,
		ProcessingStatus:     assetChangeRequest.ProcessingStatus,
	}

	changesJSON, err := handler.service.ProcessAssetChanges(changedAsset)
	if err != nil {
		log.Printf("❌ Error processing asset changes for session %d, asset %s: %v", sessionID, assetChangeRequest.AssetTag, err)
		context.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to process asset changes: " + err.Error(),
		})
		return
	}

	// If successful, return the changes in JSON format.
	context.JSON(http.StatusOK, gin.H{
		"message": "Asset changes processed successfully",
		"changes": string(changesJSON),
	})
}

type RemoveAssetChangeRequest struct {
	AssetTag string `json:"asset_tag" binding:"required"`
}

// RemoveAssetChangeHandler removes an asset change from an opname session.
func (handler *Handler) RemoveAssetChangeHandler(context *gin.Context) {
	// Bind the request body to RemoveAssetChangeRequest struct
	var request RemoveAssetChangeRequest
	if err := context.ShouldBindJSON(&request); err != nil {
		log.Printf("❌ Error binding request body: %v", err)
		context.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid request body: " + err.Error(),
		})
		return
	}

	// Get the session ID from URL parameter
	sessionIDstr := context.Param("session-id")
	sessionID, err := validateSessionID(sessionIDstr)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid session_id, must be a positive integer",
		})
		return
	}
	if sessionID < -1 {
		log.Printf("⚠ Invalid session ID: %d", sessionID)
		context.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid session_id, must be greater than -1",
		})
		return
	}

	// Call the service to remove the asset change
	err = handler.service.RemoveAssetChange(sessionID, request.AssetTag)
	if err != nil {
		log.Printf("❌ Error removing asset change for session %d, asset %s: %v", sessionID, request.AssetTag, err)
		context.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to remove asset change: " + err.Error(),
		})
		return
	}

	// If successful, return a success message
	context.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Asset change for %s removed successfully", request.AssetTag),
	})

}

// LoadOpnameProgressHandler retrieves the progress of an opname session.
func (handler *Handler) LoadOpnameProgressHandler(context *gin.Context) {
	// Get the session ID from the URL parameter
	sessionIDstr := context.Param("session-id")
	sessionID, err := validateSessionID(sessionIDstr)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid session_id, must be a positive integer",
		})
		return
	}

	// Call the service to load the opname progress
	progressList, err := handler.service.LoadOpnameProgress(sessionID)
	if err != nil {
		log.Printf("❌ Error loading opname progress for session %d: %v", sessionID, err)
		context.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to load opname progress: " + err.Error(),
		})
		return
	}

	if len(progressList) == 0 {
		log.Printf("⚠ No changes found for opname session %d", sessionID)
		context.JSON(http.StatusOK, gin.H{
			"message":  "No changes found for this opname session",
			"progress": []map[string]any{},
		})
		return
	}

	// Transform the progress list into a more structured response
	var responseProgress []map[string]any
	for _, progress := range progressList {
		progressItem := map[string]any{
			"id":                progress.ID,
			"asset_tag":         progress.AssetTag,
			"changes":           string(progress.Changes),
			"change_reason":     progress.ChangeReason,
			"processing_status": progress.ProcessingStatus,
			"action_notes":      progress.ActionNotes,
		}
		responseProgress = append(responseProgress, progressItem)
	}

	log.Printf("✅ Opname progress for session %d loaded successfully", sessionID)
	context.JSON(http.StatusOK, gin.H{
		"message":  "Opname progress loaded successfully",
		"progress": responseProgress,
	})
}

// FinishOpnameSessionHandler marks an opname session as finished.
func (handler *Handler) FinishOpnameSessionHandler(context *gin.Context) {
	// Get the session ID from the URL parameter
	sessionIDstr := context.Param("session-id")
	sessionID, err := validateSessionID(sessionIDstr)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid session_id, must be a positive integer",
		})
		return
	}

	// Get the user ID from context (placed by auth middleware)
	userID, exists := context.Get("user_id")
	if !exists {
		context.JSON(http.StatusUnauthorized, gin.H{
			"error": "user unauthorized, user_id not found in context",
		})
		return
	}

	// Call the service to finish the opname session
	err = handler.service.FinishOpnameSession(sessionID, userID.(int64))
	if err != nil {
		log.Printf("❌ Error finishing opname session with ID %d: %v", sessionID, err)
		context.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to finish opname session: " + err.Error(),
		})
		return
	}

	log.Printf("✅ Opname session with ID %d finished successfully", sessionID)
	context.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Opname session %d finished successfully", sessionID),
	})
}

// GetOpnameOnLocationHandler retrieves all opname sessions for a specific location.
func (handler *Handler) GetOpnameOnLocationHandler(context *gin.Context) {
	// Read optional query params: /api/opname/location?site_id=1&dept_id=2
	siteIDStr := context.Query("site_id")
	deptIDStr := context.Query("dept_id")

	siteID, deptID, err := utils.ParseLocationParams(siteIDStr, deptIDStr)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	sessions, err := handler.service.GetOpnameOnLocation(siteID, deptID)
	if err != nil {
		log.Printf("❌ Error retrieving opname sessions for site %v dept %v: %v", utils.ParseNullableInt(siteID), utils.ParseNullableInt(deptID), err)
		context.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to retrieve opname sessions: " + err.Error(),
		})
		return
	}
	if len(sessions) == 0 {
		log.Printf("⚠ No opname sessions found for site %v dept %v", utils.ParseNullableInt(siteID), utils.ParseNullableInt(deptID))
		context.JSON(http.StatusOK, gin.H{
			"message":  "No opname sessions found for this filter",
			"sessions": []OpnameFilter{},
		})
		return
	}

	log.Printf("✅ Retrieved %d opname sessions for site %v dept %v",
		len(sessions), utils.ParseNullableInt(siteID), utils.ParseNullableInt(deptID))
	context.JSON(http.StatusOK, gin.H{
		"message":  fmt.Sprintf("Retrieved %d opname sessions", len(sessions)),
		"sessions": sessions,
	})
}

// ApproveOpnameSessionHandler verifies an opname session by its ID.
func (handler *Handler) ApproveOpnameSessionHandler(context *gin.Context) {
	// Get the session ID from the URL parameter
	sessionIDstr := context.Param("session-id")
	sessionID, err := validateSessionID(sessionIDstr)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid session_id, must be a positive integer",
		})
		return
	}

	// Get the user ID from context (placed by auth middleware)
	userID, exists := context.Get("user_id")
	if !exists {
		context.JSON(http.StatusUnauthorized, gin.H{
			"error": "user unauthorized, user_id not found in context",
		})
		return
	}

	// Call the service to verify the opname session
	err = handler.service.ApproveOpnameSession(sessionID, int(userID.(int64)))
	if err != nil {
		log.Printf("❌ Error verifying opname session with ID %d: %v", sessionID, err)
		context.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to verify opname session: " + err.Error(),
		})
		return
	}

	log.Printf("✅ Opname session with ID %d verified successfully", sessionID)
	context.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Opname session %d verified successfully", sessionID),
	})
}

// RejectOpnameSessionHandler rejects an opname session by its ID.
func (handler *Handler) RejectOpnameSessionHandler(context *gin.Context) {
	// Get the session ID from the URL parameter
	sessionIDstr := context.Param("session-id")
	sessionID, err := validateSessionID(sessionIDstr)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid session_id, must be a positive integer",
		})
		return
	}

	// Get the user ID from context (placed by auth middleware)
	userID, exists := context.Get("user_id")
	if !exists {
		context.JSON(http.StatusUnauthorized, gin.H{
			"error": "user unauthorized, user_id not found in context",
		})
		return
	}

	// Call the service to reject the opname session
	err = handler.service.RejectOpnameSession(sessionID, int(userID.(int64)))
	if err != nil {
		log.Printf("❌ Error rejecting opname session with ID %d: %v", sessionID, err)
		context.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to reject opname session: " + err.Error(),
		})
		return
	}

	log.Printf("✅ Opname session with ID %d rejected successfully", sessionID)
	context.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Opname session %d rejected successfully", sessionID),
	})
}

// GetUserFromOpnameSessionHandler retrieves the user associated with a specific opname session.
func (handler *Handler) GetUserFromOpnameSessionHandler(context *gin.Context) {
	// Get the session ID from the URL parameter
	sessionIDstr := context.Param("session-id")
	sessionID, err := validateSessionID(sessionIDstr)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid session_id, must be a positive integer",
		})
		return
	}

	// Call the service to get the user associated with the opname session
	user, err := handler.service.GetUserFromOpnameSession(sessionID)
	if err != nil {
		log.Printf("❌ Error retrieving user for opname session %d: %v", sessionID, err)
		context.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to retrieve user: " + err.Error(),
		})
		return
	}
	if user == nil {
		log.Printf("⚠ No user found for opname session ID: %d", sessionID)
		context.JSON(http.StatusNotFound, gin.H{
			"error": "user not found for this opname session",
		})
		return
	}

	context.JSON(http.StatusOK, gin.H{
		"user_id":    user.UserID,
		"username":   user.Username,
		"email":      user.Email,
		"first_name": user.FirstName,
		"last_name":  user.LastName,
		"position":   user.Position,
	})
}

// GetUnscannedAssetsHandler retrieves all unscanned assets for a specific opname session.
func (handler *Handler) GetUnscannedAssetsHandler(context *gin.Context) {
	// Get the session ID from the URL parameter
	sessionIDstr := context.Param("session-id")
	sessionID, err := validateSessionID(sessionIDstr)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid session_id, must be a positive integer",
		})
		return
	}

	// Call the service to get unscanned assets
	unscannedAssets, err := handler.service.GetUnscannedAssets(sessionID)
	if err != nil {
		log.Printf("❌ Error retrieving unscanned assets for opname session %d: %v", sessionID, err)
		context.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to retrieve unscanned assets: " + err.Error(),
		})
		return
	}

	context.JSON(http.StatusOK, asset.SerializeMultipleAssets(unscannedAssets))
}
