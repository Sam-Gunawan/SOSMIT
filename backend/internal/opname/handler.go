// == Handles API requests related to Opname ==
package opname

import (
	"fmt"
	"log"
	"net/http"
	"strconv"

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

type StartNewSessionRequest struct {
	SiteID int `json:"site_id" binding:"required"`
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
	// Bind the request body to StartNewSessionRequest struct
	var request StartNewSessionRequest
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
	newSessionID, err := handler.service.StartNewSession(int(userID.(int64)), request.SiteID)
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
		"session_id":  session.ID,
		"start_date":  session.StartDate,
		"end_date":    session.EndDate,
		"status":      session.Status,
		"user_id":     session.UserID,
		"approver_id": session.ApproverID,
		"site_id":     session.SiteID,
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
	AssetTag             string `json:"asset_tag" binding:"required"`
	NewStatus            string `json:"new_status"`
	NewStatusReason      string `json:"new_status_reason"`
	NewCondition         bool   `json:"new_condition"`
	NewConditionNotes    string `json:"new_condition_notes"`
	NewConditionPhotoURL string `json:"new_condition_photo_url"`
	NewLocation          string `json:"new_location"`
	NewRoom              string `json:"new_room"`
	NewOwnerID           int    `json:"new_owner_id"`
	NewSiteID            int    `json:"new_site_id"`
	ChangeReason         string `json:"change_reason"`
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
		NewCondition:         assetChangeRequest.NewCondition,
		NewConditionNotes:    assetChangeRequest.NewConditionNotes,
		NewConditionPhotoURL: assetChangeRequest.NewConditionPhotoURL,
		NewLocation:          assetChangeRequest.NewLocation,
		NewRoom:              assetChangeRequest.NewRoom,
		NewOwnerID:           assetChangeRequest.NewOwnerID,
		NewSiteID:            assetChangeRequest.NewSiteID,
		ChangeReason:         assetChangeRequest.ChangeReason,
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
