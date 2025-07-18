// == Handles the main entry point for the application ==
package main

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/Sam-Gunawan/SOSMIT/backend/internal/asset"
	"github.com/Sam-Gunawan/SOSMIT/backend/internal/auth"
	"github.com/Sam-Gunawan/SOSMIT/backend/internal/email"
	"github.com/Sam-Gunawan/SOSMIT/backend/internal/opname"
	"github.com/Sam-Gunawan/SOSMIT/backend/internal/site"
	"github.com/Sam-Gunawan/SOSMIT/backend/internal/upload"
	"github.com/Sam-Gunawan/SOSMIT/backend/internal/user"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	_ "github.com/lib/pq" // PostgreSQL driver
)

// Database connection details.
const (
	host     = "localhost"
	port     = 5433
	username = "sosmit_admin"
	password = "admin123"
	db_name  = "sosmit_db"
)

func main() {
	// Setup the database connection.
	db, err := sql.Open("postgres", fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable", host, port, username, password, db_name))
	if err != nil {
		log.Fatalln("Error connecting to the database:", err)
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

	// Initialize the services
	uploadService := upload.NewService()
	emailService := email.NewService()
	authService := auth.NewService(userRepo)
	userService := user.NewService(userRepo)
	assetService := asset.NewService(assetRepo)
	opnameService := opname.NewService(opnameRepo, uploadService, userRepo, siteRepo, emailService)
	siteService := site.NewService(siteRepo)

	// Initialize the handlers
	authHandler := auth.NewHandler(authService)
	userHandler := user.NewHandler(userService)
	assetHandler := asset.NewHandler(assetService)
	opnameHandler := opname.NewHandler(opnameService)
	siteHandler := site.NewHandler(siteService)
	uploadHandler := upload.NewHandler(uploadService)

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

			// GET /api/user/site-cards
			userRoutes.GET("/site-cards", userHandler.GetUserSiteCardsHandler)

			// GET /api/user/all
			userRoutes.GET("/all", userHandler.GetAllUsersHandler)
		}

		siteRoutes := api.Group("/site").Use(auth.AuthMiddleware())
		{
			// GET /api/site/:site-id/assets
			siteRoutes.GET("/:site-id/assets", assetHandler.GetAssetsOnSiteHandler)

			// GET /api/site/all
			siteRoutes.GET("/all", siteHandler.GetAllSitesHandler)

			// GET /api/site/:site-id
			siteRoutes.GET("/:site-id", siteHandler.GetSiteByIDHandler)

		}

		assetRoutes := api.Group("/asset").Use(auth.AuthMiddleware())
		{
			// GET /api/asset/tag/:asset_tag
			assetRoutes.GET("/tag/:asset_tag", assetHandler.GetAssetByTagHandler)

			// GET /api/asset/serial/:serial_number
			assetRoutes.GET("/serial/:serial_number", assetHandler.GetAssetBySerialNumberHandler)
		}

		opnameRoutes := api.Group("/opname").Use(auth.AuthMiddleware())
		{
			// GET /api/opname/:session-id
			opnameRoutes.GET("/:session-id", opnameHandler.GetSessionByIDHandler)

			// GET /api/opname/:session-id/load-progress
			opnameRoutes.GET("/:session-id/load-progress", opnameHandler.LoadOpnameProgressHandler)

			// POST /api/opname/start
			opnameRoutes.POST("/start", opnameHandler.StartNewSessionHandler)

			// POST /api/opname/:session-id/process-asset
			opnameRoutes.POST("/:session-id/process-asset", opnameHandler.ProcessAssetChangesHandler)

			// PUT /api/opname/:session-id/finish
			opnameRoutes.PUT("/:session-id/finish", opnameHandler.FinishOpnameSessionHandler)

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

	}

	// Start the server on port 8080.
	log.Println("Starting server on port 8080...")
	if err := router.Run(":8080"); err != nil {
		log.Fatalf("Failed to start API server: %v\n", err)
	}
}
