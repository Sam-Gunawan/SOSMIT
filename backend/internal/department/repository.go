// == Handles all database operations related to Departments

package department

import (
	"database/sql"
	"log"
)

// Repository is the struct for the department repository
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new department repository
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

type Department struct {
	DepartmentID   int64  `json:"dept_id"`
	DepartmentName string `json:"dept_name"`
	SiteName       string `json:"site_name"`
	SiteGroupName  string `json:"site_group_name"`
	RegionName     string `json:"region_name"`
}

// GetDeptByID retrieves department details by its ID
func (repo *Repository) GetDeptByID(deptID int64) (*Department, error) {
	var dept Department
	query := `SELECT dept_id, dept_name, site_name, site_group_name, region_name FROM get_dept_by_id($1)`
	err := repo.db.QueryRow(query, deptID).Scan(
		&dept.DepartmentID,
		&dept.DepartmentName,
		&dept.SiteName,
		&dept.SiteGroupName,
		&dept.RegionName,
	)
	if err != nil {
		log.Printf("❌ Error retrieving department by ID %d: %v", deptID, err)
		return nil, err
	}

	return &dept, nil
}
