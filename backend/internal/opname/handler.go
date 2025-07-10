// == Handles API requests related to Opname ==
package opname

import (
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

// StartNewSessionHandler handles the creation of a new opname session.
func (handler *Handler) StartNewSessionHandler(context *gin.Context) {
	// Get the site ID from the URL parameter, api/opname/:site-id/start
	siteIDstr := context.Param("site-id")
	siteID, err := strconv.Atoi(siteIDstr)
	if err != nil || siteID <= 0 {
		context.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid request, missing or invalid site_id",
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
	newSessionID, err := handler.service.StartNewSession(int(userID.(int64)), siteID)
	if err != nil {
		context.JSON(http.StatusConflict, gin.H{
			"error": "failed to start new opname: " + err.Error(),
		})
		return
	}

	// If successful, return the new session ID
	context.JSON(http.StatusOK, gin.H{
		"message":    "New opname session started successfully",
		"session_id": newSessionID,
	})
}

// GetSessionByIDHandler retrieves an opname session by its ID.
func (handler *Handler) GetSessionByIDHandler(context *gin.Context) {
	sessionIDstr := context.Param("session-id")
	sessionID, err := strconv.Atoi(sessionIDstr)
	if err != nil || sessionID <= 0 {
		log.Printf("⚠ Invalid session ID: %s", sessionIDstr)
		context.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid request, missing or invalid session_id",
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
	sessionID, err := strconv.Atoi(sessionIDstr)
	if err != nil || sessionID <= 0 {
		context.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid request, missing or invalid session_id",
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
