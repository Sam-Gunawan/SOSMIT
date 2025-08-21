// == Handles all logical operations related to User ==
package user

import (
	"errors"
	"log"
)

type Service struct {
	repo *Repository
}

// NewService creates a new instance of the user service.
func NewService(repo *Repository) *Service {
	return &Service{
		repo: repo,
	}
}

// GetUserByUsername retrieves a user by their username.
func (service *Service) GetUserByUsername(username string) (*User, error) {
	user, err := service.repo.GetUserByUsername(username)
	if err != nil {
		// Log the error and return it
		log.Printf("Error fetching user by username %s: %v", username, err)
		return nil, err
	}
	if user == nil {
		// If no user is found, return nil
		log.Printf("No user found with username: %s", username)
		return nil, nil // No user found
	}

	log.Printf("Successfully retrieved user by username: %s", username)
	return user, nil
}

// GetAllUsers retrieves all users from the repository.
func (service *Service) GetAllUsers() ([]*User, error) {
	allUsers, err := service.repo.GetAllUsers()
	if err != nil {
		// Log the error and return it
		log.Printf("Error fetching all users: %v", err)
		return nil, err
	}

	if allUsers == nil {
		// If no users are found, return an empty slice
		log.Println("No users found in the system")
		return nil, nil // No users found
	}

	log.Printf("Successfully retrieved %d users", len(allUsers))
	return allUsers, nil
}

// GetUserByID retrieves a user by their ID.
func (service *Service) GetUserByID(userID int64) (*User, error) {
	user, err := service.repo.GetUserByID(userID)
	if err != nil {
		// Log the error and return it
		log.Printf("Error fetching user by ID %d: %v", userID, err)
		return nil, err
	}
	if user == nil {
		// If no user is found, return nil
		log.Printf("No user found with ID: %d", userID)
		return nil, nil // No user found
	}

	log.Printf("Successfully retrieved user by ID: %d", userID)
	return user, nil
}

// GetUserOpnameLocation retrieves all the opname locations for a user.
func (service *Service) GetUserOpnameLocations(userID int, position string, filter OpnameLocationFilter) ([]OpnameLocations, error) {
	// Validate userID
	if userID <= 0 {
		log.Printf("⚠ Invalid userID: %d", userID)
		return nil, errors.New("invalid userID")
	}

	// Call the repository to get the user's opname locations
	locations, err := service.repo.GetUserOpnameLocations(userID, position, filter)
	if err != nil {
		log.Printf("❌ Error retrieving opname locations for user %d: %v", userID, err)
		return nil, err
	}

	return locations, nil
}
