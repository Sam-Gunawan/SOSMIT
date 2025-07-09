// == Handles logical operations for Opname ==
package opname

import (
	"errors"
	"log"
)

type Service struct {
	repo *Repository
}

// NewService creates a new Opname service with the provided repository.
func NewService(repo *Repository) *Service {
	return &Service{
		repo: repo,
	}
}

// StartNewSession creates a new opname session for a user at a specific site.
func (service *Service) StartNewSession(userID int, siteID int) (int, error) {
	// Validate userID and siteID
	if userID <= 0 || siteID <= 0 {
		log.Printf("⚠ Invalid userID or siteID: userID=%d, siteID=%d", userID, siteID)
		return 0, errors.New("invalid userID or siteID")
	}

	// Call the repository to create a new session
	newSessionID, err := service.repo.CreateNewSession(userID, siteID)
	if err != nil {
		log.Printf("❌ Error creating new opname session: %v", err)
		return 0, err
	}

	// If newSessionID is 0, it indicates failure in session creation due to active sessions already available.
	// We translate this from business logic into a more user-friendly error.
	if newSessionID == 0 {
		log.Printf("⚠ No new session created, an active session already exists for siteID %d", siteID)
		return 0, errors.New("an active opname session already exists for this user at the specified site")
	}

	// If session creation is successful, return the new session ID
	return newSessionID, nil
}
