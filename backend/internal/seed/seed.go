// A standalone program to populate the database with initial dummy data.
// IMPORTANT: Make sure to run this everytime the database schema changes.

package main

import (
	"database/sql"
	"encoding/csv"
	"fmt"
	"log"
	"os"

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

//

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
		log.Println("Successfully connected to the database!")
	}

	// Seeding the database with initial data
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
	// Read all records from the CSV file. Records are returned as a slice of string slices.
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

	log.Printf("Successfully seeded table %s with data from %s!\n", tableName, filePath)
	return nil
}

// Expected CSV format for region.csv:
// id [PK], region_name
func seedRegion(db *sql.DB, record []string) error {
	region_name := record[1]
	query := "INSERT INTO region (region_name) VALUES ($1) ON CONFLICT (region_name) DO NOTHING"

	_, err := db.Exec(query, region_name)
	if err != nil {
		log.Fatalf("Error inserting record into Region table: %v\n", err)
	}

	return nil
}
