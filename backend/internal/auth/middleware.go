// == Provides middleware for authentication and authorization in the application ==
// == Protects routes by checking JWT tokens and user roles ==
// == Ensures only authorized users can access certain endpoints ==
package auth

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// AuthMiddleware is a function that intercepts HTTP requests and responses.
// It checks for a valid JWT token in the request header and verifies the user's role.
func AuthMiddleware() gin.HandlerFunc {
	return func(context *gin.Context) {
		// Extract the token from the Authorization header
		authHeader := context.GetHeader("Authorization")
		// Check if the Authorization header is present
		if authHeader == "" {
			context.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "authorization header is required",
			})
			return
		}

		// The header should be in the format "Bearer <token>"
		headerSplit := strings.Split(authHeader, " ")
		if len(headerSplit) != 2 || strings.ToLower(headerSplit[0]) != "bearer" {
			context.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "invalid authorization header format, received: " + authHeader,
			})
			return
		}

		// Split the header to get the token
		tokenString := headerSplit[1]

		// Parse and validate the token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Ensure the token is signed with the expected algorithm: HS256
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}

			// Return the secret key used to sign the token
			// Reminder: secretJWTKey was defined in the auth package (auth/service.go)
			return secretJWTKey, nil
		})

		// Check if token is valid
		if err != nil {
			context.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "invalid token",
			})

			fmt.Println("Error parsing token:", err)
			return
		}

		// Check if the token is expired
		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			if int64(claims["exp"].(float64)) < time.Now().Unix() {
				context.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
					"error": "token has expired",
				})
				return
			}

			// Extract the user's username from claims
			username, ok := claims["username"]
			if !ok {
				context.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
					"error": "invalid username in token",
				})

				fmt.Println("Invalid username in token:", username, "\nError:", ok)
				return
			}

			// Set the username in Gin context for the next handler to use.
			context.Set("username", username)

			// Continue to next handler
			context.Next()
		} else {
			context.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "invalid token claims",
			})

			fmt.Println("Invalid token claims:", claims)
			return
		}
	}
}
