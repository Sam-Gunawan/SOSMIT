// == Handles API requests related to site management ==
package site

import (
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

// NewHandler creates a new instance of Handler with the provided service.
func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

// GetAllSitesHandler handles the API request to retrieve all sites.
func (handler *Handler) GetAllSitesHandler(context *gin.Context) {
	allSites, err := handler.service.GetAllSites()
	if err != nil {
		log.Printf("Error fetching all sites: %v", err)
		context.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to fetch sites: " + err.Error(),
		})
		return
	}

	if allSites == nil {
		log.Println("No sites found in the system")
		context.JSON(http.StatusNotFound, gin.H{
			"message": "no sites found",
		})
		allSites = make([]*Site, 0)
	}

	log.Printf("Successfully retrieved %d sites", len(allSites))
	context.JSON(http.StatusOK, gin.H{
		"sites": allSites,
	})
}

// GetSiteByIDHandler handles the API request to retrieve a site by its ID.
func (handler *Handler) GetSiteByIDHandler(context *gin.Context) {
	siteIDstr, exists := context.Params.Get("site-id")
	if !exists {
		log.Printf("Error retrieving site ID from request")
		context.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid API request, site ID is required",
		})
		return
	}

	siteID, err := strconv.Atoi(siteIDstr)
	if err != nil {
		log.Printf("Error converting site ID to integer: %v", err)
		context.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid site ID format",
		})
		return
	}

	site, err := handler.service.GetSiteByID(siteID)
	if err != nil {
		log.Printf("Error fetching site by ID %v: %v", siteID, err)
		context.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to fetch site: " + err.Error(),
		})
		return
	}

	if site == nil {
		log.Printf("No site found with ID: %v", siteID)
		context.JSON(http.StatusNotFound, gin.H{
			"message": "site not found",
		})
		return
	}

	log.Printf("Successfully retrieved site by ID: %v", siteID)
	context.JSON(http.StatusOK, gin.H{
		"site_id":         site.SiteID,
		"site_name":       site.SiteName,
		"site_group_name": site.SiteGroupName,
		"region_name":     site.RegionName,
		"site_ga_id":      site.SiteGaID,
		"site_ga_name":    site.SiteGaName,
		"site_ga_email":   site.SiteGaEmail,
	})
}
