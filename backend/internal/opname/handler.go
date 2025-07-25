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
		"session_id": session.ID,
		"start_date": session.StartDate,
		"end_date":   session.EndDate,
		"status":     session.Status,
		"user_id":    session.UserID,
		"manager_reviewer_id": func() interface{} {
			if session.ManagerReviewerID.Valid {
				return session.ManagerReviewerID.Int64
			}
			return nil
		}(),
		"manager_reviewed_at": func() interface{} {
			if session.ManagerReviewedAt.Valid {
				return session.ManagerReviewedAt.String
			}
			return nil
		}(),
		"l1_reviewer_id": func() interface{} {
			if session.L1ReviewerID.Valid {
				return session.L1ReviewerID.Int64
			}
			return nil
		}(),
		"l1_reviewed_at": func() interface{} {
			if session.L1ReviewedAt.Valid {
				return session.L1ReviewedAt.String
			}
			return nil
		}(),
		"site_id": session.SiteID,
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
	NewCondition         *bool   `json:"new_condition"`
	NewConditionNotes    *string `json:"new_condition_notes"`
	NewConditionPhotoURL *string `json:"new_condition_photo_url"`
	NewLocation          *string `json:"new_location"`
	NewRoom              *string `json:"new_room"`
	NewEquipments        *string `json:"new_equipments"`
	NewOwnerID           *int    `json:"new_owner_id"`
	NewSiteID            *int    `json:"new_site_id"`
	ChangeReason         string  `json:"change_reason"`
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
		NewEquipments:        assetChangeRequest.NewEquipments,
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
			"id":            progress.ID,
			"asset_tag":     progress.AssetTag,
			"changes":       string(progress.Changes),
			"change_reason": progress.ChangeReason,
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

// GetOpnameOnSiteHandler retrieves all opname sessions for a specific site.
func (handler *Handler) GetOpnameOnSiteHandler(context *gin.Context) {
	// Get the site ID from the URL parameter
	siteIDstr := context.Param("site_id")
	siteID, err := strconv.Atoi(siteIDstr)
	if err != nil || siteID <= 0 {
		log.Printf("⚠ Invalid site ID: %s", siteIDstr)
		context.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid site_id, must be a positive integer",
		})
		return
	}

	// Call the service to get all opname sessions for the site
	sessions, err := handler.service.GetOpnameOnSite(siteID)
	if err != nil {
		log.Printf("❌ Error retrieving opname sessions for site %d: %v", siteID, err)
		context.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to retrieve opname sessions: " + err.Error(),
		})
		return
	}
	if len(sessions) == 0 {
		log.Printf("⚠ No opname sessions found for site %d", siteID)
		context.JSON(http.StatusOK, gin.H{
			"message":  "No opname sessions found for this site",
			"sessions": []OpnameFilter{},
		})
		return
	}

	// If successful, return the list of sessions
	log.Printf("✅ Retrieved %d opname sessions for site %d", len(sessions), siteID)
	context.JSON(http.StatusOK, gin.H{
		"message":  fmt.Sprintf("Retrieved %d opname sessions for site %d", len(sessions), siteID),
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
