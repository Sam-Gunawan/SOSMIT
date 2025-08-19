// == Handles all database operations related to Departments

package department

import (
	"database/sql"
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
	DepartmentID   int64
	DepartmentName string
}
