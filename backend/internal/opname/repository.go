// == Handles database operations related to Opname ==
package opname

import (
	"database/sql"
	"log"

	"github.com/Sam-Gunawan/SOSMIT/backend/internal/user"
)

type OpnameSession struct {
	ID                int            `json:"id"`
	StartDate         string         `json:"start_date"`
	EndDate           sql.NullString `json:"end_date"` // Use sql.NullString to handle nullable end_date
	Status            string         `json:"status"`
	UserID            int            `json:"user_id"`
	ManagerReviewerID sql.NullInt64  `json:"manager_reviewer_id"`
	ManagerReviewedAt sql.NullString `json:"manager_reviewed_at"`
	L1ReviewerID      sql.NullInt64  `json:"l1_reviewer_id"`
	L1ReviewedAt      sql.NullString `json:"l1_reviewed_at"`
	SiteID            int            `json:"site_id"`
}

type AssetChange struct {
	SessionID            int     `json:"session_id"`
	AssetTag             string  `json:"asset_tag"`
	NewStatus            *string `json:"new_status"`
	NewStatusReason      *string `json:"new_status_reason"`
	NewSerialNumber      *string `json:"new_serial_number"`
	NewCondition         *bool   `json:"new_condition"`
	NewConditionNotes    *string `json:"new_condition_notes"`
	NewConditionPhotoURL *string `json:"new_condition_photo_url"`
	NewLocation          *string `json:"new_location"`
	NewRoom              *string `json:"new_room"`
	NewEquipments        *string `json:"new_equipments"`
	NewOwnerID           *int    `json:"new_owner_id"`
	NewOwnerPosition     *string `json:"new_owner_position"`
	NewOwnerCostCenter   *int    `json:"new_owner_cost_center"`
	NewOwnerSiteID       *int    `json:"new_owner_site_id"`
	NewSiteID            *int    `json:"new_site_id"`
	ChangeReason         string  `json:"change_reason"`
	ProcessingStatus     string  `json:"processing_status" binding:"required,oneof=pending edited all_good"`
}

type OpnameSessionProgress struct {
	ID               int    `json:"id"`
	Changes          []byte `json:"changes"`
	ChangeReason     string `json:"change_reason"`
	AssetTag         string `json:"asset_tag"`
	ProcessingStatus string `json:"processing_status"`
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
		&session.ManagerReviewerID,
		&session.ManagerReviewedAt,
		&session.L1ReviewerID,
		&session.L1ReviewedAt,
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

// RecordAssetChange records an asset change in the database.
func (repo *Repository) RecordAssetChange(changedAsset AssetChange) ([]byte, error) {
	var changesJSON []byte // Use []byte to receive raw JSON data.

	query := `SELECT record_asset_change($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`

	err := repo.db.QueryRow(query,
		changedAsset.SessionID,
		changedAsset.AssetTag,
		changedAsset.NewSerialNumber,
		changedAsset.NewStatus,
		changedAsset.NewStatusReason,
		changedAsset.NewCondition,
		changedAsset.NewConditionNotes,
		changedAsset.NewConditionPhotoURL,
		changedAsset.NewLocation,
		changedAsset.NewRoom,
		changedAsset.NewEquipments,
		changedAsset.NewOwnerID,
		changedAsset.NewOwnerPosition,
		changedAsset.NewOwnerCostCenter,
		changedAsset.NewSiteID,
		changedAsset.ChangeReason,
		changedAsset.NewOwnerSiteID,
		changedAsset.ProcessingStatus,
	).Scan(&changesJSON)
	if err != nil {
		log.Printf("❌ Error recording asset change for asset %s: %v", changedAsset.AssetTag, err)
		return nil, err
	}

	log.Printf("✅ Asset change for asset %s recorded successfully", changedAsset.AssetTag)
	return changesJSON, nil
}

// DeleteAssetChange deletes an asset change by its session ID and asset tag.
func (repo *Repository) DeleteAssetChange(sessionID int, assetTag string) error {
	query := `CALL delete_asset_change($1, $2)`

	_, err := repo.db.Exec(query, sessionID, assetTag)
	if err != nil {
		log.Printf("❌ Error deleting asset change for asset %s in session %d: %v", assetTag, sessionID, err)
		return err // Deletion failed for some error.
	}

	// If successful, log the deletion.
	log.Printf("✅ Asset change for asset %s in session %d deleted successfully", assetTag, sessionID)
	return nil
}

// GetAssetChangePhoto retrieves an asset change by its session ID and asset tag.
func (repo *Repository) GetAssetChangePhoto(sessionID int, assetTag string) (string, error) {
	query := `SELECT * FROM get_asset_change_photo($1, $2)`

	row := repo.db.QueryRow(query, sessionID, assetTag)

	var conditionPhotoURL sql.NullString // Use sql.NullString to handle NULL values
	err := row.Scan(&conditionPhotoURL)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("⚠ No asset change found for asset %s in session %d", assetTag, sessionID)
			return "", nil // No change found.
		}
		log.Printf("❌ Error retrieving asset change for asset %s in session %d: %v", assetTag, sessionID, err)
		return "", err // Other error.
	}

	// Return the string value, or empty string if NULL
	if conditionPhotoURL.Valid {
		return conditionPhotoURL.String, nil
	}
	return "", nil
}

// GetPhotosBySessionID retrieves all photos associated with an opname session.
func (repo *Repository) GetPhotosBySessionID(sessionID int) ([]string, error) {
	query := `SELECT * FROM get_all_photos_by_session_id($1)`

	rows, err := repo.db.Query(query, sessionID)
	if err != nil {
		log.Printf("❌ Error retrieving photos for session %d: %v", sessionID, err)
		return nil, err // Query failed for some error.
	}
	defer rows.Close()

	var conditionPhotos []string
	for rows.Next() {
		var conditionPhotoURL string
		if err := rows.Scan(&conditionPhotoURL); err != nil {
			log.Printf("❌ Error scanning photo URL for session %d: %v", sessionID, err)
			return nil, err // Row scan failed for some error.
		}
		conditionPhotos = append(conditionPhotos, conditionPhotoURL)
	}

	return conditionPhotos, nil
}

// LoadOpnameProgress retrieves the current progress of an opname session in terms of recorded asset changes tied to that session.
func (repo *Repository) LoadOpnameProgress(sessionID int) ([]OpnameSessionProgress, error) {
	var progressList []OpnameSessionProgress

	query := `SELECT * FROM load_opname_progress($1)`

	rows, err := repo.db.Query(query, sessionID)
	if err != nil {
		log.Printf("❌ Error loading opname progress for session %d: %v", sessionID, err)
		return nil, err // Query failed for some error.
	}

	defer rows.Close()

	for rows.Next() {
		var progress OpnameSessionProgress
		if err := rows.Scan(&progress.ID, &progress.Changes, &progress.ChangeReason, &progress.AssetTag, &progress.ProcessingStatus); err != nil {
			log.Printf("❌ Error scanning row for opname progress: %v", err)
			return nil, err // Row scan failed for some error.
		}
		progressList = append(progressList, progress)
	}

	return progressList, nil
}

// FinishOpnameSession marks an opname session as finished.
func (repo *Repository) FinishOpnameSession(sessionID int) error {
	query := `CALL finish_opname_session($1)`

	_, err := repo.db.Exec(query, sessionID)
	if err != nil {
		log.Printf("❌ Error finishing opname session with ID %d: %v", sessionID, err)
		return err // Finishing failed for some error.
	}

	// If successful, log the completion.
	log.Printf("✅ Opname session with ID %d finished successfully", sessionID)
	return nil
}

// ApproveOpnameSession sets the status of an opname session to "escalated" by an area manager or "verified" by an L1 support.
func (repo *Repository) ApproveOpnameSession(sessionID int, reviewerID int) error {
	query := `CALL approve_opname_session($1, $2)`
	_, err := repo.db.Exec(query, sessionID, reviewerID)
	if err != nil {
		log.Printf("❌ Error verifying opname session with ID %d by approver %d: %v", sessionID, reviewerID, err)
		return err // Verification failed for some error.
	}

	// If successful, log the verification.
	log.Printf("✅ Opname session with ID %d verified successfully by approver %d", sessionID, reviewerID)
	return nil
}

// RejectOpnameSession sets the status of an opname session to "rejected" by an approver.
func (repo *Repository) RejectOpnameSession(sessionID int, reviewerID int) error {
	query := `CALL reject_opname_session($1, $2)`
	_, err := repo.db.Exec(query, sessionID, reviewerID)
	if err != nil {
		log.Printf("❌ Error rejecting opname session with ID %d by approver %d: %v", sessionID, reviewerID, err)
		return err
	}

	// If successful, log the rejection.
	log.Printf("✅ Opname session with ID %d rejected successfully by approver %d", sessionID, reviewerID)
	return nil
}

type OpnameFilter struct {
	SessionID     int    `json:"session_id"`
	CompletedDate string `json:"completed_date"` // Format: YYYY-MM-DD
}

// GetOpnameOnSite retrieves all opname sessions for a specific site.
// Only non-active sessions are returned.
func (repo *Repository) GetOpnameOnSite(siteID int) ([]OpnameFilter, error) {
	query := `SELECT * FROM get_opname_by_site_id($1)`

	rows, err := repo.db.Query(query, siteID)
	if err != nil {
		log.Printf("❌ Error retrieving opname sessions for site %d: %v", siteID, err)
		return nil, err // Query failed for some error.
	}

	defer rows.Close()

	var sessions []OpnameFilter
	for rows.Next() {
		var session OpnameFilter
		if err := rows.Scan(&session.SessionID, &session.CompletedDate); err != nil {
			log.Printf("❌ Error scanning row for opname session: %v", err)
			return nil, err // Row scan failed for some error.
		}
		sessions = append(sessions, session)
	}

	if err := rows.Err(); err != nil {
		log.Printf("❌ Error iterating over rows for opname sessions: %v", err)
		return nil, err // Error occurred while iterating.
	}

	log.Printf("✅ Retrieved %d opname sessions for site %d", len(sessions), siteID)
	return sessions, nil
}

// GetUserFromOpnameSession retrieves the user associated with a specific opname session.
func (repo *Repository) GetUserFromOpnameSession(sessionID int) (*user.User, error) {
	user := &user.User{}

	query := `SELECT * FROM get_user_from_opname_session($1)`

	err := repo.db.QueryRow(query, sessionID).Scan(&user.UserID, &user.Username, &user.Email, &user.FirstName, &user.LastName, &user.Position)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("⚠ No user found for opname session ID: %d", sessionID)
			return nil, nil // No user found.
		}
		log.Printf("❌ Error retrieving user for opname session ID %d: %v", sessionID, err)
		return nil, err // Other error.
	}

	return user, nil
}
