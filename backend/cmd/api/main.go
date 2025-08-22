// == Handles the main entry point for the application ==
package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/Sam-Gunawan/SOSMIT/backend/internal/asset"
	"github.com/Sam-Gunawan/SOSMIT/backend/internal/auth"
	"github.com/Sam-Gunawan/SOSMIT/backend/internal/department"
	"github.com/Sam-Gunawan/SOSMIT/backend/internal/email"
	"github.com/Sam-Gunawan/SOSMIT/backend/internal/opname"
	"github.com/Sam-Gunawan/SOSMIT/backend/internal/report"
	"github.com/Sam-Gunawan/SOSMIT/backend/internal/site"
	"github.com/Sam-Gunawan/SOSMIT/backend/internal/upload"
	"github.com/Sam-Gunawan/SOSMIT/backend/internal/user"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	_ "github.com/lib/pq" // PostgreSQL driver
)

// Get environment variable with fallback.
func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func main() {
	// Resolve DB connection parameters from environment (Docker friendly) with sensible defaults.
	host := getenv("DB_HOST", "localhost")
	portStr := getenv("DB_PORT", "5433")
	port, _ := strconv.Atoi(portStr)
	username := getenv("DB_USER", "sosmit_admin")
	password := getenv("DB_PASSWORD", "admin123")
	dbName := getenv("DB_NAME", "sosmit_db")
	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable", host, port, username, password, dbName)
	db, err := sql.Open("postgres", dsn)
	for trial := 0; err != nil && trial < 3; trial++ {
		log.Printf("Attempt %d: Error connecting to the database: %v", trial+1, err)
		time.Sleep(2 * time.Second) // Wait before retrying
		db, err = sql.Open("postgres", dsn)
		if trial == 2 {
			log.Fatalln("Error connecting to database after 3 attempts:", err, "\nExiting program...")
		}
	}

	// Make sure the database is closed when the function returns.
	defer db.Close()

	// Test the connection to the database with ping.
	if err := db.Ping(); err != nil {
		log.Fatalln("Error pinging the database:", err)
	} else {
		log.Println("✅ Successfully connected to the database!")
	}

	// Initialize the Gin router which is a web framework for Go.
	// This will be used to handle HTTP requests and define routes for the API.
	router := gin.Default()

	// Initialize the user repository with the database connection.
	userRepo := user.NewRepository(db)
	assetRepo := asset.NewRepository(db)
	opnameRepo := opname.NewRepository(db)
	siteRepo := site.NewRepository(db)
	reportRepo := report.NewRepository(db)
	deptRepo := department.NewRepository(db)

	// Initialize the services
	uploadService := upload.NewService()
	emailService := email.NewService()
	authService := auth.NewService(userRepo)
	userService := user.NewService(userRepo)
	assetService := asset.NewService(assetRepo)
	siteService := site.NewService(siteRepo)
	deptService := department.NewService(deptRepo)
	reportService := report.NewService(reportRepo)
	opnameService := opname.NewService(opnameRepo, uploadService, userRepo, siteRepo, emailService, reportService)

	// Initialize the handlers
	authHandler := auth.NewHandler(authService)
	userHandler := user.NewHandler(userService)
	assetHandler := asset.NewHandler(assetService)
	opnameHandler := opname.NewHandler(opnameService)
	siteHandler := site.NewHandler(siteService)
	deptHandler := department.NewHandler(deptService)
	uploadHandler := upload.NewHandler(uploadService)
	reportHandler := report.NewHandler(reportService)

	// Setup the static file server route for serving uploaded files.
	router.Static("/uploads", "../uploads")

	// Setup CORS (Cross-Origin Resource Sharing) middleware.
	// This allows us to handle requests from the Angular frontend.
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:4200"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}
	router.Use(cors.New(config))

	// Define the routes for the API.
	// In simple terms, a route is a URL path that the server listens to and responds to.
	// E.g. when a user visits /login, the server will respond with the login page or handle the login request.
	api := router.Group("/api")
	{
		authRoutes := api.Group("/auth")
		{
			// POST /api/auth/login
			authRoutes.POST("/login", authHandler.LoginHandler)
		}

		userRoutes := api.Group("/user")

		// This route group is protected by the AuthMiddleware, which checks for a valid JWT token.
		userRoutes.Use(auth.AuthMiddleware())
		{
			// GET /api/user/me
			userRoutes.GET("/me", userHandler.GetMeHandler)

			// GET /api/user/:user-id
			userRoutes.GET("/:user-id", userHandler.GetUserByIDHandler)

			// GET /api/user/opname-locations
			userRoutes.GET("/opname-locations", userHandler.GetUserOpnameLocationsHandler)

			// GET /api/user/all
			userRoutes.GET("/all", userHandler.GetAllUsersHandler)
		}

		siteRoutes := api.Group("/site").Use(auth.AuthMiddleware())
		{
			// GET /api/site/assets
			siteRoutes.GET("/assets", assetHandler.GetAssetsOnLocationHandler)

			// GET /api/site/all
			siteRoutes.GET("/all", siteHandler.GetAllSitesHandler)

			// GET /api/site/:site-id
			siteRoutes.GET("/:site-id", siteHandler.GetSiteByIDHandler)

			// GET /api/site/sub-site/:sub-site-id
			siteRoutes.GET("/sub-site/:sub-site-id", siteHandler.GetSubSiteByIDHandler)

			// GET /api/site/:site-id/sub-sites
			siteRoutes.GET("/:site-id/sub-sites", siteHandler.GetSubSitesBySiteIDHandler)

			// GET /api/site/all-sub-sites
			siteRoutes.GET("/all-sub-sites", siteHandler.GetAllSubSitesHandler)
		}

		deptRoutes := api.Group("/department").Use(auth.AuthMiddleware())
		{
			// GET /api/department/:id
			deptRoutes.GET("/:id", deptHandler.GetDeptByIDHandler)
		}

		assetRoutes := api.Group("/asset").Use(auth.AuthMiddleware())
		{
			// GET /api/asset/tag/:asset_tag
			assetRoutes.GET("/tag/:asset_tag", assetHandler.GetAssetByTagHandler)

			// GET /api/asset/serial/:serial_number
			assetRoutes.GET("/serial/:serial_number", assetHandler.GetAssetBySerialNumberHandler)

			// GET /api/asset/:product-variety/equipments
			assetRoutes.GET("/:product-variety/equipments", assetHandler.GetAssetEquipmentsHandler)
		}

		opnameRoutes := api.Group("/opname").Use(auth.AuthMiddleware())
		{
			// GET /api/opname/:session-id
			opnameRoutes.GET("/:session-id", opnameHandler.GetSessionByIDHandler)

			// GET /api/opname/:session-id/load-progress
			opnameRoutes.GET("/:session-id/load-progress", opnameHandler.LoadOpnameProgressHandler)

			// GET /api/opname/:session-id/user-info
			opnameRoutes.GET("/:session-id/user-info", opnameHandler.GetUserFromOpnameSessionHandler)

			// GET /api/opname/filter/location
			opnameRoutes.GET("/filter/location", opnameHandler.GetOpnameOnLocationHandler)

			// GET /api/opname/:session-id/unscanned-assets
			opnameRoutes.GET("/:session-id/unscanned-assets", opnameHandler.GetUnscannedAssetsHandler)

			// POST /api/opname/start
			opnameRoutes.POST("/start", opnameHandler.StartNewSessionHandler)

			// POST /api/opname/:session-id/process-asset
			opnameRoutes.POST("/:session-id/process-asset", opnameHandler.ProcessAssetChangesHandler)

			// PUT /api/opname/:session-id/finish
			opnameRoutes.PUT("/:session-id/finish", opnameHandler.FinishOpnameSessionHandler)

			// PUT /api/opname/:session-id/approve
			opnameRoutes.PUT("/:session-id/approve", opnameHandler.ApproveOpnameSessionHandler)

			// PUT /api/opname/:session-id/reject
			opnameRoutes.PUT("/:session-id/reject", opnameHandler.RejectOpnameSessionHandler)

			// DELETE /api/opname/:session-id/cancel
			opnameRoutes.DELETE("/:session-id/cancel", opnameHandler.DeleteSessionHandler)

			// DELETE /api/opname/:session-id/remove-asset
			opnameRoutes.DELETE("/:session-id/remove-asset", opnameHandler.RemoveAssetChangeHandler)
		}

		uploadRoutes := api.Group("/upload").Use(auth.AuthMiddleware())
		{
			// POST /api/upload/photo
			uploadRoutes.POST("/photo", uploadHandler.UploadPhotoHandler)
		}

		reportRoutes := api.Group("/report").Use(auth.AuthMiddleware())
		{
			// GET /api/report/:session-id/stats
			reportRoutes.GET("/:session-id/stats", reportHandler.GetOpnameStatsHandler)

			// GET /api/report/:session-id/bap.pdf
			reportRoutes.GET("/:session-id/bap.pdf", reportHandler.GenerateBAPHandler)

			// PUT /api/report/action-notes/add
			reportRoutes.PUT("/action-notes/add", reportHandler.SetActionNotesHandler)

			// DELETE /api/report/action-notes/delete
			reportRoutes.DELETE("/action-notes/delete", reportHandler.DeleteActionNotesHandler)
		}

	}

	// Start the server on port 8080.
	log.Println("Starting server on port 8080...")
	if err := router.Run(":8080"); err != nil {
		log.Fatalf("Failed to start API server: %v\n", err)
	}
}
