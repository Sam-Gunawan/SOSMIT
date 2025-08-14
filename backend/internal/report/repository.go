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

// BAPRecapRow represents a single recap row (aggregated per category).
type BAPRecapRow struct {
	Category       string
	ProductVariety string
	AssetCount     int64
}

// BAPDetailRow represents a single asset detail row in the lampiran table.
type BAPDetailRow struct {
	Category            string
	Company             string
	AssetTag            string
	AssetName           string
	Equipments          sql.NullString
	UserNameAndPosition string
	AssetStatus         string
	ActionNotes         sql.NullString
	CostCenterID        sql.NullInt64
}

// SessionMeta holds minimal session metadata needed for BAP generation (avoid importing opname pkg to prevent cycles).
type SessionMeta struct {
	ID                int
	EndDate           sql.NullString
	StartDate         sql.NullString
	Status            string
	UserID            int
	ManagerReviewerID sql.NullInt64
	ManagerReviewedAt sql.NullString
	L1ReviewerID      sql.NullInt64
	L1ReviewedAt      sql.NullString
	SiteID            int
}

// GetBAPRecap retrieves recap rows (grouped by category & product variety) for a session.
func (repo *Repository) GetBAPRecap(sessionID int64) ([]BAPRecapRow, error) {
	query := `SELECT category, product_variety, asset_count FROM get_opname_bap_recap($1)`
	rows, err := repo.db.Query(query, sessionID)
	if err != nil {
		log.Printf("❌ Error querying BAP recap for session %d: %v", sessionID, err)
		return nil, err
	}
	defer rows.Close()

	var recap []BAPRecapRow
	for rows.Next() {
		var recapRow BAPRecapRow
		if err := rows.Scan(&recapRow.Category, &recapRow.ProductVariety, &recapRow.AssetCount); err != nil {
			log.Printf("❌ Error scanning BAP recap row: %v", err)
			return nil, err
		}
		recap = append(recap, recapRow)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return recap, nil
}

// GetBAPDetails retrieves detailed lampiran rows for a session.
func (repo *Repository) GetBAPDetails(sessionID int64) ([]BAPDetailRow, error) {
	query := `SELECT category, company, asset_tag, asset_name, equipments, user_name_and_position, asset_status, action_notes, cost_center_id FROM get_opname_bap_details($1)`
	rows, err := repo.db.Query(query, sessionID)
	if err != nil {
		log.Printf("❌ Error querying BAP details for session %d: %v", sessionID, err)
		return nil, err
	}
	defer rows.Close()

	var details []BAPDetailRow
	for rows.Next() {
		var detailRow BAPDetailRow
		if err := rows.Scan(&detailRow.Category, &detailRow.Company, &detailRow.AssetTag, &detailRow.AssetName, &detailRow.Equipments, &detailRow.UserNameAndPosition, &detailRow.AssetStatus, &detailRow.ActionNotes, &detailRow.CostCenterID); err != nil {
			log.Printf("❌ Error scanning BAP detail row: %v", err)
			return nil, err
		}
		details = append(details, detailRow)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return details, nil
}

// GetSessionMeta retrieves minimal opname session metadata (mirrors get_opname_session_by_id) without creating package cycles.
func (repo *Repository) GetSessionMeta(sessionID int64) (*SessionMeta, error) {
	var sessionMeta SessionMeta
	err := repo.db.QueryRow(`SELECT * FROM get_opname_session_by_id($1)`, sessionID).Scan(
		&sessionMeta.ID,
		&sessionMeta.StartDate,
		&sessionMeta.EndDate,
		&sessionMeta.Status,
		&sessionMeta.UserID,
		&sessionMeta.ManagerReviewerID,
		&sessionMeta.ManagerReviewedAt,
		&sessionMeta.L1ReviewerID,
		&sessionMeta.L1ReviewedAt,
		&sessionMeta.SiteID,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("⚠ No session meta found for ID %d", sessionID)
			return nil, nil
		}
		log.Printf("❌ Error retrieving session meta %d: %v", sessionID, err)
		return nil, err
	}
	return &sessionMeta, nil
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
