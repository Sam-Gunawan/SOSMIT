// == Handles all database operation related to Asset ==
package asset

import (
	"database/sql"
	"log"

	"github.com/Sam-Gunawan/SOSMIT/backend/internal/utils"
)

type Asset struct {
	AssetTag           string
	SerialNumber       string
	Status             string
	StatusReason       sql.NullString
	ProductCategory    string
	ProductSubcategory string
	ProductVariety     string
	BrandName          string
	ProductName        string
	Condition          bool
	ConditionNotes     sql.NullString
	ConditionPhotoURL  sql.NullString
	Location           sql.NullString
	Room               sql.NullString
	Equipments         sql.NullString
	TotalCost          float64
	OwnerID            int64  // assuming always set; adjust to NullInt64 if schema allows NULL
	OwnerName          string // Owner's full name, can be a combination of first and last name
	OwnerPosition      sql.NullString
	OwnerDepartment    sql.NullString
	OwnerDivision      sql.NullString
	OwnerCostCenter    sql.NullInt64 // Nullable: VACANT or user without cost center
	SubSiteID          sql.NullInt64
	SubSiteName        sql.NullString
	SiteID             sql.NullInt64
	SiteName           sql.NullString
	SiteGroupName      sql.NullString
	RegionName         sql.NullString
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
		&asset.TotalCost,
		&asset.OwnerID,
		&asset.OwnerName,
		&asset.OwnerPosition,
		&asset.OwnerDepartment,
		&asset.OwnerDivision,
		&asset.OwnerCostCenter,
		&asset.SubSiteID,
		&asset.SubSiteName,
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
		&asset.TotalCost,
		&asset.OwnerID,
		&asset.OwnerName,
		&asset.OwnerPosition,
		&asset.OwnerDepartment,
		&asset.OwnerDivision,
		&asset.OwnerCostCenter,
		&asset.SubSiteID,
		&asset.SubSiteName,
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

// GetAssetsOnLocation retrieves all assets for a given location.
func (repo *Repository) GetAssetsOnLocation(siteID *int, deptID *int) ([]*string, error) {
	var assets []*string

	query := `SELECT * FROM get_assets_by_location($1, $2)`

	siteIDParam := utils.ParseNullableInt(siteID)
	deptIDParam := utils.ParseNullableInt(deptID)

	rows, err := repo.db.Query(query, siteIDParam, deptIDParam)
	if err != nil {
		log.Printf("❌ Error retrieving assets for site ID %v or department ID %v: %v", siteIDParam, deptIDParam, err)
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

// GetAssetEquipments retrieves all equipments for a given product variety.
func (repo *Repository) GetAssetEquipments(productVariety string) (string, error) {
	var equipments string

	query := `SELECT equipments FROM get_asset_equipments($1)`

	if err := repo.db.QueryRow(query, productVariety).Scan(&equipments); err != nil {
		if err == sql.ErrNoRows {
			log.Printf("⚠ No equipments found for product variety: %s", productVariety)
			return "", nil // No equipments found for the given product variety
		}
	}

	log.Printf("✅ Successfully retrieved equipments for product variety: %s", productVariety)
	return equipments, nil // Return the string of equipments found
}
