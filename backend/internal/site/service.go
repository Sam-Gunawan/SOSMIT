// == Handles all logical operations related to site management ==
package site

import "log"

type Service struct {
	repo *Repository
}

// NewService creates a new instance of Service with the provided repository.
func NewService(repo *Repository) *Service {
	return &Service{
		repo: repo,
	}
}

// GetAllSites retrieves all sites from the repository.
func (service *Service) GetAllSites() ([]*Site, error) {
	allSites, err := service.repo.GetAllSites()
	if err != nil {
		// Log the error and return it
		log.Printf("Error fetching all sites: %v", err)
		return nil, err
	}

	if allSites == nil {
		// If no sites are found, return an empty slice
		log.Println("No sites found in the system")
		return nil, nil // No sites found
	}

	log.Printf("Successfully retrieved %d sites", len(allSites))
	return allSites, nil
}

// GetSiteByID retrieves a site by its ID from the repository.
func (service *Service) GetSiteByID(siteID int) (*Site, error) {
	site, err := service.repo.GetSiteByID(siteID)
	if err != nil {
		// Log the error and return it
		log.Printf("Error fetching site by ID %d: %v", siteID, err)
		return nil, err
	}
	if site == nil {
		// If no site is found, return nil
		log.Printf("No site found with ID: %d", siteID)
		return nil, nil // No site found
	}

	log.Printf("Successfully retrieved site by ID: %d", siteID)
	return site, nil
}
