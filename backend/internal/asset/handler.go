// == Handles API requests related to Asset ==
package asset

import (
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

// NewHandler creates a new asset handler with the provided asset service.
func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

// GetAssetByTagHandler retrieves an asset by its tag.
func (handler *Handler) GetAssetByTagHandler(context *gin.Context) {
	assetTag := context.Param("asset_tag")
	if assetTag == "" {
		context.JSON(http.StatusBadRequest, gin.H{"error": "asset_tag is required"})
		log.Printf("⚠ asset_tag is required but not provided")
		return
	}

	// Call the service to get asset details
	asset, err := handler.service.GetAssetByTag(assetTag)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch asset details: " + err.Error()})
		log.Printf("❌ Error fetching asset by tag %s: %v", assetTag, err)
		return
	}

	// If asset is nil, it means no asset was found with that tag
	if asset == nil {
		context.JSON(http.StatusNotFound, gin.H{"error": "asset not found with tag: " + assetTag})
		log.Printf("⚠ No asset found with tag: %s", assetTag)
		return
	}

	// Return the asset details
	context.JSON(200, gin.H{
		"asset_tag":             asset.AssetTag,
		"serial_number":         asset.SerialNumber,
		"status":                asset.Status,
		"status_reason":         asset.StatusReason,
		"product_category":      asset.ProductCategory,
		"product_subcategory":   asset.ProductSubcategory,
		"product_variety":       asset.ProductVariety,
		"brand_name":            asset.BrandName,
		"product_name":          asset.ProductName,
		"condition":             asset.Condition,
		"condition_notes":       asset.ConditionNotes,
		"condition_photo_url":   asset.ConditionPhotoURL,
		"location":              asset.Location,
		"room":                  asset.Room,
		"equipments":            asset.Equipments,
		"owner_id":              asset.OwnerID,
		"owner_name":            asset.OwnerName,
		"owner_position":        asset.OwnerPosition,
		"owner_cost_center":     asset.OwnerCostCenter,
		"owner_site_id":         asset.OwnerSiteID,
		"owner_site_name":       asset.OwnerSiteName,
		"owner_site_group_name": asset.OwnerSiteGroupName,
		"owner_region_name":     asset.OwnerRegionName,
		"site_id":               asset.SiteID,
		"site_name":             asset.SiteName,
		"site_group_name":       asset.SiteGroupName,
		"region_name":           asset.RegionName,
	})
}

// GetAssetBySerialNumberHandler retrieves an asset by its serial number.
func (handler *Handler) GetAssetBySerialNumberHandler(context *gin.Context) {
	serialNumber := context.Param("serial_number")
	if serialNumber == "" {
		context.JSON(http.StatusBadRequest, gin.H{"error": "serial_number is required"})
		log.Printf("⚠ serial_number is required but not provided")
		return
	}

	// Call the service to get asset details
	asset, err := handler.service.GetAssetBySerialNumber(serialNumber)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch asset details: " + err.Error()})
		log.Printf("❌ Error fetching asset by serial number %s: %v", serialNumber, err)
		return
	}

	// If asset is nil, it means no asset was found with that serial number
	if asset == nil {
		context.JSON(http.StatusNotFound, gin.H{"error": "asset not found with serial number: " + serialNumber})
		log.Printf("⚠ No asset found with serial number: %s", serialNumber)
		return
	}

	// Return the asset details
	context.JSON(200, gin.H{
		"asset_tag":             asset.AssetTag,
		"serial_number":         asset.SerialNumber,
		"status":                asset.Status,
		"status_reason":         asset.StatusReason,
		"product_category":      asset.ProductCategory,
		"product_subcategory":   asset.ProductSubcategory,
		"product_variety":       asset.ProductVariety,
		"brand_name":            asset.BrandName,
		"product_name":          asset.ProductName,
		"condition":             asset.Condition,
		"condition_notes":       asset.ConditionNotes,
		"condition_photo_url":   asset.ConditionPhotoURL,
		"location":              asset.Location,
		"room":                  asset.Room,
		"equipments":            asset.Equipments,
		"owner_id":              asset.OwnerID,
		"owner_name":            asset.OwnerName,
		"owner_position":        asset.OwnerPosition,
		"owner_cost_center":     asset.OwnerCostCenter,
		"owner_site_id":         asset.OwnerSiteID,
		"owner_site_name":       asset.OwnerSiteName,
		"owner_site_group_name": asset.OwnerSiteGroupName,
		"owner_region_name":     asset.OwnerRegionName,
		"site_id":               asset.SiteID,
		"site_name":             asset.SiteName,
		"site_group_name":       asset.SiteGroupName,
		"region_name":           asset.RegionName,
	})
}

// GetAssetsBySiteHandler retrieves all assets for a given site.
func (handler *Handler) GetAssetsOnSiteHandler(context *gin.Context) {
	siteID := context.Param("site-id")
	if siteID == "" {
		context.JSON(http.StatusBadRequest, gin.H{"error": "site-id is required"})
		log.Printf("⚠ site-id is required but not provided")
		return
	}

	// Call the service to get assets for the site.
	siteIDInt, err := strconv.Atoi(siteID) // Convert site-id to integer
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": "invalid site-id, must be an integer"})
		log.Printf("⚠ invalid site-id: %s | can't convert to integer!", siteID)
		return
	}

	assetsOnSite, err := handler.service.GetAssetsOnSite(int64(siteIDInt))
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch assets for site: " + err.Error()})
		log.Printf("❌ Error fetching assets for site-id %s: %v", siteID, err)
		return
	}

	if assetsOnSite == nil {
		// If no assets are found, return an empty array
		assetsOnSite = make([]*Asset, 0)
		log.Printf("⚠ No assets found for site-id: %s", siteID)
	}

	// Return the list of assets
	context.JSON(http.StatusOK, gin.H{
		"assets_on_site": assetsOnSite,
	})
}

// GetAssetEquipmentsHandler retrieves all equipments for a given product variety.
func (handler *Handler) GetAssetEquipmentsHandler(context *gin.Context) {
	productVariety := context.Param("product-variety")
	if productVariety == "" {
		context.JSON(http.StatusBadRequest, gin.H{"error": "product-variety is required"})
		log.Printf("⚠ product-variety is required but not provided")
		return
	}

	// Call the service to get equipments for the product variety
	equipments, err := handler.service.GetAssetEquipments(productVariety)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch equipments: " + err.Error()})
		log.Printf("❌ Error fetching equipments for product variety %s: %v", productVariety, err)
		return
	}
	if equipments == "" {
		// If no equipments are found, return an empty string
		log.Printf("⚠ No equipments found for product variety: %s", productVariety)
		context.JSON(http.StatusOK, gin.H{"equipments": ""})
		return
	}

	// Return the equipments
	context.JSON(http.StatusOK, gin.H{
		"product_variety": productVariety,
		"equipments":      equipments,
	})
}
