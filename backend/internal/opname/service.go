// == Handles logical operations for Opname ==
package opname

import (
	"errors"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"golang.org/x/text/cases"
	"golang.org/x/text/language"

	"github.com/Sam-Gunawan/SOSMIT/backend/internal/email"
	"github.com/Sam-Gunawan/SOSMIT/backend/internal/site"
	"github.com/Sam-Gunawan/SOSMIT/backend/internal/upload"
	"github.com/Sam-Gunawan/SOSMIT/backend/internal/user"
)

type Service struct {
	repo          *Repository
	uploadService *upload.Service
	userRepo      *user.Repository
	siteRepo      *site.Repository
	emailService  *email.Service
}

// NewService creates a new Opname service with the provided repository.
func NewService(repo *Repository, uploadService *upload.Service, userRepo *user.Repository, siteRepo *site.Repository, emailService *email.Service) *Service {
	return &Service{
		repo:          repo,
		uploadService: uploadService,
		userRepo:      userRepo,
		siteRepo:      siteRepo,
		emailService:  emailService,
	}
}

// StartNewSession creates a new opname session for a user at a specific site.
func (service *Service) StartNewSession(userID int, siteID int) (int, error) {
	// Validate userID and siteID
	if userID <= 0 || siteID <= 0 {
		log.Printf("⚠ Invalid userID or siteID: userID=%d, siteID=%d", userID, siteID)
		return 0, errors.New("invalid userID or siteID")
	}

	// Call the repository to create a new session
	newSessionID, err := service.repo.CreateNewSession(userID, siteID)
	if err != nil {
		log.Printf("❌ Error creating new opname session: %v", err)
		return 0, err
	}

	// If newSessionID is 0, it indicates failure in session creation due to ongoing sessions already available.
	// We translate this from business logic into a more user-friendly error.
	if newSessionID == 0 {
		log.Printf("⚠ No new session created, an ongoing session already exists for siteID %d", siteID)
		return 0, errors.New("an ongoing opname session already exists for this user at the specified site")
	}

	// If session creation is successful, return the new session ID
	return newSessionID, nil
}

// GetSessionByID retrieves an opname session by its ID.
func (service *Service) GetSessionByID(sessionID int) (*OpnameSession, error) {
	// Validate sessionID
	if sessionID <= 0 {
		log.Printf("⚠ Invalid sessionID: %d", sessionID)
		return nil, errors.New("invalid sessionID")
	}

	// Call the repository to get the session by ID
	session, err := service.repo.GetSessionByID(sessionID)
	if err != nil {
		log.Printf("❌ Error retrieving opname session by ID %d: %v", sessionID, err)
		return nil, err
	}

	// If no session is found, return an error
	if session == nil {
		log.Printf("⚠ No opname session found with ID: %d", sessionID)
		return nil, errors.New("opname session not found")
	}

	return session, nil
}

// DeleteSession deletes an opname session by its ID.
func (service *Service) DeleteSession(sessionID int, requestingUserID int, userPosition string) error {
	// Validate sessionID and checks if it exists.
	session, err := service.repo.GetSessionByID(sessionID)
	if err != nil {
		log.Printf("❌ Error retrieving opname session by ID %d: %v", sessionID, err)
		return err
	}
	if session == nil {
		log.Printf("⚠ No opname session found with ID: %d", sessionID)
		return errors.New("opname session not found")
	}

	// Delete all the condition photos associated with the session.
	conditionPhotos, err := service.repo.GetPhotosBySessionID(sessionID)
	if err != nil {
		log.Printf("❌ Error retrieving condition photos for session %d: %v", sessionID, err)
		return errors.New("failed to retrieve condition photos for session")
	}

	for _, conditionPhotoURL := range conditionPhotos {
		if err := service.uploadService.DeleteConditionPhoto(conditionPhotoURL); err != nil {
			log.Printf("❌ Error deleting condition photo %s for session %d: %v", conditionPhotoURL, sessionID, err)
			return err
		}
		log.Printf("✅ Successfully deleted condition photo %s for session %d", conditionPhotoURL, sessionID)
	}

	// Call the repository to delete the session.
	err = service.repo.DeleteSession(sessionID)
	if err != nil {
		log.Printf("❌ Error deleting opname session with ID %d: %v", sessionID, err)
		return err
	}

	// If deletion is successful, log the success.
	log.Printf("✅ Opname session with ID %d deleted successfully", sessionID)
	return nil
}

// ProcessAssetChanges processes the changes made to an asset during an opname session.
func (service *Service) ProcessAssetChanges(changedAsset AssetChange) ([]byte, error) {
	changesJSON, err := service.repo.RecordAssetChange(changedAsset)
	if err != nil {
		log.Printf("❌ Error recording asset changes for session %d, asset %s: %v", changedAsset.SessionID, changedAsset.AssetTag, err)
		return nil, err
	}

	// Check if changesJSON is empty ('{}')
	if string(changesJSON) == "{}" {
		log.Printf("‼ No changes recorded for session %d, asset %s", changedAsset.SessionID, changedAsset.AssetTag)
	} else {
		log.Printf("✅ Asset changes for session %d, asset %s recorded successfully", changedAsset.SessionID, changedAsset.AssetTag)
	}

	// Return the changes to the handler
	return changesJSON, nil
}

// RemoveAssetChange removes an asset change from an opname session.
func (service *Service) RemoveAssetChange(sessionID int, assetTag string) error {
	// Validate sessionID and assetTag
	if sessionID <= 0 || assetTag == "" {
		log.Printf("⚠ Invalid sessionID or assetTag: sessionID=%d, assetTag=%s", sessionID, assetTag)
		return errors.New("invalid sessionID or assetTag")
	}

	newConditionPhotoURL, err := service.repo.GetAssetChangePhoto(sessionID, assetTag)
	if err != nil {
		log.Printf("❌ Error retrieving asset change for session %d, asset %s: %v", sessionID, assetTag, err)
		return errors.New("asset change record not found")
	}

	// Call the file service to delete the old condition photo if it exists
	if err := service.uploadService.DeleteConditionPhoto(newConditionPhotoURL); err != nil && newConditionPhotoURL != "" {
		log.Printf("❌ Error deleting old condition photo for asset %s: %v", assetTag, err)
	}

	// Call the repository to delete the asset change
	err = service.repo.DeleteAssetChange(sessionID, assetTag)
	if err != nil {
		log.Printf("❌ Error deleting asset change for session %d, asset %s: %v", sessionID, assetTag, err)
		return err
	}

	log.Printf("✅ Asset change for session %d, asset %s deleted successfully", sessionID, assetTag)
	return nil
}

// LoadOpnameProgress retrieves the progress of an opname session.
func (service *Service) LoadOpnameProgress(sessionID int) ([]OpnameSessionProgress, error) {
	// Validate sessionID
	if sessionID <= 0 {
		log.Printf("⚠ Invalid sessionID: %d", sessionID)
		return nil, errors.New("invalid sessionID")
	}

	// Call the repository to load the opname progress
	progress, err := service.repo.LoadOpnameProgress(sessionID)
	if err != nil {
		log.Printf("❌ Error loading opname progress for session %d: %v", sessionID, err)
		return nil, err
	}

	if len(progress) == 0 {
		progress = make([]OpnameSessionProgress, 0) // Return an empty slice if no progress is found.
		log.Printf("⚠ No progress found for opname session %d", sessionID)
	}

	log.Printf("✅ Opname progress for session %d loaded successfully", sessionID)
	return progress, nil
}

// FinishOpnameSession marks an opname session as finished.
func (service *Service) FinishOpnameSession(sessionID int, requestingUserID int64) error {
	// Validate sessionID
	if sessionID <= 0 {
		log.Printf("⚠ Invalid sessionID: %d", sessionID)
		return errors.New("invalid sessionID")
	}

	// Call the repository to finish the opname session
	err := service.repo.FinishOpnameSession(sessionID)
	if err != nil {
		log.Printf("❌ Error finishing opname session with ID %d: %v", sessionID, err)
		return err
	}

	// Send a notification email to the user who started the session using a Go routine.
	go func() {
		submitter, _ := service.userRepo.GetUserByID(requestingUserID)
		session, _ := service.repo.GetSessionByID(sessionID)
		site, _ := service.siteRepo.GetSiteByID(session.SiteID)
		completedDate := time.Now().Format("Mon, 02 Jan 2006 15:04:05")
		submitterName := cases.Title(language.English).String((submitter.FirstName + " " + submitter.LastName))

		// Area manager info
		managerID, managerEmail, _ := service.userRepo.GetAreaManagerInfo(int64(site.SiteID))
		manager, _ := service.userRepo.GetUserByID(managerID)
		managerName := cases.Title(language.English).String((manager.FirstName + " " + manager.LastName))

		// Prepare the email data for user who completed the session and send it.
		emailDataUser := email.EmailData{
			Submitter:        submitterName,
			Reviewer:         managerName,
			SiteName:         site.SiteName,
			CompletedDate:    completedDate,
			VerificationLink: "",
			PageLink:         os.Getenv("FRONTEND_URL") + "/site/" + strconv.Itoa(site.SiteID) + "/report?session_id=" + strconv.Itoa(sessionID),
		}

		service.emailService.SendEmail(
			submitter.Email,
			submitter.Username,
			fmt.Sprintf("Opname for %s submitted", site.SiteName),
			"opname_submitted.html",
			emailDataUser,
			nil,
		)

		// Prepare the email data for the area manager and send it.
		emailDataAreaManager := email.EmailData{
			Submitter:        submitterName,
			Reviewer:         managerName,
			SiteName:         site.SiteName,
			CompletedDate:    completedDate,
			VerificationLink: os.Getenv("FRONTEND_URL") + "/opname/" + strconv.Itoa(sessionID) + "/review",
			PageLink:         "",
		}

		service.emailService.SendEmail(
			managerEmail,
			manager.Username,
			fmt.Sprintf("Opname for %s completed by %s", site.SiteName, submitterName),
			"opname_review_manager.html",
			emailDataAreaManager,
			nil,
		)
	}()

	log.Printf("✅ Opname session with ID %d finished successfully", sessionID)
	return nil
}

// GetOpnameOnSite retrieves all opname sessions for a specific site.
func (service *Service) GetOpnameOnSite(siteID int) ([]OpnameFilter, error) {
	// Validate siteID
	if siteID <= 0 {
		log.Printf("⚠ Invalid siteID: %d", siteID)
		return nil, errors.New("invalid siteID")
	}

	// Call the repository to get all opname sessions for the site
	sessions, err := service.repo.GetOpnameOnSite(siteID)
	if err != nil {
		log.Printf("❌ Error retrieving opname sessions for site %d: %v", siteID, err)
		return nil, err
	}

	if len(sessions) == 0 {
		log.Printf("⚠ No opname sessions found for site %d", siteID)
		return nil, errors.New("no opname sessions found for this site")
	}

	// Parse the completed date to a YYYY-MM-DD format.
	for i, session := range sessions {
		if session.CompletedDate != "" {
			sessions[i].CompletedDate = session.CompletedDate[:10]
		}
	}

	log.Printf("✅ Opname sessions for site %d retrieved successfully", siteID)
	return sessions, nil
}

// ApproveOpnameSession verifies an opname session by its ID.
func (service *Service) ApproveOpnameSession(sessionID int, reviewerID int) error {
	// Validate sessionID and reviewerID
	if sessionID <= 0 || reviewerID <= 0 {
		log.Printf("⚠ Invalid sessionID or reviewerID: sessionID=%d, reviewerID=%d", sessionID, reviewerID)
		return errors.New("invalid sessionID or reviewerID")
	}

	// Call the repository to verify the opname session
	err := service.repo.ApproveOpnameSession(sessionID, reviewerID)
	if err != nil {
		log.Printf("❌ Error approving opname session with ID %d: %v", sessionID, err)
		return err
	}

	// Init the ccEmails
	var ccEmails []string

	// Get the reviewer details
	reviewer, _ := service.userRepo.GetUserByID(int64(reviewerID))

	// Get the reviewer's position
	var reviewerPosition = reviewer.Position

	// Get the opname session info
	session, _ := service.repo.GetSessionByID(sessionID)

	// If a manager approves the session, send a notification email to the user who started the session and request verification from L1 support.
	if strings.ToLower(reviewerPosition) == "area manager" {
		go func() {
			submitter, _ := service.userRepo.GetUserByID(int64(session.UserID))
			submitterName := cases.Title(language.English).String((submitter.FirstName + " " + submitter.LastName))
			managerName := cases.Title(language.English).String((reviewer.FirstName + " " + reviewer.LastName))
			site, _ := service.siteRepo.GetSiteByID(session.SiteID)
			completedDate := time.Now().Format("Mon, 02 Jan 2006 15:04:05") // for manager_reviewed_at

			// Prepare the email data for the user and send it.
			emailDataUser := email.EmailData{
				Submitter:        submitterName,
				Reviewer:         managerName,
				SiteName:         site.SiteName,
				CompletedDate:    completedDate,
				VerificationLink: "",
				PageLink:         os.Getenv("FRONTEND_URL") + "/site/" + strconv.Itoa(site.SiteID) + "/report?session_id=" + strconv.Itoa(sessionID),
			}

			// Send update notice email to user.
			service.emailService.SendEmail(
				submitter.Email,
				submitter.Username,
				fmt.Sprintf("Opname for %s approved by %s", site.SiteName, managerName),
				"opname_escalated.html",
				emailDataUser,
				ccEmails,
			)

			// Prepare the email data for L1 SUPPORT and send it.
			l1SupportEmails, _ := service.userRepo.GetL1SupportEmails()
			opnameCompletedDateStr, _ := time.Parse(time.RFC3339, session.EndDate.String)
			opnameCompletedDate := opnameCompletedDateStr.Format("Mon, 02 Jan 2006 15:04:05")
			emailDataL1 := email.EmailData{
				Submitter:        submitterName,
				Reviewer:         managerName,
				SiteName:         site.SiteName,
				CompletedDate:    opnameCompletedDate,
				VerificationLink: os.Getenv("FRONTEND_URL") + "/opname/" + strconv.Itoa(sessionID) + "/review",
				PageLink:         "",
			}

			for _, emailAddr := range l1SupportEmails {
				service.emailService.SendEmail(
					emailAddr,
					"L1 Support Team",
					fmt.Sprintf("Opname for %s needs your verification!", site.SiteName),
					"opname_verification_needed.html",
					emailDataL1,
					ccEmails,
				)
			}
		}()

		// If an L1 support user approves the session, send a notification email to the user who started the session and cc the area manager.
	} else if strings.ToLower(reviewerPosition) == "l1 support" {
		go func() {
			submitter, _ := service.userRepo.GetUserByID(int64(session.UserID))
			submitterName := cases.Title(language.English).String((submitter.FirstName + " " + submitter.LastName))
			l1User, _ := service.userRepo.GetUserByID(int64(reviewerID))
			l1Name := cases.Title(language.English).String((l1User.FirstName + " " + l1User.LastName))
			site, _ := service.siteRepo.GetSiteByID(session.SiteID)
			completedDate := time.Now().Format("Mon, 02 Jan 2006 15:04:05") // for l1_reviewed_at

			// Prepare the email data for the user and send it.
			emailDataUser := email.EmailData{
				Submitter:        submitterName,
				Reviewer:         l1Name,
				SiteName:         site.SiteName,
				CompletedDate:    completedDate,
				VerificationLink: "",
				PageLink:         os.Getenv("FRONTEND_URL") + "/site/" + strconv.Itoa(site.SiteID) + "/report?session_id=" + strconv.Itoa(sessionID),
			}

			service.emailService.SendEmail(
				submitter.Email,
				submitter.Username,
				fmt.Sprintf("Opname for %s approved by L1 Support Team", site.SiteName),
				"opname_verified.html",
				emailDataUser,
				ccEmails,
			)
		}()

	}

	log.Printf("✅ Opname session with ID %d verified successfully by user %d", sessionID, reviewerID)
	return nil
}

// RejectOpnameSession rejects an opname session by its ID.
func (service *Service) RejectOpnameSession(sessionID int, reviewerID int) error {
	// Validate sessionID and reviewerID
	if sessionID <= 0 || reviewerID <= 0 {
		log.Printf("⚠ Invalid sessionID or reviewerID: sessionID=%d, reviewerID=%d", sessionID, reviewerID)
		return errors.New("invalid sessionID or reviewerID")
	}

	// Call the repository to reject the opname session
	err := service.repo.RejectOpnameSession(sessionID, reviewerID)
	if err != nil {
		log.Printf("❌ Error rejecting opname session with ID %d: %v", sessionID, err)
		return err
	}

	log.Printf("✅ Opname session with ID %d rejected successfully by user %d", sessionID, reviewerID)
	return nil
}
