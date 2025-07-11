// == Handles all logical operations related to Asset ==
package asset

import "log"

type Service struct {
	repo *Repository
}

// NewService creates a new instance of the asset service.
func NewService(repo *Repository) *Service {
	return &Service{
		repo: repo,
	}
}

// GetAssetByTag retrieves an asset by its tag.
func (service *Service) GetAssetByTag(assetTag string) (*Asset, error) {
	asset, err := service.repo.GetAssetByTag(assetTag)
	if err != nil {
		// Log the error and return it
		log.Printf("Error fetching asset by tag %s: %v", assetTag, err)
		return nil, err
	}
	if asset == nil {
		// If no asset is found, return nil
		log.Printf("No asset found with tag: %s", assetTag)
		return nil, nil // No asset found
	}

	log.Printf("Successfully retrieved asset by tag: %s", assetTag)
	return asset, nil
}

// GetAssetBySerialNumber retrieves an asset by its serial number.
func (service *Service) GetAssetBySerialNumber(serialNumber string) (*Asset, error) {
	asset, err := service.repo.GetAssetBySerialNumber(serialNumber)
	if err != nil {
		// Log the error and return it
		log.Printf("Error fetching asset by serial number %s: %v", serialNumber, err)
		return nil, err
	}
	if asset == nil {
		// If no asset is found, return nil
		log.Printf("No asset found with serial number: %s", serialNumber)
		return nil, nil // No asset found
	}

	log.Printf("Successfully retrieved asset by serial number: %s", serialNumber)
	return asset, nil
}

// GetAssetBySite retrieves all assets for a given site.
func (service *Service) GetAssetsOnSite(siteID int64) ([]*Asset, error) {
	var assetsOnSite []*Asset
	assetTags, err := service.repo.GetAssetsOnSite(siteID)
	if err != nil {
		// Log the error and return it
		log.Printf("Error fetching assets for site_id %d: %v", siteID, err)
		return nil, err
	}

	if assetTags == nil {
		// If no assets are found, return an empty slice
		log.Printf("No assets found for site_id: %d", siteID)
		return nil, nil // No assets found
	}

	for _, assetTag := range assetTags {
		// TODO: get asset object info for each tag
		var asset *Asset
		asset, err = service.repo.GetAssetByTag(*assetTag)
		if err != nil {
			// Log the error and continue to the next asset
			log.Printf("Error retrieving asset by tag %s for site_id %d: %v", *assetTag, siteID, err)
			continue // Skip this asset and continue with the next
		}
		if asset == nil {
			// If no asset is found for this tag, log it and continue
			log.Printf("No asset found with tag: %s for site_id: %d", *assetTag, siteID)
			continue // Skip this asset and continue with the next
		}

		// Append the found asset to the list
		assetsOnSite = append(assetsOnSite, asset)
	}

	log.Printf("Successfully retrieved %d assets for site_id: %d", len(assetsOnSite), siteID)
	return assetsOnSite, nil
}
