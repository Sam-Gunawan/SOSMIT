// == Handles all database operations related to site management ==
package site

import (
	"database/sql"
	"log"
)

type Repository struct {
	db *sql.DB
}

type Site struct {
	SiteID        int
	SiteName      string
	SiteGroupName string
	RegionName    string
	SiteGaID      string
	SiteGaName    string
	SiteGaEmail   string
}

// NewRepository creates a new site repository for managing site-related operations.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// GetAllSites retrieves all sites from the database.
func (repo *Repository) GetAllSites() ([]*Site, error) {
	var allSites []*Site

	rows, err := repo.db.Query("SELECT id, site_name, site_group_name, region_name, site_ga_id, site_ga_name, site_ga_email FROM get_all_sites()")
	if err != nil {
		log.Printf("❌ Error retrieving all sites, error: %v\n", err)
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var site Site
		if err := rows.Scan(&site.SiteID, &site.SiteName, &site.SiteGroupName, &site.RegionName, &site.SiteGaID, &site.SiteGaName, &site.SiteGaEmail); err != nil {
			return nil, err
		}
		allSites = append(allSites, &site)
	}

	return allSites, nil
}

// GetSiteByID retrieves a site by its ID from the database.
func (repo *Repository) GetSiteByID(siteID int) (*Site, error) {
	var site Site

	query := `SELECT id, site_name, site_group_name, region_name, site_ga_id, site_ga_name, site_ga_email FROM get_site_by_id($1)`
	err := repo.db.QueryRow(query, siteID).Scan(&site.SiteID, &site.SiteName, &site.SiteGroupName, &site.RegionName, &site.SiteGaID, &site.SiteGaName, &site.SiteGaEmail)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("⚠ No site found with ID: %d\n", siteID)
			return nil, nil // No site found
		}
		log.Printf("❌ Error retrieving site with ID: %d, error: %v\n", siteID, err)
		return nil, err // Return the error for unexpected cases
	}

	log.Printf("✅ Successfully retrieved site with ID: %d\n", siteID)
	return &site, nil
}
