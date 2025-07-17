// == Handles logical operation for static file management ==
package upload

import (
	"log"
	"os"
	"path/filepath"
	"strings"
)

type Service struct{}

// NewService creates a new upload service.
func NewService() *Service {
	return &Service{}
}

// DeleteConditionPhoto deletes an asset's condition photo from the server.
func (service *Service) DeleteConditionPhoto(photoURL string) error {
	if photoURL != "" && strings.HasPrefix(photoURL, "/uploads/asset_condition_photo") {
		// Convert to local path
		oldFilepath := filepath.Join("..", photoURL)

		// Attempt to remove the old file
		if err := os.Remove(oldFilepath); err != nil {
			log.Printf("⚠️ Warning: Could not delete old photo %s: %v", oldFilepath, err)
			return err
		} else {
			log.Printf("✅ Successfully deleted old photo: %s", oldFilepath)
		}
	}

	return nil
}
