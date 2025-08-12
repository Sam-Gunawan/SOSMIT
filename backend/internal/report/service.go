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

type Service struct{ repo *Repository }

func NewService(repo *Repository) *Service { return &Service{repo: repo} }

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

func (s *Service) GetOpnameStats(sessionID int64) (*OpnameStats, error) {
	stats, _ := s.repo.GetOpnameStats(sessionID)
	log.Printf("✅ Successfully retrieved opname stats for session ID %d", sessionID)
	return stats, nil
}

// GenerateBAPPDF delegates to HTML path for backward compatibility with existing callers.
func (s *Service) GenerateBAPPDF(sessionID int64, signatures []string, siteName, siteGroup string, endDate time.Time) ([]byte, error) {
	return s.GenerateBAPPDFHTML(sessionID, signatures, siteName, siteGroup, endDate)
}

func (s *Service) GenerateBAPPDFHTML(sessionID int64, signatures []string, siteName, siteGroup string, endDate time.Time) ([]byte, error) {
	if _, err := exec.LookPath("wkhtmltopdf"); err != nil {
		log.Printf("[REPORT] wkhtmltopdf not found: %v", err)
		return nil, fmt.Errorf("wkhtmltopdf binary not found in PATH: %w", err)
	}
	log.Printf("[REPORT] Generating BAP HTML->PDF session=%d", sessionID)

	recapRows, err := s.repo.GetBAPRecap(sessionID)
	if err != nil {
		return nil, err
	}
	detailRows, err := s.repo.GetBAPDetails(sessionID)
	if err != nil {
		return nil, err
	}

	// Use the recap rows directly without any transformation
	recapTable := append([]BAPRecapRow(nil), recapRows...)

	// Sort recap table by category order, then by product variety
	orderIdx := func(c string) int {
		for i, v := range categoryOrder {
			if v == c {
				return i
			}
		}
		return 99
	}
	sort.Slice(recapTable, func(i, j int) bool {
		if orderIdx(recapTable[i].Category) == orderIdx(recapTable[j].Category) {
			return recapTable[i].ProductVariety < recapTable[j].ProductVariety
		}
		return orderIdx(recapTable[i].Category) < orderIdx(recapTable[j].Category)
	})

	sort.Slice(detailRows, func(i, j int) bool {
		if orderIdx(detailRows[i].Category) == orderIdx(detailRows[j].Category) {
			return detailRows[i].AssetTag < detailRows[j].AssetTag
		}
		return orderIdx(detailRows[i].Category) < orderIdx(detailRows[j].Category)
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
	}{siteName, siteGroup, endDate.Format("2006-01-02"), endDate.Format("15:04"), recapTable, categoryLabel, signatures, detailRows}

	templateContent, err := getBAPTemplate()
	if err != nil {
		return nil, fmt.Errorf("failed to read template: %w", err)
	}

	tpl, err := template.New("bap").Funcs(template.FuncMap{
		"Label":   func(cat string) string { return categoryLabel[cat] },
		"Safe":    func(ns interface{}) string { return safeNullable(ns) },
		"SafeInt": func(ni sql.NullInt64) string { return safeNullableInt(ni) },
		"add":     func(a, b int) int { return a + b },
		"sub":     func(a, b int) int { return a - b },
		"len": func(slice interface{}) int {
			switch s := slice.(type) {
			case []BAPDetailRow:
				return len(s)
			default:
				return 0
			}
		},
		"FisikQty": func(r BAPRecapRow) int64 {
			if r.Category == "missing_assets" {
				return 0
			}
			return r.AssetCount
		},
		"DataQty": func(r BAPRecapRow) int64 {
			return r.AssetCount
		},
		"Selisih": func(r BAPRecapRow) string {
			if r.Category == "missing_assets" {
				return fmt.Sprintf("%d", r.AssetCount)
			}
			return "-"
		},
		"Satuan": func(r BAPRecapRow) string {
			return "Unit"
		},
		"upper": strings.ToUpper,
	}).Parse(templateContent)
	if err != nil {
		return nil, err
	}
	var htmlBuf bytes.Buffer
	if err := tpl.Execute(&htmlBuf, data); err != nil {
		return nil, err
	}
	pdfg, err := wkhtmltopdf.NewPDFGenerator()
	if err != nil {
		log.Printf("[REPORT] wkhtmltopdf init failed: %v", err)
		return nil, fmt.Errorf("wkhtmltopdf init failed: %w", err)
	}
	page := wkhtmltopdf.NewPageReader(bytes.NewReader(htmlBuf.Bytes()))
	page.EnableLocalFileAccess.Set(true)
	pdfg.AddPage(page)
	pdfg.Dpi.Set(96)
	pdfg.Orientation.Set(wkhtmltopdf.OrientationLandscape)
	pdfg.PageSize.Set(wkhtmltopdf.PageSizeA4)
	pdfg.MarginLeft.Set(10)
	pdfg.MarginRight.Set(10)
	pdfg.MarginTop.Set(12)
	pdfg.MarginBottom.Set(12)
	if err := pdfg.Create(); err != nil {
		log.Printf("[REPORT] wkhtmltopdf create failed: %v", err)
		return nil, fmt.Errorf("wkhtmltopdf create failed: %w", err)
	}
	log.Printf("[REPORT] PDF generated size=%d bytes session=%d", len(pdfg.Bytes()), sessionID)
	return pdfg.Bytes(), nil
}

// GenerateAndAssembleBAP gathers meta + signatures then produces PDF + filename.
func (s *Service) GenerateAndAssembleBAP(sessionID int64) ([]byte, string, error) {
	sm, err := s.repo.GetSessionMeta(sessionID)
	if err != nil || sm == nil {
		return nil, "", fmt.Errorf("session not found")
	}
	type siteMini struct{ Name, Group string }
	var siteInfo siteMini
	row := s.repo.db.QueryRow(`SELECT site_name, site_group_name FROM get_site_by_id($1)`, sm.SiteID)
	if err := row.Scan(&siteInfo.Name, &siteInfo.Group); err != nil {
		return nil, "", fmt.Errorf("site fetch failed: %w", err)
	}
	var submitterFirst, submitterLast string
	_ = s.repo.db.QueryRow(`SELECT first_name, last_name FROM get_user_by_id($1)`, sm.UserID).Scan(&submitterFirst, &submitterLast)
	submitterName := strings.TrimSpace(submitterFirst + " " + submitterLast)
	lower := strings.ToLower(sm.Status)
	var managerName, l1Name string
	if sm.ManagerReviewerID.Valid {
		var f, l string
		_ = s.repo.db.QueryRow(`SELECT first_name, last_name FROM get_user_by_id($1)`, sm.ManagerReviewerID.Int64).Scan(&f, &l)
		managerName = strings.TrimSpace(f + " " + l)
	}
	if sm.L1ReviewerID.Valid {
		var f, l string
		_ = s.repo.db.QueryRow(`SELECT first_name, last_name FROM get_user_by_id($1)`, sm.L1ReviewerID.Int64).Scan(&f, &l)
		l1Name = strings.TrimSpace(f + " " + l)
	}

	// Parse timestamps (assumed stored as text). Use Asia/Jakarta.
	loc, _ := time.LoadLocation("Asia/Jakarta")
	parseTS := func(ns sql.NullString) *time.Time {
		if !ns.Valid || strings.TrimSpace(ns.String) == "" {
			return nil
		}
		layouts := []string{"2006-01-02 15:04:05", "2006-01-02 15:04", "2006-01-02T15:04:05Z07:00"}
		for _, l := range layouts {
			if t, err := time.ParseInLocation(l, ns.String, loc); err == nil {
				return &t
			}
		}
		return nil
	}
	submitTime := parseTS(sm.EndDate) // Using EndDate as completion time
	managerTime := parseTS(sm.ManagerReviewedAt)
	l1Time := parseTS(sm.L1ReviewedAt)

	// Only include reviewer signatures if status implies review done
	if !(lower == "escalated" || lower == "verified" || lower == "rejected") {
		managerName = ""
		managerTime = nil
	}
	if !(lower == "verified" || lower == "rejected") {
		l1Name = ""
		l1Time = nil
	}

	signatures := BuildSignatures(submitterName, submitTime, managerName, managerTime, l1Name, l1Time)
	end := time.Now()
	if submitTime != nil {
		end = *submitTime
	}
	pdfBytes, err := s.GenerateBAPPDFHTML(sessionID, signatures, siteInfo.Name, siteInfo.Group, end)
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
func safeNullable(ns interface{}) string {
	switch v := ns.(type) {
	case sql.NullString:
		if v.Valid {
			return v.String
		}
		return "-"
	case *sql.NullString:
		if v != nil && v.Valid {
			return v.String
		}
		return "-"
	default:
		return "-"
	}
}
func safeNullableInt(ni sql.NullInt64) string {
	if ni.Valid {
		return fmt.Sprintf("%d", ni.Int64)
	}
	return "-"
}
func BuildSignatures(submitter string, submitTime *time.Time, manager string, managerTime *time.Time, l1 string, l1Time *time.Time) []string {
	var sigs []string
	format := func(t *time.Time) string {
		if t == nil {
			return "-"
		}
		return t.Format("2006-01-02 15:04 WIB")
	}
	if submitter != "" {
		sigs = append(sigs, fmt.Sprintf("Dilaksanakan oleh: %s – %s", submitter, format(submitTime)))
	}
	if strings.TrimSpace(manager) != "" {
		sigs = append(sigs, fmt.Sprintf("Disetujui oleh (Mgr): %s – %s", manager, format(managerTime)))
	}
	if strings.TrimSpace(l1) != "" {
		sigs = append(sigs, fmt.Sprintf("Disetujui oleh (L1): %s – %s", l1, format(l1Time)))
	}
	return sigs
}
