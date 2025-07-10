// == Handles database operations related to Opname ==
package opname

import (
	"database/sql"
	"log"
)

type OpnameSession struct {
	ID        int            `json:"id"`
	StartDate string         `json:"start_date"`
	EndDate   sql.NullString `json:"end_date"` // Use sql.NullString to handle
	// nullable end_date
	Status     string        `json:"status"`
	UserID     int           `json:"user_id"`
	ApproverID sql.NullInt64 `json:"approver_id"` // Use sql.NullInt64 for nullable approver_id
	SiteID     int           `json:"site_id"`
}

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

// GetSessionByID retrieves an opname session by its ID.
func (repo *Repository) GetSessionByID(sessionID int) (*OpnameSession, error) {
	var session OpnameSession

	query := `SELECT * FROM get_opname_session_by_id($1)`

	err := repo.db.QueryRow(query, sessionID).Scan(
		&session.ID,
		&session.StartDate,
		&session.EndDate,
		&session.Status,
		&session.UserID,
		&session.ApproverID,
		&session.SiteID,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("⚠ No opname session found with ID: %d", sessionID)
			return nil, nil // No session found.
		}
		log.Printf("❌ Error retrieving opname session by ID %d: %v", sessionID, err)
		return nil, err // Other error.
	}

	return &session, nil
}

// DeleteSession deletes an opname session by its ID.
func (repo *Repository) DeleteSession(sessionID int) error {
	query := `CALL delete_opname_session($1)`

	_, err := repo.db.Exec(query, sessionID)
	if err != nil {
		log.Printf("❌ Error deleting opname session with ID %d: %v", sessionID, err)
		return err // Deletion failed for some error.
	}

	// If successful, log the deletion.
	log.Printf("✅ Opname session with ID %d deleted successfully", sessionID)
	return nil
}
