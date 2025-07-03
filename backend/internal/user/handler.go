// == Handles incoming HTTP requests for user operations ==
package user

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Handler holds the user repo.
type Handler struct {
	repo *Repository
}

// NewHandler creates a new user handler with the provided user service.
func NewHandler(repo *Repository) *Handler {
	return &Handler{
		repo: repo,
	}
}

// GetMeHandler fetches the data for currently logged-in user using their username.
func (handler *Handler) GetMeHandler(context *gin.Context) {
	// Get the username from context (placed by auth middleware)
	username, exists := context.Get("username")
	if !exists {
		context.JSON(http.StatusUnauthorized, gin.H{
			"error": "username not found in context for: " + username.(string),
		})
		return
	}

	// Call the repo to get user details
	user, err := handler.repo.GetUserByUsername(username.(string))
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to fetch user details: " + err.Error(),
		})
		return
	}

	// If user is nil, it means no user was found with that username
	if user == nil {
		context.JSON(http.StatusNotFound, gin.H{
			"error": "user not found with username: " + username.(string),
		})
		return
	}

	// Return the user details
	context.JSON(http.StatusOK, gin.H{
		"user_id":        user.UserID,
		"username":       user.Username,
		"first_name":     user.FirstName,
		"last_name":      user.LastName,
		"position":       user.Position,
		"site_name":      user.SiteName,
		"site_group":     user.SiteGroupName,
		"region_name":    user.RegionName,
		"cost_center_id": user.CostCenterID,
	})
}
