// == Handles all database operations related to User ==
package user

import (
	"database/sql"
	"log"
)

// User struct represents a user in the system.
type User struct {
	Username string
	Password string
	Position string
}

// Repository struct holds the database connection
// NOTE: We create a Repository struct to encapsulate database operations related to User.
// This allows us to easily manage database interactions and makes it easier to mock for testing.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new instance of Repository with the provided database connection.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{
		db: db,
	}
}

// GetUserCredentials retrieves a user's credentials by their username from the database.
// It is a method of the Repository struct, which holds the database connection.
func (repo *Repository) GetUserCredentials(username string) (*User, error) {
	var user User

	// get_credentials returns username, password, position
	// It takes in a username with VARCHAR(255) type
	query := `SELECT * FROM get_credentials($1)`

	err := repo.db.QueryRow(query, username).Scan(&user.Username, &user.Password, &user.Position)
	if err != nil {
		if err == sql.ErrNoRows {
			// If no user is found, return nil
			// It is a valid case where the user does not exist
			log.Printf("⚠ No user found with username: %s\n", username)
			return nil, nil // No user found
		}

		// Any other error is unexpected
		log.Printf("❌ Error retrieving user credentials for username: %s, error: %v\n", username, err)
	}

	// Return the user credentials
	log.Printf("✅ Successfully retrieved user credentials for username: %s\n", username)
	return &user, nil
}
