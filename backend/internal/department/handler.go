// Handles API requests related to departments

package department

import (
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

// NewHandler creates a new department handler
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// GetDeptByIDHandler retrieves department details by its ID
func (handler *Handler) GetDeptByIDHandler(context *gin.Context) {
	deptIDstr := context.Param("id")
	deptID, err := strconv.ParseInt(deptIDstr, 10, 64)
	if err != nil {
		log.Printf("❌ Error parsing department ID %s: %v", deptIDstr, err)
		context.JSON(http.StatusBadRequest, gin.H{"error": "Invalid department ID"})
		return
	}

	department, err := handler.service.GetDeptByID(deptID)
	if err != nil {
		log.Printf("❌ Error retrieving department by ID %d: %v", deptID, err)
		context.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	log.Printf("✅ Successfully retrieved department by ID %d", deptID)
	context.JSON(http.StatusOK, department)
}
