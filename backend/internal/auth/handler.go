// == Handles incoming HTTP requests for authentication operations ==
package auth

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Handler holds the authentication service.
type Handler struct {
	service *Service
}

// NewHandler creates a new auth handler with the provided authentication service.
func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

// LoginRequest defines the structure of the login request in JSON format.
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginHandler processes the login request.
func (handler *Handler) LoginHandler(context *gin.Context) {
	var request LoginRequest

	// Bind the incoming JSON request to the LoginRequest struct.
	// If the JSON is malformed or required fields are missing, it will return a 400 Bad Request response (Gin handles it).
	if err := context.ShouldBindJSON(&request); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Call the login service to validate the credentials and generate a JWT token.
	token, err := handler.service.Login(request.Username, request.Password)
	if err != nil {
		// If an error occurs during login, return a 401 Unauthorized response with the error message.
		context.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// If login is successful, return a 200 OK response with the JWT token.
	context.JSON(http.StatusOK, gin.H{"token": token})

}
