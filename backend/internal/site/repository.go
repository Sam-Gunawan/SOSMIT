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

type SubSite struct {
	SubSiteID   int
	SubSiteName string
	SiteID      int
}

// NewRepository creates a new site repository for managing site-related operations.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// GetAllSites retrieves all sites from the database.
func (repo *Repository) GetAllSites() ([]*Site, error) {
	var allSites []*Site

	rows, err := repo.db.Query("SELECT site_id, site_name, site_group_name, region_name, site_ga_id, site_ga_name, site_ga_email FROM get_all_sites()")
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

	query := `SELECT * FROM get_site_by_id($1)`
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

// GetSubSiteByID retrieves a sub-site by its ID from the database.
func (repo *Repository) GetSubSiteByID(subSiteID int) (*SubSite, error) {
	var subSite SubSite

	query := `SELECT * FROM get_sub_site_by_id($1)`
	err := repo.db.QueryRow(query, subSiteID).Scan(&subSite.SubSiteID, &subSite.SubSiteName, &subSite.SiteID)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("⚠ No sub-site found with ID: %d\n", subSiteID)
			return nil, nil // No sub-site found
		}
		log.Printf("❌ Error retrieving sub-site with ID: %d, error: %v\n", subSiteID, err)
		return nil, err // Return the error for unexpected cases
	}

	log.Printf("✅ Successfully retrieved sub-site with ID: %d\n", subSiteID)
	return &subSite, nil
}

// GetAllSubSites retrieves all sub-sites from the database.
func (repo *Repository) GetAllSubSites() ([]*SubSite, error) {
	var allSubSites []*SubSite

	rows, err := repo.db.Query("SELECT sub_site_id, sub_site_name, site_id FROM get_all_sub_sites()")
	if err != nil {
		log.Printf("❌ Error retrieving all sub-sites, error: %v\n", err)
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var subSite SubSite
		if err := rows.Scan(&subSite.SubSiteID, &subSite.SubSiteName, &subSite.SiteID); err != nil {
			return nil, err
		}
		allSubSites = append(allSubSites, &subSite)
	}

	return allSubSites, nil
}

// GetSubSitesBySiteID retrieves all sub-sites for a given site ID.
func (repo *Repository) GetSubSitesBySiteID(siteID int) ([]*SubSite, error) {
	var subSites []*SubSite

	query := `SELECT sub_site_id, sub_site_name FROM get_sub_sites_by_site_id($1)`
	rows, err := repo.db.Query(query, siteID)
	if err != nil {
		log.Printf("❌ Error retrieving sub-sites for site ID %d: %v", siteID, err)
		return nil, err // Return the error if query fails
	}
	defer rows.Close()

	for rows.Next() {
		var subSite SubSite
		if err := rows.Scan(&subSite.SubSiteID, &subSite.SubSiteName); err != nil {
			log.Printf("❌ Error scanning sub-site row: %v", err)
			return nil, err // Return the error if scanning fails
		}
		subSite.SiteID = siteID               // Set the site ID for the sub-site
		subSites = append(subSites, &subSite) // Append the sub-site to the slice
	}

	if err := rows.Err(); err != nil {
		log.Printf("❌ Error iterating over sub-site rows: %v", err)
		return nil, err // Return any error encountered during iteration
	}

	return subSites, nil
}
