// == Handles all database operations related to User ==
package user

import (
	"database/sql"
	"log"
)

// Credentials struct represents a user's login credentials.
type Credentials struct {
	UserID   int64
	Username string
	Password string
	Position string
	OuCode   string
}

// User struct represents a user in the system.
type User struct {
	UserID        int64
	Username      string
	Email         string
	FirstName     string
	LastName      string
	Position      string
	Department    string
	Division      string
	SiteID        sql.NullInt64
	SiteName      sql.NullString
	SiteGroupName sql.NullString
	RegionName    sql.NullString
	CostCenterID  sql.NullInt64
}

type UserSiteCard struct {
	SiteID          int64
	SiteName        string
	SiteGroupName   string
	RegionName      string
	SiteGaID        int64
	OpnameSessionID int64
	OpnameStatus    string
	OpnameDate      string
}

type OpnameLocations struct {
	SiteID         sql.NullInt64  `json:"site_id"`
	DeptID         sql.NullInt64  `json:"dept_id"`
	DeptName       sql.NullString `json:"dept_name"`
	SiteName       sql.NullString `json:"site_name"`
	SiteGroupName  sql.NullString `json:"site_group_name"`
	RegionName     sql.NullString `json:"region_name"`
	OpnameStatus   string         `json:"opname_status"`
	LastOpnameDate sql.NullString `json:"last_opname_date"`
	LastOpnameBy   sql.NullString `json:"last_opname_by"`
	TotalCount     int64          `json:"total_count"`
}

type OpnameLocationFilter struct {
	SiteGroupName *string `json:"site_group_name" form:"site_group_name"`
	SiteName      *string `json:"site_name" form:"site_name"`
	SubSiteName   *string `json:"sub_site_name" form:"sub_site_name"`
	DeptName      *string `json:"dept_name" form:"dept_name"`
	CreatedBy     *string `json:"created_by" form:"created_by"`
	OpnameStatus  *string `json:"opname_status" form:"opname_status"`
	FromDate      *string `json:"from_date" form:"from_date"`
	EndDate       *string `json:"end_date" form:"end_date"`
	SearchIn      *string `json:"search_in" form:"search_in"`
	Limit         *int    `json:"limit" form:"limit"`
	PageNum       *int    `json:"page_num" form:"page_num"`
}

// Repository struct holds the database connection
// NOTE: We create a Repository struct to encapsulate database operations related to User.
// This allows us to easily manage database interactions and makes it easier to mock for testing.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new instance of Repository with the provided database connection.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{
		db: db,
	}
}

// GetUserCredentials retrieves a user's credentials by their username from the database.
// It is a method of the Repository struct, which holds the database connection.
// It returns a User struct containing the username, password, position, and ou code.
func (repo *Repository) GetUserCredentials(username string) (*Credentials, error) {
	var credentials Credentials

	// get_credentials returns username, password, position, ou_code
	// It takes in a username with VARCHAR(255) type
	query := `SELECT * FROM get_credentials($1)`

	err := repo.db.QueryRow(query, username).Scan(&credentials.UserID, &credentials.Username, &credentials.Password, &credentials.Position, &credentials.OuCode)
	if err != nil {
		if err == sql.ErrNoRows {
			// If no user is found, return nil
			// It is a valid case where the user does not exist
			log.Printf("⚠ No credentials found with username: %s\n", username)
			return nil, nil // No user found
		}

		// Any other error is unexpected
		log.Printf("❌ Error retrieving credentials for username: %s, error: %v\n", username, err)
		return nil, err // Return the error for unexpected cases
	}

	// Return the user credentials
	log.Printf("✅ Successfully retrieved credentials for username: %s\n", username)
	return &credentials, nil
}

// GetAllUsers retrieves all users from the database.
func (repo *Repository) GetAllUsers() ([]*User, error) {
	var allUsers []*User

	query := `SELECT * FROM get_all_users()`
	rows, err := repo.db.Query(query)
	if err != nil {
		log.Printf("❌ Error retrieving all users, error: %v\n", err)
		return nil, err // Return the error for unexpected cases
	}
	// Ensure rows are closed after processing
	defer rows.Close()

	// Iterate through the result set and populate allUsers
	for rows.Next() {
		var user User
		err := rows.Scan(
			&user.UserID,
			&user.Username,
			&user.Email,
			&user.FirstName,
			&user.LastName,
			&user.Position,
			&user.Department,
			&user.Division,
			&user.SiteID,
			&user.SiteName,
			&user.SiteGroupName,
			&user.RegionName,
			&user.CostCenterID,
		)
		if err != nil {
			log.Printf("❌ Error scanning user, error: %v\n", err)
			return nil, err // Return the error for unexpected cases
		}

		allUsers = append(allUsers, &user)
	}

	// Check for any error encountered during iteration
	if err = rows.Err(); err != nil {
		log.Printf("❌ Error encountered while iterating users, error: %v\n", err)
		return nil, err // Return the error for unexpected cases
	}

	log.Printf("✅ Successfully retrieved %d users from the database\n", len(allUsers))
	return allUsers, nil // Return the slice of users found
}

// GetUserByID retrieves a user's details by their user ID from the database.
func (repo *Repository) GetUserByID(userID int64) (*User, error) {
	var user User

	query := `SELECT * FROM get_user_by_id($1)`

	err := repo.db.QueryRow(query, userID).Scan(&user.UserID, &user.Username, &user.Email, &user.FirstName, &user.LastName, &user.Position, &user.Department, &user.Division, &user.SiteID, &user.SiteName, &user.SiteGroupName, &user.RegionName, &user.CostCenterID)
	if err != nil {
		if err == sql.ErrNoRows {
			// If no user is found, return nil
			log.Printf("⚠ No user found with ID: %d\n", userID)
			return nil, nil // No user found
		}

		// Any other error is unexpected
		log.Printf("❌ Error retrieving user by ID: %d, error: %v\n", userID, err)
		return nil, err // Return the error for unexpected cases
	}

	log.Printf("✅ Successfully retrieved user by ID: %d\n", userID)
	return &user, nil
}

// GetUserByUsername retrieves a user's details by their username from the database.
func (repo *Repository) GetUserByUsername(username string) (*User, error) {
	var user User

	query := `SELECT * FROM get_user_by_username($1)`

	err := repo.db.QueryRow(query, username).Scan(&user.UserID, &user.Username, &user.Email, &user.FirstName, &user.LastName, &user.Position, &user.Department, &user.Division, &user.SiteID, &user.SiteName, &user.SiteGroupName, &user.RegionName, &user.CostCenterID)
	if err != nil {
		if err == sql.ErrNoRows {
			// If no user is found, return nil
			log.Printf("⚠ No user found with username: %s\n", username)
			return nil, nil // No user found
		}

		// Any other error is unexpected
		log.Printf("❌ Error retrieving user by username: %s, error: %v\n", username, err)
		return nil, err // Return the error for unexpected cases
	}

	log.Printf("✅ Successfully retrieved user by username: %s\n", username)
	return &user, nil
}

// GetUserOpnameLocations retrieves all the opname locations (with filter and paging) tied to the logged-in user.
func (repo *Repository) GetUserOpnameLocations(userID int, position string, filter OpnameLocationFilter) ([]OpnameLocations, error) {
	var locations []OpnameLocations

	query := `SELECT * FROM get_user_opname_locations($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`

	rows, err := repo.db.Query(
		query,
		userID,
		position,
		filter.SiteGroupName,
		filter.SiteName,
		filter.SubSiteName,
		filter.DeptName,
		filter.CreatedBy,
		filter.OpnameStatus,
		filter.FromDate,
		filter.EndDate,
		filter.SearchIn,
		filter.Limit,
		filter.PageNum,
	)

	if err != nil {
		log.Printf("❌ Error retrieving opname locations: %v", err)
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var location OpnameLocations
		if err := rows.Scan(
			&location.SiteID,
			&location.DeptID,
			&location.DeptName,
			&location.SiteName,
			&location.SiteGroupName,
			&location.RegionName,
			&location.OpnameStatus,
			&location.LastOpnameDate,
			&location.LastOpnameBy,
			&location.TotalCount,
		); err != nil {
			log.Printf("❌ Error scanning opname location: %v", err)
			return nil, err
		}
		locations = append(locations, location)
	}

	return locations, nil
}

// GetL1SupportEmails retrieves all L1 support emails from the database.
func (repo *Repository) GetL1SupportEmails() ([]string, error) {
	query := `SELECT * FROM get_l1_support_emails()`
	rows, err := repo.db.Query(query)
	if err != nil {
		log.Printf("❌ Error retrieving L1 support emails, error: %v\n", err)
		return nil, err // Return the error for unexpected cases
	}
	defer rows.Close()

	var emails []string
	for rows.Next() {
		var email string
		if err := rows.Scan(&email); err != nil {
			log.Printf("❌ Error scanning L1 support email, error: %v\n", err)
			return nil, err // Return the error for unexpected cases
		}
		emails = append(emails, email)
	}

	if err = rows.Err(); err != nil {
		log.Printf("❌ Error encountered while iterating L1 support emails, error: %v\n", err)
		return nil, err // Return the error for unexpected cases
	}

	log.Printf("✅ Successfully retrieved %d L1 support emails from the database\n", len(emails))
	return emails, nil // Return the slice of emails found
}

// GetAreaManagerInfo retrieves the area manager's email and user ID for a given site.
func (repo *Repository) GetAreaManagerInfo(siteID int64) (int64, string, error) {
	var userID int64
	var email string

	query := `SELECT * FROM get_area_manager_info($1)`

	err := repo.db.QueryRow(query, siteID).Scan(&userID, &email)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("⚠ No area manager found for site ID: %d\n", siteID)
			return 0, "", nil // No area manager found
		}

		log.Printf("❌ Error retrieving area manager info for site ID: %d, error: %v\n", siteID, err)
		return 0, "", err // Return the error for unexpected cases
	}

	log.Printf("✅ Successfully retrieved area manager info for site ID: %d\n", siteID)
	return userID, email, nil
}
