// == Handles logical operations for email operations and sending via SendGrid ==
package email

import (
	"bytes"
	"encoding/base64"
	"html/template"
	"log"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
)

type Service struct {
	sendgridKey string
	senderEmail string
}

type EmailData struct {
	Reviewer         string
	Submitter        string
	SiteName         string
	CompletedDate    string
	VerificationLink string
	PageLink         string
}

// Attachment represents a file attachment (e.g., PDF) to send.
type Attachment struct {
	Filename    string
	ContentType string
	Data        []byte
}

// NewService creates a new email service with the provided SendGrid API key and sender email.
func NewService() *Service {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("❌ Error loading .env file: ", err)
	}

	apiKey := os.Getenv("SENDGRID_API_KEY")
	sender := os.Getenv("SENDER_EMAIL")

	if apiKey == "" || sender == "" {
		log.Fatal("❌ SENDGRID_API_KEY or SENDER_EMAIL environment variables are not set")
	}

	return &Service{
		sendgridKey: apiKey,
		senderEmail: sender,
	}
}

// SendEmail sends an email using the SendGrid API.
func (service *Service) SendEmail(recipientEmail, recipientName, subject, templateName string, data EmailData, ccEmail []string, attachments ...Attachment) error {
	// Parse the HTML template
	templatePath := filepath.Join("templates", templateName)
	templateFile, err := template.ParseFiles(templatePath)
	if err != nil {
		log.Printf("❌ Error parsing template %s: %v", templateName, err)
		return err
	}

	// Create a buffer to hold the rendered template.
	var body bytes.Buffer
	if err := templateFile.Execute(&body, data); err != nil {
		log.Printf("❌ Error executing template %s: %v", templateName, err)
		return err
	}

	// Send the email using SendGrid API.
	from := mail.NewEmail("SOSMIT App", service.senderEmail)
	to := mail.NewEmail(recipientName, recipientEmail)
	message := mail.NewSingleEmail(from, subject, to, "", body.String())
	for _, cc := range ccEmail { // Add cc recipients if provided.
		ccRecipient := mail.NewEmail("", cc)
		message.Personalizations[0].AddCCs(ccRecipient)
	}

	// Add attachments if any
	for _, att := range attachments {
		if len(att.Data) == 0 {
			continue
		}
		encoded := base64.StdEncoding.EncodeToString(att.Data)
		a := mail.Attachment{
			Filename:    att.Filename,
			Type:        att.ContentType,
			Content:     encoded,
			Disposition: "attachment",
		}
		message.AddAttachment(&a)
	}
	client := sendgrid.NewSendClient(service.sendgridKey)
	response, err := client.Send(message)

	if err != nil {
		log.Printf("❌ Error sending email to %s: %v", recipientEmail, err)
		return err
	}

	// Log the response from SendGrid.
	if response.StatusCode >= 300 {
		log.Printf("❌ Sendgrid returned a non-success status when sending email to %s: %s", recipientEmail, response.Body)
	} else {
		log.Printf("✅ Email sent successfully to %s with status code %d", recipientEmail, response.StatusCode)
	}

	return nil
}
