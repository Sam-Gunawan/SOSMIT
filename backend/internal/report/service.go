// == Handles all logical operations related to Report ==
package report

import (
	"bytes"
	"database/sql"
	"fmt"
	"html/template"
	"io"
	"log"
	"os"
	"os/exec"
	"sort"
	"strings"
	"time"

	"github.com/SebastiaanKlippert/go-wkhtmltopdf"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// Category order and Indonesian labels.
var categoryOrder = []string{"working_assets", "broken_assets", "misplaced_assets", "missing_assets"}
var categoryLabel = map[string]string{
	"working_assets":   "sesuai dan berfungsi",
	"broken_assets":    "rusak",
	"misplaced_assets": "selisih administrasi (karena mutasi)",
	"missing_assets":   "tidak ditemukan",
}

func getBAPTemplate() (string, error) {
	fmt.Println(os.Getwd())
	file, err := os.Open("templates/bap_template.html")
	if err != nil {
		return "", err
	}
	defer file.Close()

	content, err := io.ReadAll(file)
	if err != nil {
		return "", err
	}

	return string(content), nil
}

func (service *Service) GetOpnameStats(sessionID int64) (*OpnameStats, error) {
	stats, _ := service.repo.GetOpnameStats(sessionID)
	log.Printf("✅ Successfully retrieved opname stats for session ID %d", sessionID)
	return stats, nil
}

// GenerateBAPPDF delegates to HTML path for backward compatibility with existing callers.
func (service *Service) GenerateBAPPDF(sessionID int64, signatures []string, siteName, siteGroup string, endDate time.Time) ([]byte, error) {
	return service.GenerateBAPPDFHTML(sessionID, signatures, siteName, siteGroup, endDate)
}

func (service *Service) GenerateBAPPDFHTML(sessionID int64, signatures []string, siteName, siteGroup string, endDate time.Time) ([]byte, error) {
	if _, err := exec.LookPath("wkhtmltopdf"); err != nil {
		log.Printf("[REPORT] wkhtmltopdf not found: %v", err)
		return nil, fmt.Errorf("wkhtmltopdf binary not found in PATH: %w", err)
	}
	log.Printf("[REPORT] Generating BAP HTML->PDF session=%d", sessionID)

	recapRows, err := service.repo.GetBAPRecap(sessionID)
	if err != nil {
		return nil, err
	}
	detailRows, err := service.repo.GetBAPDetails(sessionID)
	if err != nil {
		return nil, err
	}

	recapTable := append([]BAPRecapRow(nil), recapRows...)

	orderIndex := func(category string) int {
		for i, v := range categoryOrder {
			if v == category {
				return i
			}
		}
		return 99
	}

	sort.Slice(recapTable, func(i, j int) bool {
		if orderIndex(recapTable[i].Category) == orderIndex(recapTable[j].Category) {
			return recapTable[i].ProductVariety < recapTable[j].ProductVariety
		}
		return orderIndex(recapTable[i].Category) < orderIndex(recapTable[j].Category)
	})

	sort.Slice(detailRows, func(i, j int) bool {
		if orderIndex(detailRows[i].Category) == orderIndex(detailRows[j].Category) {
			return detailRows[i].AssetTag < detailRows[j].AssetTag
		}
		return orderIndex(detailRows[i].Category) < orderIndex(detailRows[j].Category)
	})

	data := struct {
		SiteName      string
		SiteGroup     string
		EndDate       string
		EndTime       string
		Recap         []BAPRecapRow
		CategoryLabel map[string]string
		Signatures    []string
		Details       []BAPDetailRow
	}{
		SiteName:      siteName,
		SiteGroup:     siteGroup,
		EndDate:       endDate.Format("2006-01-02"),
		EndTime:       endDate.Format("15:04"),
		Recap:         recapTable,
		CategoryLabel: categoryLabel,
		Signatures:    signatures,
		Details:       detailRows,
	}

	templateContent, err := getBAPTemplate()
	if err != nil {
		return nil, fmt.Errorf("failed to read template: %w", err)
	}

	templateFunctions := template.FuncMap{
		"Label":   func(category string) string { return categoryLabel[category] },
		"Safe":    func(nullable interface{}) string { return safeNullable(nullable) },
		"SafeInt": func(nullableInt sql.NullInt64) string { return safeNullableInt(nullableInt) },
		"add":     func(a, b int) int { return a + b },
		"sub":     func(a, b int) int { return a - b },
		"len": func(slice interface{}) int {
			switch cast := slice.(type) {
			case []BAPDetailRow:
				return len(cast)
			default:
				return 0
			}
		},
		"FisikQty": func(row BAPRecapRow) int64 {
			if row.Category == "missing_assets" {
				return 0
			}
			return row.AssetCount
		},
		"DataQty": func(row BAPRecapRow) int64 { return row.AssetCount },
		"Selisih": func(row BAPRecapRow) string {
			if row.Category == "missing_assets" {
				return fmt.Sprintf("%d", row.AssetCount)
			}
			return "-"
		},
		"Satuan": func(row BAPRecapRow) string { return "Unit" },
		"upper":  strings.ToUpper,
	}

	tpl, err := template.New("bap").Funcs(templateFunctions).Parse(templateContent)
	if err != nil {
		return nil, err
	}

	var htmlBuffer bytes.Buffer
	if err := tpl.Execute(&htmlBuffer, data); err != nil {
		return nil, err
	}

	pdfGenerator, err := wkhtmltopdf.NewPDFGenerator()
	if err != nil {
		log.Printf("[REPORT] wkhtmltopdf init failed: %v", err)
		return nil, fmt.Errorf("wkhtmltopdf init failed: %w", err)
	}
	page := wkhtmltopdf.NewPageReader(bytes.NewReader(htmlBuffer.Bytes()))
	page.EnableLocalFileAccess.Set(true)
	pdfGenerator.AddPage(page)
	pdfGenerator.Dpi.Set(96)
	pdfGenerator.Orientation.Set(wkhtmltopdf.OrientationLandscape)
	pdfGenerator.PageSize.Set(wkhtmltopdf.PageSizeA4)
	pdfGenerator.MarginLeft.Set(10)
	pdfGenerator.MarginRight.Set(10)
	pdfGenerator.MarginTop.Set(12)
	pdfGenerator.MarginBottom.Set(12)
	if err := pdfGenerator.Create(); err != nil {
		log.Printf("[REPORT] wkhtmltopdf create failed: %v", err)
		return nil, fmt.Errorf("wkhtmltopdf create failed: %w", err)
	}
	log.Printf("[REPORT] PDF generated size=%d bytes session=%d", len(pdfGenerator.Bytes()), sessionID)
	return pdfGenerator.Bytes(), nil
}

// GenerateAndAssembleBAP gathers meta + signatures then produces PDF + filename.
func (service *Service) GenerateAndAssembleBAP(sessionID int64) ([]byte, string, error) {
	sessionMeta, err := service.repo.GetSessionMeta(sessionID)
	if err != nil || sessionMeta == nil {
		return nil, "", fmt.Errorf("session not found")
	}
	type siteMini struct{ Name, Group string }
	var siteInfo siteMini
	row := service.repo.db.QueryRow(`SELECT site_name, site_group_name FROM get_site_by_id($1)`, sessionMeta.SiteID)
	if err := row.Scan(&siteInfo.Name, &siteInfo.Group); err != nil {
		return nil, "", fmt.Errorf("site fetch failed: %w", err)
	}
	var submitterFirst, submitterLast string
	_ = service.repo.db.QueryRow(`SELECT first_name, last_name FROM get_user_by_id($1)`, sessionMeta.UserID).Scan(&submitterFirst, &submitterLast)
	submitterName := strings.TrimSpace(submitterFirst + " " + submitterLast)
	statusLower := strings.ToLower(sessionMeta.Status)
	var managerName, l1Name string
	if sessionMeta.ManagerReviewerID.Valid {
		var firstName, lastName string
		_ = service.repo.db.QueryRow(`SELECT first_name, last_name FROM get_user_by_id($1)`, sessionMeta.ManagerReviewerID.Int64).Scan(&firstName, &lastName)
		managerName = strings.TrimSpace(firstName + " " + lastName)
	}
	if sessionMeta.L1ReviewerID.Valid {
		var firstName, lastName string
		_ = service.repo.db.QueryRow(`SELECT first_name, last_name FROM get_user_by_id($1)`, sessionMeta.L1ReviewerID.Int64).Scan(&firstName, &lastName)
		l1Name = strings.TrimSpace(firstName + " " + lastName)
	}
	locationJakarta, _ := time.LoadLocation("Asia/Jakarta")
	parseTimestamp := func(nullableString sql.NullString) *time.Time {
		if !nullableString.Valid || strings.TrimSpace(nullableString.String) == "" {
			return nil
		}
		layouts := []string{"2006-01-02 15:04:05", "2006-01-02 15:04", "2006-01-02T15:04:05Z07:00"}
		for _, layout := range layouts {
			if parsed, err := time.ParseInLocation(layout, nullableString.String, locationJakarta); err == nil {
				return &parsed
			}
		}
		return nil
	}
	submitTime := parseTimestamp(sessionMeta.EndDate)
	managerTime := parseTimestamp(sessionMeta.ManagerReviewedAt)
	l1Time := parseTimestamp(sessionMeta.L1ReviewedAt)
	if !(statusLower == "escalated" || statusLower == "verified" || statusLower == "rejected") {
		managerName = ""
		managerTime = nil
	}
	if !(statusLower == "verified" || statusLower == "rejected") {
		l1Name = ""
		l1Time = nil
	}
	signatures := BuildSignatures(submitterName, submitTime, managerName, managerTime, l1Name, l1Time)
	endTime := time.Now()
	if submitTime != nil {
		endTime = *submitTime
	}
	pdfBytes, err := service.GenerateBAPPDFHTML(sessionID, signatures, siteInfo.Name, siteInfo.Group, endTime)
	if err != nil {
		return nil, "", err
	}
	filename := "BAP_opname_" + sanitizeFileFragment(siteInfo.Name) + "_" + time.Now().Format("02-01-2006") + ".pdf"
	return pdfBytes, filename, nil
}

func sanitizeFileFragment(s string) string {
	out := make([]rune, 0, len(s))
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' {
			out = append(out, r)
		} else if r == ' ' {
			out = append(out, '_')
		}
	}
	if len(out) == 0 {
		return "site"
	}
	return string(out)
}

func safeNullable(nullable interface{}) string {
	switch cast := nullable.(type) {
	case sql.NullString:
		if cast.Valid {
			return cast.String
		}
		return "-"
	case *sql.NullString:
		if cast != nil && cast.Valid {
			return cast.String
		}
		return "-"
	default:
		return "-"
	}
}

func safeNullableInt(nullableInt sql.NullInt64) string {
	if nullableInt.Valid {
		return fmt.Sprintf("%d", nullableInt.Int64)
	}
	return "-"
}

func BuildSignatures(submitter string, submitTime *time.Time, manager string, managerTime *time.Time, level1 string, level1Time *time.Time) []string {
	var signatures []string
	format := func(t *time.Time) string {
		if t == nil {
			return "-"
		}
		return t.Format("2006-01-02 15:04 WIB")
	}
	if submitter != "" {
		signatures = append(signatures, fmt.Sprintf("Dilaksanakan oleh: %s – %s", submitter, format(submitTime)))
	}
	if strings.TrimSpace(manager) != "" {
		signatures = append(signatures, fmt.Sprintf("Disetujui oleh (Mgr): %s – %s", manager, format(managerTime)))
	}
	if strings.TrimSpace(level1) != "" {
		signatures = append(signatures, fmt.Sprintf("Disetujui oleh (L1): %s – %s", level1, format(level1Time)))
	}
	return signatures
}

// SetActionNotes updates the action note for a specific asset change record
func (service *Service) SetActionNotes(assetChangeID int64, userID int64, actionNotes string) error {
	// No logical operations needed yet
	return service.repo.SetActionNotes(assetChangeID, userID, actionNotes)
}

// DeleteActionNotes removes the action note for a specific asset change record
func (service *Service) DeleteActionNotes(assetChangeID int64, userID int64) error {
	// No logical operations needed yet
	return service.repo.DeleteActionNotes(assetChangeID, userID)
}
