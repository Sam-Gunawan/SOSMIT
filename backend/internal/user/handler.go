// == Handles incoming HTTP requests for user operations ==
package user

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Handler holds the user repo.
type Handler struct {
	service *Service
}

// NewHandler creates a new user handler with the provided user service.
func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
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

	// Call the service to get user details
	user, err := handler.service.GetUserByUsername(username.(string))
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
		"email":          user.Email,
		"first_name":     user.FirstName,
		"last_name":      user.LastName,
		"position":       user.Position,
		"site_id":        user.SiteID,
		"site_name":      user.SiteName,
		"site_group":     user.SiteGroupName,
		"region_name":    user.RegionName,
		"cost_center_id": user.CostCenterID,
	})
}

// GetAllUsersHandler retrieves all users in the system.
func (handler *Handler) GetAllUsersHandler(context *gin.Context) {
	// Call the service to get all users
	allUsers, err := handler.service.GetAllUsers()
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to fetch all users: " + err.Error(),
		})
		return
	}

	if allUsers == nil {
		log.Println("No users found in the system")
		context.JSON(http.StatusNotFound, gin.H{
			"message": "no users found",
		})
		// No users found, send an empty array
		allUsers = make([]*User, 0)
	}

	context.JSON(http.StatusOK, gin.H{
		"users": allUsers,
	})
}

// GetUserSiteCardsHandler retrieves all the sites a user has access to.
func (handler *Handler) GetUserSiteCardsHandler(context *gin.Context) {
	// Get the user ID from context (placed by auth middleware)
	userID, exists := context.Get("user_id")
	if !exists {
		context.JSON(http.StatusUnauthorized, gin.H{
			"error": "user_id not found in context",
		})
		return
	}

	if userID == nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"error": "user_id is nil",
		})
		return
	}

	// Call the service to get user site cards
	userSiteCards, err := handler.service.GetUserSiteCards(userID.(int64))
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to fetch user site cards: " + err.Error(),
		})
		return
	}

	if userSiteCards == nil {
		// No site cards found, send an empty array
		userSiteCards = make([]*UserSiteCard, 0)
	}

	context.JSON(http.StatusOK, gin.H{
		"site_cards": userSiteCards,
	})
}
