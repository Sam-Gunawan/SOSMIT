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
}

// User struct represents a user in the system.
type User struct {
	UserID        int64
	Username      string
	Email         string
	FirstName     string
	LastName      string
	Position      string
	SiteID        int64
	SiteName      string
	SiteGroupName string
	RegionName    string
	CostCenterID  int64
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
// It returns a User struct containing the username, password, and position.
func (repo *Repository) GetUserCredentials(username string) (*Credentials, error) {
	var credentials Credentials

	// get_credentials returns username, password, position
	// It takes in a username with VARCHAR(255) type
	query := `SELECT * FROM get_credentials($1)`

	err := repo.db.QueryRow(query, username).Scan(&credentials.UserID, &credentials.Username, &credentials.Password, &credentials.Position)
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

	err := repo.db.QueryRow(query, userID).Scan(&user.UserID, &user.Username, &user.Email, &user.FirstName, &user.LastName, &user.Position, &user.SiteID, &user.SiteName, &user.SiteGroupName, &user.RegionName, &user.CostCenterID)
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

	err := repo.db.QueryRow(query, username).Scan(&user.UserID, &user.Username, &user.Email, &user.FirstName, &user.LastName, &user.Position, &user.SiteID, &user.SiteName, &user.SiteGroupName, &user.RegionName, &user.CostCenterID)
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

// GetUserSiteCards retrieves all the sites a user has access to using their user_id.
func (repo *Repository) GetUserSiteCards(userID int64) ([]*UserSiteCard, error) {
	var userSiteCards []*UserSiteCard

	query := `SELECT * FROM get_user_site_cards($1)`

	rows, err := repo.db.Query(query, userID)
	if err != nil {
		log.Printf("❌ Error retrieving user site cards for user_id: %d, error: %v\n", userID, err)
		return nil, err // Return the error for unexpected cases
	}

	// Ensure rows are closed after processing
	defer rows.Close()

	// Iterate through the result set and populate userSiteCards
	for rows.Next() {
		var card UserSiteCard
		err := rows.Scan(
			&card.SiteID,
			&card.SiteName,
			&card.SiteGroupName,
			&card.RegionName,
			&card.SiteGaID,
			&card.OpnameSessionID,
			&card.OpnameStatus,
			&card.OpnameDate,
		)
		if err != nil {
			log.Printf("❌ Error scanning user site card for user_id: %d, error: %v\n", userID, err)
			return nil, err // Return the error for unexpected cases
		}

		userSiteCards = append(userSiteCards, &card)
	}

	// Check for any error encountered during iteration
	if err = rows.Err(); err != nil {
		log.Printf("❌ Error encountered while iterating user site cards for user_id: %d, error: %v\n", userID, err)
		return nil, err
	}

	return userSiteCards, nil
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
