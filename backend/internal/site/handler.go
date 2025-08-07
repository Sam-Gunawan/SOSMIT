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

// GetAllSubSitesHandler handles the API request to retrieve all sub-sites.
func (handler *Handler) GetAllSubSitesHandler(context *gin.Context) {
	subSites, err := handler.service.GetAllSubSites()
	if err != nil {
		log.Printf("Error fetching all sub-sites: %v", err)
		context.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to fetch sub-sites: " + err.Error(),
		})
		return
	}

	if subSites == nil {
		log.Println("No sub-sites found in the system")
		context.JSON(http.StatusNotFound, gin.H{
			"message": "no sub-sites found",
		})
		return
	}

	log.Printf("Successfully retrieved %d sub-sites", len(subSites))
	context.JSON(http.StatusOK, gin.H{
		"sub_sites": subSites,
	})
}

// GetSubSiteByIDHandler handles the API request to retrieve a sub-site by its ID.
func (handler *Handler) GetSubSiteByIDHandler(context *gin.Context) {
	subSiteIDstr, exists := context.Params.Get("sub-site-id")
	if !exists {
		log.Printf("Error retrieving sub-site ID from request")
		context.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid API request, sub-site ID is required",
		})
		return
	}

	subSiteID, err := strconv.Atoi(subSiteIDstr)
	if err != nil {
		log.Printf("Error converting sub-site ID to integer: %v", err)
		context.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid sub-site ID format",
		})
		return
	}

	subSite, err := handler.service.GetSubSiteByID(subSiteID)
	if err != nil {
		log.Printf("Error fetching sub-site by ID %v: %v", subSiteID, err)
		context.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to fetch sub-site: " + err.Error(),
		})
		return
	}
	if subSite == nil {
		log.Printf("No sub-site found with ID: %v", subSiteID)
		context.JSON(http.StatusNotFound, gin.H{
			"message": "sub-site not found",
		})
		return
	}

	log.Printf("Successfully retrieved sub-site by ID: %v", subSiteID)
	context.JSON(http.StatusOK, gin.H{
		"sub_site_id":   subSite.SubSiteID,
		"sub_site_name": subSite.SubSiteName,
		"site_id":       subSite.SiteID,
	})
}

// GetSubSitesBySiteIDHandler handles the API request to retrieve all sub-sites for a given site ID.
func (handler *Handler) GetSubSitesBySiteIDHandler(context *gin.Context) {
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

	subSites, err := handler.service.GetSubSitesBySiteID(siteID)
	if err != nil {
		log.Printf("Error fetching sub-sites for site ID %v: %v", siteID, err)
		context.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to fetch sub-sites: " + err.Error(),
		})
		return
	}

	if subSites == nil {
		log.Printf("No sub-sites found for site ID: %d", siteID)
		context.JSON(http.StatusNotFound, gin.H{
			"message": "no sub-sites found",
		})
		return
	}

	log.Printf("Successfully retrieved %d sub-sites for site ID: %d", len(subSites), siteID)
	context.JSON(http.StatusOK, gin.H{
		"sub_sites": subSites,
	})
}
