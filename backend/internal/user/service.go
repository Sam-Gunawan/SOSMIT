// == Handles all logical operations related to User ==
package user

import "log"

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

// GetUserSiteCards retrieves all site cards for a user by their user ID.
func (service *Service) GetUserSiteCards(userID int64) ([]*UserSiteCard, error) {
	userSiteCards, err := service.repo.GetUserSiteCards(userID)
	if err != nil {
		// Log the error and return it
		log.Printf("Error fetching user site cards for user_id %d: %v", userID, err)
		return nil, err
	}

	if userSiteCards == nil {
		// If no site cards are found, return an empty slice
		log.Printf("No site cards found for user_id: %d", userID)
		return nil, nil // No site cards found
	}

	log.Printf("Successfully retrieved %d site cards for user_id: %d", len(userSiteCards), userID)
	return userSiteCards, nil
}
