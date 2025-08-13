// == Handles incoming HTTP requests for user operations ==
package user

import (
	"log"
	"net/http"
	"strconv"

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

	// Return the user details (sanitize nullable fields)
	context.JSON(http.StatusOK, gin.H{"user": serializeUser(user)})
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

	// Map users to serialized form
	serialized := make([]gin.H, 0, len(allUsers))
	for _, u := range allUsers {
		serialized = append(serialized, serializeUser(u))
	}
	context.JSON(http.StatusOK, gin.H{"users": serialized})
}

// GetUserByIDHandler retrieves a user by their ID.
func (handler *Handler) GetUserByIDHandler(context *gin.Context) {
	// Get the user ID from the URL parameters
	userIDParam := context.Param("user-id")
	if userIDParam == "" {
		context.JSON(http.StatusBadRequest, gin.H{
			"error": "user_id parameter is required",
		})
		return
	}

	// Convert userIDParam to int64
	userID, err := strconv.ParseInt(userIDParam, 10, 64)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid user_id format",
		})
		return
	}

	// Call the service to get the user by ID
	user, err := handler.service.GetUserByID(userID)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to fetch user by ID: " + err.Error(),
		})
		return
	}

	if user == nil {
		context.JSON(http.StatusNotFound, gin.H{
			"error": "user not found with ID: " + strconv.FormatInt(userID, 10),
		})
		return
	}

	context.JSON(http.StatusOK, gin.H{"user": serializeUser(user)})
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

// serializeUser flattens nullable SQL fields into plain JSON values.
func serializeUser(u *User) gin.H {
	var siteID interface{}
	if u.SiteID.Valid {
		siteID = u.SiteID.Int64
	} else {
		siteID = nil
	}
	var costCenterID interface{}
	if u.CostCenterID.Valid {
		costCenterID = u.CostCenterID.Int64
	} else {
		costCenterID = nil
	}
	var siteName interface{}
	if u.SiteName.Valid {
		siteName = u.SiteName.String
	} else {
		siteName = ""
	}
	var siteGroup interface{}
	if u.SiteGroupName.Valid {
		siteGroup = u.SiteGroupName.String
	} else {
		siteGroup = ""
	}
	var regionName interface{}
	if u.RegionName.Valid {
		regionName = u.RegionName.String
	} else {
		regionName = ""
	}
	return gin.H{
		"user_id":        u.UserID,
		"username":       u.Username,
		"email":          u.Email,
		"first_name":     u.FirstName,
		"last_name":      u.LastName,
		"position":       u.Position,
		"department":     u.Department,
		"division":       u.Division,
		"site_id":        siteID,
		"site_name":      siteName,
		"site_group":     siteGroup,
		"region_name":    regionName,
		"cost_center_id": costCenterID,
	}
}
