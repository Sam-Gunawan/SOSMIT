// == Handles static file server serving ==
package upload

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct{}

// NewHandler creates a new upload handler.
func NewHandler() *Handler {
	return &Handler{}
}

// UploadPhotoHandler handles photo uploads.
func (handler *Handler) UploadPhotoHandler(context *gin.Context) {
	// Retrieve the file from the form-data.
	// "condition_photo" is the 'name' attribute of the file input in the HTML form.
	file, err := context.FormFile("condition_photo")
	if err != nil {
		log.Printf("❌ Error retrieving file from form: %v", err)
		context.JSON(http.StatusBadRequest, gin.H{
			"error": "No file received. Make sure the form has 'enctype' set to 'multipart/form-data' and the file input name is 'condition_photo'.",
		})
		return
	}

	// Generate a unique filename to avoid conflicts.
	// We'll be using UUID (Universally Unique Identifier) and keep the original file extension.
	filename := uuid.New().String() + filepath.Ext(file.Filename)

	// Define the upload directory.
	uploadDir := "../uploads/asset_condition_photos"

	// Ensure the upload directory exists.
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		log.Printf("❌ Error creating upload directory: %v", err)
		context.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create upload directory.",
		})
		return
	}

	// Construct the full path where the file will be saved.
	uploadPath := filepath.Join(uploadDir, filename)

	// Save the file to the specified path.
	if err := context.SaveUploadedFile(file, uploadPath); err != nil {
		log.Printf("❌ Error saving uploaded file: %v", err)
		context.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to save the uploaded file.",
		})
		return
	}

	// If successful, return the file path.
	fileURL := "/uploads/asset_condition_photos/" + filename
	log.Printf("✅ File uploaded successfully: %s", fileURL)
	context.JSON(http.StatusOK, gin.H{
		"message": "File uploaded successfully",
		"url":     fileURL,
	})
}
