// == Handles all database operations related to Report ==
package report

import (
	"database/sql"
	"log"
)

type Repository struct {
	db *sql.DB
}

// NewRepository creates a new report repository with the provided database connection.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{
		db: db,
	}
}

type OpnameStats struct {
	WorkingAssets   int64
	BrokenAssets    int64
	MisplacedAssets int64
	MissingAssets   int64
}

// TODO: !!!
type ReportSummary struct {
}

// GetOpnameStats retrieves the opname statistics for a given opname session ID.
func (repo *Repository) GetOpnameStats(sessionID int64) (*OpnameStats, error) {
	var stats OpnameStats

	query := `SELECT * FROM get_opname_stats($1)`

	err := repo.db.QueryRow(query, sessionID).Scan(
		&stats.WorkingAssets,
		&stats.BrokenAssets,
		&stats.MisplacedAssets,
		&stats.MissingAssets,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("⚠ No stats found for session ID: %d", sessionID)
			return nil, nil // No stats found for the given session ID
		}
		log.Printf("❌ Error retrieving opname stats for session ID %d: %v", sessionID, err)
		return nil, err
	}

	log.Printf("✅ Successfully retrieved opname stats for session ID %d", sessionID)
	return &stats, nil
}
