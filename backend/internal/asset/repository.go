// == Handles all database operation related to Asset ==
package asset

import (
	"database/sql"
	"log"
)

type Asset struct {
	AssetTag           string
	SerialNumber       string
	Status             string
	StatusReason       string
	ProductCategory    string
	ProductSubcategory string
	ProductVariety     string
	BrandName          string
	ProductName        string
	Condition          bool
	ConditionNotes     string
	ConditionPhotoURL  string
	Location           string
	Room               string
	Equipments         string
	OwnerID            int64
	OwnerName          string // Owner's full name, can be a combination of first and last name
	OwnerPosition      string
	OwnerCostCenter    int64
	SiteID             int64
	SiteName           string
	SiteGroupName      string
	RegionName         string
}

type Repository struct {
	db *sql.DB
}

// NewRepository creates a new instance of Repository with the provided database connection.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{
		db: db,
	}
}

func (repo *Repository) GetAssetByTag(assetTag string) (*Asset, error) {
	var asset Asset

	query := `SELECT * FROM get_asset_by_tag($1)`

	err := repo.db.QueryRow(query, assetTag).Scan(
		&asset.AssetTag,
		&asset.SerialNumber,
		&asset.Status,
		&asset.StatusReason,
		&asset.ProductCategory,
		&asset.ProductSubcategory,
		&asset.ProductVariety,
		&asset.BrandName,
		&asset.ProductName,
		&asset.Condition,
		&asset.ConditionNotes,
		&asset.ConditionPhotoURL,
		&asset.Location,
		&asset.Room,
		&asset.Equipments,
		&asset.OwnerID,
		&asset.OwnerName,
		&asset.OwnerPosition,
		&asset.OwnerCostCenter,
		&asset.SiteID,
		&asset.SiteName,
		&asset.SiteGroupName,
		&asset.RegionName,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("⚠ No asset found with tag: %s", assetTag)
			return nil, nil // No asset found with the given tag
		}

		log.Printf("❌ Error retrieving asset by tag: %s, error: %v", assetTag, err)
		return nil, err // Return any other error
	}

	log.Printf("✅ Successfully retrieved asset by tag: %s", assetTag)
	return &asset, nil // Return the found asset
}

// GetAssetBySerialNumber retrieves an asset by its serial number.
func (repo *Repository) GetAssetBySerialNumber(serialNumber string) (*Asset, error) {
	var asset Asset

	query := `SELECT * FROM get_asset_by_serial_number($1)`

	err := repo.db.QueryRow(query, serialNumber).Scan(
		&asset.AssetTag,
		&asset.SerialNumber,
		&asset.Status,
		&asset.StatusReason,
		&asset.ProductCategory,
		&asset.ProductSubcategory,
		&asset.ProductVariety,
		&asset.BrandName,
		&asset.ProductName,
		&asset.Condition,
		&asset.ConditionNotes,
		&asset.ConditionPhotoURL,
		&asset.Location,
		&asset.Room,
		&asset.Equipments,
		&asset.OwnerID,
		&asset.OwnerName,
		&asset.OwnerPosition,
		&asset.OwnerCostCenter,
		&asset.SiteID,
		&asset.SiteName,
		&asset.SiteGroupName,
		&asset.RegionName,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("⚠ No asset found with serial number: %s", serialNumber)
			return nil, nil // No asset found with the given serial number
		}

		log.Printf("❌ Error retrieving asset by serial number: %s, error: %v", serialNumber, err)
		return nil, err // Return any other error
	}

	log.Printf("✅ Successfully retrieved asset by serial number: %s", serialNumber)
	return &asset, nil // Return the found asset
}

// GetAssetsBySite retrieves all assets for a given site.
func (repo *Repository) GetAssetsOnSite(siteID int64) ([]*string, error) {
	var assets []*string

	query := `SELECT * FROM get_assets_by_site($1)`

	rows, err := repo.db.Query(query, siteID)
	if err != nil {
		log.Printf("❌ Error retrieving assets for site ID %d: %v", siteID, err)
		return nil, err // Return the error if query fails
	}

	defer rows.Close()

	for rows.Next() {
		var assetTag string
		if err := rows.Scan(&assetTag); err != nil {
			log.Printf("❌ Error scanning asset row: %v", err)
			return nil, err // Return the error if scanning fails
		}
		assets = append(assets, &assetTag) // Append the asset tag to the slice
	}

	if err := rows.Err(); err != nil {
		log.Printf("❌ Error iterating over asset rows: %v", err)
		return nil, err // Return any error encountered during iteration
	}

	log.Printf("✅ Successfully retrieved %d assets for site ID: %d", len(assets), siteID)
	return assets, nil // Return the slice of asset tags found
}
