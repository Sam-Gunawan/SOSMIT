// == Handles all logical operations related to Report ==
package report

import (
	"log"
)

type Service struct {
	repo *Repository
}

// NewService creates a new instance of Service with the provided repository.
func NewService(repo *Repository) *Service {
	return &Service{
		repo: repo,
	}
}

// GetOpnameStats retrieves the opname statistics for a given opname session ID.
func (service *Service) GetOpnameStats(sessionID int64) (*OpnameStats, error) {
	stats, _ := service.repo.GetOpnameStats(sessionID)

	log.Printf("✅ Successfully retrieved opname stats for session ID %d", sessionID)
	return stats, nil // Return the retrieved stats
}
