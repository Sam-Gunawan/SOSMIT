// A standalone program to populate the database with initial dummy data.
// IMPORTANT: Make sure to run this everytime the database schema changes.

package main

import (
	"database/sql"
	"encoding/csv"
	"fmt"
	"log"
	"os"
	"strconv"

	_ "github.com/lib/pq" // PostgreSQL driver
)

// Database connection details
const (
	host     = "localhost"
	port     = 5433
	username = "sosmit_admin"
	password = "admin123"
	db_name  = "sosmit_db"
)

func main() {
	// Connect to the PostgreSQL database
	db, err := sql.Open("postgres", fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable", host, port, username, password, db_name))
	if err != nil {
		log.Fatalln("Error connecting to the database:", err)
	}

	// Make sure the database is closed when the function returns
	defer db.Close()

	// Test the connection to the database with ping
	if err := db.Ping(); err != nil {
		log.Fatalln("Error pinging the database:", err)
	} else {
		log.Println("✅ Successfully connected to the database!")
	}

	// Seeding the database with initial data
	log.Println("Seeding the database with initial data...")
	seedTable(db, "Region", "internal/seed/seed_data/region.csv", seedRegion)
	seedTable(db, "SiteGroup", "internal/seed/seed_data/site_group.csv", seedSiteGroup)
	seedTable(db, "Site", "internal/seed/seed_data/site.csv", seedSite)
	seedTable(db, "CostCenter", "internal/seed/seed_data/cost_center.csv", seedCostCenter)
	seedTable(db, "User", "internal/seed/seed_data/user.csv", seedUser)
	seedTable(db, "Asset", "internal/seed/seed_data/asset.csv", seedAsset)
}

// -- SEEDING DATA FUNCTIONS --

// seedTable is a generic function to seed a table with initial data and calls a specific seeding function for each row.
func seedTable(db *sql.DB, tableName string, filePath string, seedFunc func(*sql.DB, []string) error) error {
	file, err := os.Open(filePath)
	if err != nil {
		log.Fatalf("Error opening file %s: %v\n", filePath, err)
		return err
	}

	// Ensure the file is closed after reading
	defer file.Close()

	// Read the CSV file
	reader := csv.NewReader(file)

	// Set the delimiter to semicolon
	reader.Comma = ';'

	// Read all records from the CSV file. Records are returned as a slice of string slices, i.e. [][]string.
	records, err := reader.ReadAll()
	if err != nil {
		log.Fatalf("Error reading CSV file %s: %v\n", filePath, err)
		return err
	}

	// Loop through each record and call the specific seeding function, skipping the header row.
	for i, record := range records {
		if i == 0 {
			continue // Skip the header row
		}
		seedFunc(db, record)
	}

	log.Printf("✅ Successfully seeded table %s with data from %s\n", tableName, filePath)
	return nil
}

// Expected CSV format for region.csv:
// id [PK], region_name
func seedRegion(db *sql.DB, record []string) error {
	region_name := record[1]
	query := `INSERT INTO "Region" (region_name) VALUES ($1) ON CONFLICT (region_name) DO NOTHING`

	_, err := db.Exec(query, region_name)
	if err != nil {
		log.Fatalf("Error inserting record into Region table: %v\n", err)
		return err
	}

	return nil
}

// Expected CSV format for site_group.csv:
// id [PK], site_group_name, region_id [FK]
func seedSiteGroup(db *sql.DB, record []string) error {
	site_group_name := record[1]
	region_id, err := strconv.Atoi(record[2])
	if err != nil {
		log.Fatalf("Error converting region_id '%s' to int: %v\n", record[2], err)
		return err
	}

	// Check if the referenced region_id exists
	// var exists bool
	// checkQuery := `SELECT EXISTS(SELECT 1 FROM "Region" WHERE id = $1)`
	// err = db.QueryRow(checkQuery, region_id).Scan(&exists)
	// if err != nil {
	// 	log.Fatalf("Error checking existence of region_id %d: %v\n", region_id, err)
	// 	return err
	// }
	// if !exists {
	// 	log.Fatalf("Region with id %d does not exist. Cannot insert SiteGroup '%s'.\n", region_id, site_group_name)
	// 	return log.Errorf("region_id %d does not exist", region_id)
	// }

	query := `INSERT INTO "SiteGroup" (site_group_name, region_id) VALUES ($1, $2) ON CONFLICT (site_group_name) DO NOTHING`

	_, err = db.Exec(query, site_group_name, region_id)
	if err != nil {
		log.Fatalf("Error inserting record into SiteGroup table: %v\n", err)
		return err
	}

	return nil
}

// Expected CSV format for site.csv:
// id [PK], site_name, site_group_id [FK]
func seedSite(db *sql.DB, record []string) error {
	site_name := record[1]
	site_group_id := record[2]
	site_ga_id := record[3]
	query := `INSERT INTO "Site" (site_name, site_group_id, site_ga_id) VALUES ($1, $2, $3)`

	// Check if the referenced site_group_id exists
	var exists bool
	checkQuery := `SELECT EXISTS(SELECT 1 FROM "SiteGroup" WHERE id = $1)`
	err := db.QueryRow(checkQuery, site_group_id).Scan(&exists)
	if err != nil {
		log.Fatalf("Error checking existence of site_group_id %v: %v\n", site_group_id, err)
		return err
	}
	if !exists {
		log.Fatalf("SiteGroup with id %v does not exist. Cannot insert Site '%s'.\n", site_group_id, site_name)
		return fmt.Errorf("site_group_id %v does not exist", site_group_id)
	}

	_, err = db.Exec(query, site_name, site_group_id, site_ga_id)
	if err != nil {
		log.Fatalf("Error inserting record into Site table: %v\n", err)
		return err
	}

	return nil
}

// Expected CSV format for cost_center.csv:
// cost_center_id [PK], cost_center_name
func seedCostCenter(db *sql.DB, record []string) error {
	cost_center_id := record[0]
	cost_center_name := record[1]
	query := `INSERT INTO "CostCenter" (cost_center_id, cost_center_name) VALUES ($1, $2) ON CONFLICT (cost_center_id) DO NOTHING`

	_, err := db.Exec(query, cost_center_id, cost_center_name)
	if err != nil {
		log.Fatalf("Error inserting record into CostCenter table: %v\n", err)
		return err
	}

	return nil
}

// Expected CSV format for user.csv:
// user_id [PK], username, first_name, last_name, position, site_id [FK], cost_center_id [FK]
// Table format for User:
// user_id [PK], username, password, first_name, last_name, position, site_id [FK], cost_center_id [FK]
func seedUser(db *sql.DB, record []string) error {
	user_id := record[0]
	password := "sosmit" // Default password
	username := record[1]
	first_name := record[2]
	last_name := record[3]
	position := record[4]
	site_id := record[5]
	cost_center_id := record[6]

	query := `INSERT INTO "User" (user_id, username, password, first_name, last_name, position, site_id, cost_center_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (user_id) DO NOTHING`

	_, err := db.Exec(query, user_id, username, password, first_name, last_name, position, site_id, cost_center_id)
	if err != nil {
		log.Fatalf("Error inserting record into User table: %v\n", err)
		return err
	}

	return nil
}

// Expected CSV format for asset.csv:
// asset_tag [PK], serial_number, status, status_reason, product_category, product_subcategory,
// product_variety, brand_name, product_name, condition, condition_photo_url, owner_id [FK], site_id [FK]
func seedAsset(db *sql.DB, record []string) error {
	asset_tag := record[0]
	serial_number := record[1]
	status := record[2]
	status_reason := record[3]
	product_category := record[4]
	product_subcategory := record[5]
	product_variety := record[6]
	brand_name := record[7]
	product_name := record[8]
	conditionStr := record[9]
	condition_photo_url := record[10]
	owner_id := record[11]
	site_id := record[12]

	// Convert condition to int
	condition, err := strconv.Atoi(conditionStr)
	if err != nil {
		log.Fatalf("Error converting condition '%s' to int: %v\n", conditionStr, err)
		return err
	}

	// Convert empty string to nil for nullable fields
	var status_reasonPtr interface{}
	if status_reason == "" {
		status_reasonPtr = nil
	} else {
		status_reasonPtr = record[3]
	}

	var conditionPhotoURLPtr interface{}
	if condition_photo_url == "" {
		conditionPhotoURLPtr = nil
	} else {
		conditionPhotoURLPtr = condition_photo_url
	}

	query := `INSERT INTO "Asset" (asset_tag, serial_number, status, status_reason, product_category, product_subcategory, product_variety, brand_name, product_name, condition, condition_photo_url, owner_id, site_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT (asset_tag) DO NOTHING`

	_, err = db.Exec(query, asset_tag, serial_number, status, status_reasonPtr, product_category, product_subcategory,
		product_variety, brand_name, product_name, condition, conditionPhotoURLPtr, owner_id, site_id)
	if err != nil {
		log.Fatalf("Error inserting record into Asset table: %v\n", err)

		return err
	}

	return nil
}
