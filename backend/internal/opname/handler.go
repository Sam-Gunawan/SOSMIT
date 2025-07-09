// == Handles API requests related to Opname ==
package opname

import (
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
	// Get the site ID from the URL parameter, api/site/:site-id/opname/start
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
