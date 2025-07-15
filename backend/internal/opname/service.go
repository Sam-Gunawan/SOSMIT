// == Handles logical operations for Opname ==
package opname

import (
	"errors"
	"log"
	"strings"
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

// GetSessionByID retrieves an opname session by its ID.
func (service *Service) GetSessionByID(sessionID int) (*OpnameSession, error) {
	// Validate sessionID
	if sessionID <= 0 {
		log.Printf("⚠ Invalid sessionID: %d", sessionID)
		return nil, errors.New("invalid sessionID")
	}

	// Call the repository to get the session by ID
	session, err := service.repo.GetSessionByID(sessionID)
	if err != nil {
		log.Printf("❌ Error retrieving opname session by ID %d: %v", sessionID, err)
		return nil, err
	}

	// If no session is found, return an error
	if session == nil {
		log.Printf("⚠ No opname session found with ID: %d", sessionID)
		return nil, errors.New("opname session not found")
	}

	return session, nil
}

// DeleteSession deletes an opname session by its ID.
func (service *Service) DeleteSession(sessionID int, requestingUserID int, userPosition string) error {
	// Validate sessionID and checks if it exists.
	session, err := service.repo.GetSessionByID(sessionID)
	if err != nil {
		log.Printf("❌ Error retrieving opname session by ID %d: %v", sessionID, err)
		return err
	}

	if session == nil {
		log.Printf("⚠ No opname session found with ID: %d", sessionID)
		return errors.New("opname session not found")
	}

	// Security check!
	// Session can only be deleted by the user who created it or any L1 SUPPORT user.
	if session.UserID != requestingUserID && strings.ToUpper(userPosition) != "L1 SUPPORT" {
		log.Printf("⚠ Forbidden: User %d is not authorized to delete session %d", requestingUserID, sessionID)
		return errors.New("you are not authorized to delete this opname session")
	}

	// Call the repository to delete the session.
	err = service.repo.DeleteSession(sessionID)
	if err != nil {
		log.Printf("❌ Error deleting opname session with ID %d: %v", sessionID, err)
		return err
	}

	// If deletion is successful, log the success.
	log.Printf("✅ Opname session with ID %d deleted successfully", sessionID)
	return nil
}

// ProcessAssetChanges processes the changes made to an asset during an opname session.
func (service *Service) ProcessAssetChanges(changedAsset AssetChange) ([]byte, error) {
	changesJSON, err := service.repo.RecordAssetChange(changedAsset)
	if err != nil {
		log.Printf("❌ Error recording asset changes for session %d, asset %s: %v", changedAsset.SessionID, changedAsset.AssetTag, err)
		return nil, err
	}

	// Check if changesJSON is empty ('{}')
	if string(changesJSON) == "{}" {
		log.Printf("‼ No changes recorded for session %d, asset %s", changedAsset.SessionID, changedAsset.AssetTag)
	} else {
		log.Printf("✅ Asset changes for session %d, asset %s recorded successfully", changedAsset.SessionID, changedAsset.AssetTag)
	}

	// Return the changes to the handler
	return changesJSON, nil
}

// RemoveAssetChange removes an asset change from an opname session.
func (service *Service) RemoveAssetChange(sessionID int, assetTag string) error {
	// Validate sessionID and assetTag
	if sessionID <= 0 || assetTag == "" {
		log.Printf("⚠ Invalid sessionID or assetTag: sessionID=%d, assetTag=%s", sessionID, assetTag)
		return errors.New("invalid sessionID or assetTag")
	}

	// Call the repository to delete the asset change
	err := service.repo.DeleteAssetChange(sessionID, assetTag)
	if err != nil {
		log.Printf("❌ Error deleting asset change for session %d, asset %s: %v", sessionID, assetTag, err)
		return err
	}

	log.Printf("✅ Asset change for session %d, asset %s deleted successfully", sessionID, assetTag)
	return nil
}
