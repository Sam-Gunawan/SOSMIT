// == Handles incoming HTTP requests for user operations ==
package user

import (
	"log"
	"net/http"
	"strconv"

	"github.com/Sam-Gunawan/SOSMIT/backend/internal/utils"

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

// GetUserOpnameLocationsHandler retrieves all the opname locations for a user.
func (handler *Handler) GetUserOpnameLocationsHandler(context *gin.Context) {
	// Get the user ID from context (placed by auth middleware)
	userID, exists := context.Get("user_id")
	if !exists {
		context.JSON(http.StatusUnauthorized, gin.H{
			"error": "user unauthorized, user_id not found in context",
		})
		return
	}

	position, exists := context.Get("position")
	if !exists {
		context.JSON(http.StatusUnauthorized, gin.H{
			"error": "user unauthorized, position not found in context",
		})
		return
	}

	// Bind the query parameters to the OpnameLocationFilter struct
	var filter OpnameLocationFilter
	if err := context.ShouldBindQuery(&filter); err != nil {
		log.Printf("❌ Error binding query parameters: %v", err)
		context.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid query parameters: " + err.Error(),
		})
		return
	}

	// Call the service to get the user's opname locations
	// Handle both int64 and float64 types from JWT claims
	var userIDInt int
	switch v := userID.(type) {
	case int64:
		userIDInt = int(v)
	case float64:
		userIDInt = int(v)
	default:
		context.JSON(http.StatusInternalServerError, gin.H{
			"error": "invalid user_id type in context",
		})
		return
	}

	locations, err := handler.service.GetUserOpnameLocations(userIDInt, position.(string), filter)
	if err != nil {
		log.Printf("❌ Error retrieving opname locations for user %d: %v", userID, err)
		context.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to retrieve opname locations: " + err.Error(),
		})
		return
	}

	// Serialize the locations to handle nullable SQL fields
	serializedLocations := make([]gin.H, 0, len(locations))
	for _, location := range locations {
		serializedLocation := gin.H{
			"site_id":          utils.SerializeNI(location.SiteID),
			"dept_id":          utils.SerializeNI(location.DeptID),
			"dept_name":        utils.SerializeNS(location.DeptName),
			"site_name":        utils.SerializeNS(location.SiteName),
			"site_group_name":  utils.SerializeNS(location.SiteGroupName),
			"region_name":      utils.SerializeNS(location.RegionName),
			"opname_status":    location.OpnameStatus,
			"last_opname_date": utils.SerializeNS(location.LastOpnameDate),
			"last_opname_by":   utils.SerializeNS(location.LastOpnameBy),
			"total_count":      location.TotalCount,
		}
		serializedLocations = append(serializedLocations, serializedLocation)
	}

	context.JSON(http.StatusOK, gin.H{
		"message":   "successfully retrieved opname locations for logged-in user",
		"locations": serializedLocations,
		"total_count": func() int64 {
			if len(locations) > 0 {
				return locations[0].TotalCount
			}
			return 0
		}(),
	})
}

// serializeUser flattens nullable SQL fields into plain JSON values.
func serializeUser(u *User) gin.H {
	return gin.H{
		"user_id":        u.UserID,
		"username":       u.Username,
		"email":          u.Email,
		"first_name":     u.FirstName,
		"last_name":      u.LastName,
		"position":       u.Position,
		"department":     u.Department,
		"division":       u.Division,
		"site_id":        utils.SerializeNI(u.SiteID),
		"site_name":      utils.SerializeNS(u.SiteName),
		"site_group":     utils.SerializeNS(u.SiteGroupName),
		"region_name":    utils.SerializeNS(u.RegionName),
		"cost_center_id": utils.SerializeNI(u.CostCenterID),
	}
}
