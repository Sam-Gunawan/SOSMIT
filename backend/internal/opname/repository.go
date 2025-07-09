// == Handles database operations related to Opname ==
package opname

import (
	"database/sql"
	"log"
)

type Repository struct {
	db *sql.DB
}

// NewRepository creates a new Opname repository with the provided database connection.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{
		db: db,
	}
}

// CreateNewSession creates a new opname session in the database.
func (repo *Repository) CreateNewSession(userID int, siteID int) (int, error) {
	var newSessionID int

	query := `SELECT create_new_opname_session($1, $2)`

	err := repo.db.QueryRow(query, userID, siteID).Scan(&newSessionID)
	if err != nil {
		log.Printf("❌ Error creating new opname session: %v", err)
		return 0, err
	}

	return newSessionID, nil
}
