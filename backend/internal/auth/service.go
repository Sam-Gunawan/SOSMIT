// == Handles authentication logic ==
package auth

import (
	"errors"
	"strings"
	"time"

	"github.com/Sam-Gunawan/SOSMIT/backend/internal/user"
	"github.com/golang-jwt/jwt/v5"
)

// A secret key used to sign JWT tokens.
// In this project, we use a hardcoded secret key for simplicity.
var secretJWTKey = []byte("sosmit_secret_key")

// Service struct represents the authentication service.
// It holds the secret key used for signing JWT tokens.
type Service struct {
	userRepo *user.Repository
}

// NewService creates a new instance of the authentication service.
func NewService(userRepo *user.Repository) *Service {
	return &Service{
		userRepo: userRepo,
	}
}

// Login validates the user's credentials and returns a JWT token if successful.
func (service *Service) Login(username, password string) (string, error) {
	// Block system placeholder accounts explicitly (case-insensitive)
	if strings.EqualFold(username, "vacant") {
		return "", errors.New("invalid username or password")
	}
	// Fetch user credentials from the repository.
	userCredentials, err := service.userRepo.GetUserCredentials(username)
	if err != nil {
		// Database error occurred while fetching user credentials.
		return "", err
	}
	if userCredentials == nil {
		// No user found with the provided username.
		return "", errors.New("invalid username or password")
	}

	// Check if the provided password matches the stored password.
	if userCredentials.Password != password {
		// Password does not match.
		return "", errors.New("invalid username or password")
	}

	// Check if the user has access to the system.
	// Only positions listed below have access.
	// ! Note: This is a temporary measure and should be replaced with a more robust access control system, e.g. storing user roles in the database.
	allowedPositions := []string{
		"ADMIN STAFF GENERAL AFFAIRS",
		"L1 SUPPORT",
		"AREA MANAGER",
		"IT SERVICES MANAGER",
		"FINANCE & ACCOUNTING MANAGER",
	}
	hasAccess := false
	for _, p := range allowedPositions {
		if strings.EqualFold(strings.ToUpper(userCredentials.Position), strings.ToUpper(p)) {
			hasAccess = true
			break
		}
	}
	if !hasAccess {
		// User does not have the required position to access the system.
		return "", errors.New("user does not have access to the system")
	}

	// Generate a JWT token for the user.
	// Create the claims for the token.
	// Claims are the data that will be encoded in the JWT token.
	claims := jwt.MapClaims{
		"user_id":  userCredentials.UserID,
		"username": userCredentials.Username,
		"position": userCredentials.Position,
		"exp":      time.Now().Add(time.Hour * 720).Unix(), // Token expires in 720 hours (only for educational purposes, unrelated to SM's policies)
	}

	// Create the token using the claims and the secret key.
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Sign the token with the secret key.
	signedToken, err := token.SignedString(secretJWTKey)
	if err != nil {
		// Error while signing the token.
		return "", errors.New("error signing the token")
	}

	return signedToken, nil
}
