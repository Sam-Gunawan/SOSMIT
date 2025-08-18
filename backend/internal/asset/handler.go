// == Handles API requests related to Asset ==
package asset

import (
	"log"
	"net/http"
	"strconv"

	"github.com/Sam-Gunawan/SOSMIT/backend/internal/utils"
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

// serializeAsset converts an Asset domain object into a JSON-friendly gin.H with proper null flattening.
func serializeAsset(a *Asset) gin.H {
	if a == nil {
		return gin.H{}
	}
	return gin.H{
		"asset_tag":           a.AssetTag,
		"serial_number":       a.SerialNumber,
		"status":              a.Status,
		"status_reason":       utils.SerializeNS(a.StatusReason),
		"product_category":    a.ProductCategory,
		"product_subcategory": a.ProductSubcategory,
		"product_variety":     a.ProductVariety,
		"brand_name":          a.BrandName,
		"product_name":        a.ProductName,
		"condition":           a.Condition,
		"condition_notes":     utils.SerializeNS(a.ConditionNotes),
		"condition_photo_url": utils.SerializeNS(a.ConditionPhotoURL),
		"location":            utils.SerializeNS(a.Location),
		"room":                utils.SerializeNS(a.Room),
		"equipments":          utils.SerializeNS(a.Equipments),
		"total_cost":          a.TotalCost,
		"owner_id":            a.OwnerID,
		"owner_name":          a.OwnerName,
		"owner_position":      utils.SerializeNS(a.OwnerPosition),
		"owner_department":    utils.SerializeNS(a.OwnerDepartment),
		"owner_division":      utils.SerializeNS(a.OwnerDivision),
		"owner_cost_center":   utils.SerializeNI(a.OwnerCostCenter),
		"sub_site_id":         utils.SerializeNI(a.SubSiteID),
		"sub_site_name":       utils.SerializeNS(a.SubSiteName),
		"site_id":             utils.SerializeNI(a.SiteID),
		"site_name":           utils.SerializeNS(a.SiteName),
		"site_group_name":     utils.SerializeNS(a.SiteGroupName),
		"region_name":         utils.SerializeNS(a.RegionName),
	}
}

// serializeAssets maps a slice of Asset pointers to a slice of gin.H with flattened nullable values.
func serializeAssets(list []*Asset) []gin.H {
	if len(list) == 0 {
		return []gin.H{}
	}
	out := make([]gin.H, 0, len(list))
	for _, a := range list {
		out = append(out, serializeAsset(a))
	}
	return out
}

// GetAssetByTagHandler retrieves an asset by its tag.
func (handler *Handler) GetAssetByTagHandler(context *gin.Context) {
	assetTag := context.Param("asset_tag")
	if assetTag == "" {
		context.JSON(http.StatusBadRequest, gin.H{"error": "asset_tag is required"})
		log.Printf("⚠ asset_tag is required but not provided")
		return
	}

	asset, err := handler.service.GetAssetByTag(assetTag)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch asset details: " + err.Error()})
		log.Printf("❌ Error fetching asset by tag %s: %v", assetTag, err)
		return
	}
	if asset == nil {
		context.JSON(http.StatusNotFound, gin.H{"error": "asset not found with tag: " + assetTag})
		log.Printf("⚠ No asset found with tag: %s", assetTag)
		return
	}

	context.JSON(http.StatusOK, serializeAsset(asset))
}

// GetAssetBySerialNumberHandler retrieves an asset by its serial number.
func (handler *Handler) GetAssetBySerialNumberHandler(context *gin.Context) {
	serialNumber := context.Param("serial_number")
	if serialNumber == "" {
		context.JSON(http.StatusBadRequest, gin.H{"error": "serial_number is required"})
		log.Printf("⚠ serial_number is required but not provided")
		return
	}

	asset, err := handler.service.GetAssetBySerialNumber(serialNumber)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch asset details: " + err.Error()})
		log.Printf("❌ Error fetching asset by serial number %s: %v", serialNumber, err)
		return
	}
	if asset == nil {
		context.JSON(http.StatusNotFound, gin.H{"error": "asset not found with serial number: " + serialNumber})
		log.Printf("⚠ No asset found with serial number: %s", serialNumber)
		return
	}

	context.JSON(http.StatusOK, serializeAsset(asset))
}

// GetAssetsBySiteHandler retrieves all assets for a given site.
func (handler *Handler) GetAssetsOnSiteHandler(context *gin.Context) {
	siteID := context.Param("site-id")
	if siteID == "" {
		context.JSON(http.StatusBadRequest, gin.H{"error": "site-id is required"})
		log.Printf("⚠ site-id is required but not provided")
		return
	}

	siteIDInt, err := strconv.Atoi(siteID)
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
		assetsOnSite = make([]*Asset, 0)
		log.Printf("⚠ No assets found for site-id: %s", siteID)
	}

	context.JSON(http.StatusOK, gin.H{"assets_on_site": serializeAssets(assetsOnSite)})
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
