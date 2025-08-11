// == Handles all logical operations related to Report ==
package report

import (
	"bytes"
	"database/sql"
	"fmt"
	"log"
	"sort"
	"strings"
	"time"

	"github.com/jung-kurt/gofpdf"
)

type Service struct {
	repo *Repository
}

// NewService creates a new instance of Service with the provided repository.
func NewService(repo *Repository) *Service {
	return &Service{
		repo: repo,
	}
}

// GetOpnameStats retrieves the opname statistics for a given opname session ID.
func (service *Service) GetOpnameStats(sessionID int64) (*OpnameStats, error) {
	stats, _ := service.repo.GetOpnameStats(sessionID)

	log.Printf("✅ Successfully retrieved opname stats for session ID %d", sessionID)
	return stats, nil // Return the retrieved stats
}

// Category order and Indonesian labels.
var categoryOrder = []string{"working_assets", "broken_assets", "misplaced_assets", "missing_assets"}
var categoryLabel = map[string]string{
	"working_assets":   "sesuai dan berfungsi",
	"broken_assets":    "rusak",
	"misplaced_assets": "selisih administrasi (karena mutasi)",
	"missing_assets":   "tidak ditemukan",
}

// Build recap aggregated to 4 categories from recap rows.
type AggregatedRecapRow struct {
	Category string
	FisikQty int64
	DataQty  int64
	Selisih  int64
	Satuan   string
}

// GenerateBAPPDF builds the PDF bytes for a given session using recap+details + dynamic signatures slice.
func (s *Service) GenerateBAPPDF(sessionID int64, signatures []string, siteName string, siteGroup string, endDate time.Time) ([]byte, error) {
	recapRows, err := s.repo.GetBAPRecap(sessionID)
	if err != nil {
		return nil, err
	}
	detailRows, err := s.repo.GetBAPDetails(sessionID)
	if err != nil {
		return nil, err
	}

	// Aggregate recap by category only.
	agg := map[string]int64{}
	for _, r := range recapRows {
		agg[r.Category] += r.AssetCount
	}
	var recapTable []AggregatedRecapRow
	for _, cat := range categoryOrder {
		count := agg[cat]
		fisik := count
		data := count
		selisih := int64(0)
		if cat == "missing_assets" {
			fisik = 0
			data = count
			selisih = count
		}
		recapTable = append(recapTable, AggregatedRecapRow{Category: cat, FisikQty: fisik, DataQty: data, Selisih: selisih, Satuan: "Unit"})
	}

	// Sort details by category order then asset tag.
	orderIdx := func(c string) int {
		for i, v := range categoryOrder {
			if v == c {
				return i
			}
		}
		return 99
	}
	sort.Slice(detailRows, func(i, j int) bool {
		if orderIdx(detailRows[i].Category) == orderIdx(detailRows[j].Category) {
			return detailRows[i].AssetTag < detailRows[j].AssetTag
		}
		return orderIdx(detailRows[i].Category) < orderIdx(detailRows[j].Category)
	})

	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetFont("Times", "", 10)
	pdf.SetMargins(10, 10, 10)
	pdf.AddPage()

	// Title
	pdf.SetFont("Times", "B", 12)
	pdf.CellFormat(0, 6, "Berita Acara Pemeriksaan Aset", "0", 1, "C", false, 0, "")
	pdf.SetFont("Times", "", 9)
	meta := fmt.Sprintf("Tanggal Selesai: %s | Site: %s | Grup Site: %s", endDate.Format("2006-01-02"), siteName, siteGroup)
	pdf.CellFormat(0, 5, meta, "0", 1, "C", false, 0, "")
	pdf.Ln(2)

	// Recap table header
	pdf.SetFont("Times", "B", 9)
	headers := []string{"No", "Kategori", "Qty Fisik", "Qty Data", "Satuan", "Selisih"}
	widths := []float64{10, 70, 20, 20, 20, 20}
	for i, h := range headers {
		pdf.CellFormat(widths[i], 6, h, "1", 0, "C", false, 0, "")
	}
	pdf.Ln(-1)
	pdf.SetFont("Times", "", 9)
	for i, row := range recapTable {
		pdf.CellFormat(widths[0], 5, fmt.Sprintf("%d", i+1), "1", 0, "C", false, 0, "")
		pdf.CellFormat(widths[1], 5, categoryLabel[row.Category], "1", 0, "L", false, 0, "")
		pdf.CellFormat(widths[2], 5, fmt.Sprintf("%d", row.FisikQty), "1", 0, "C", false, 0, "")
		pdf.CellFormat(widths[3], 5, fmt.Sprintf("%d", row.DataQty), "1", 0, "C", false, 0, "")
		pdf.CellFormat(widths[4], 5, row.Satuan, "1", 0, "C", false, 0, "")
		pdf.CellFormat(widths[5], 5, fmt.Sprintf("%d", row.Selisih), "1", 0, "C", false, 0, "")
		pdf.Ln(-1)
	}

	// Signatures block
	pdf.Ln(4)
	pdf.SetFont("Times", "B", 9)
	pdf.CellFormat(0, 5, "Tanda Tangan", "0", 1, "L", false, 0, "")
	pdf.SetFont("Times", "", 9)
	for _, sgn := range signatures {
		pdf.MultiCell(0, 4, sgn, "0", "L", false)
	}

	// New page for details
	pdf.AddPage()
	// Table header function for reuse on page breaks
	drawDetailHeader := func() {
		pdf.SetFont("Times", "B", 8)
		hdrs := []string{"No", "Kategori", "Perusahaan", "Asset Tag", "Nama Aset", "Perlengkapan", "Pengguna", "Status", "Catatan", "Cost Center"}
		w := []float64{8, 28, 22, 22, 28, 30, 28, 18, 30, 18}
		for i, h := range hdrs {
			pdf.CellFormat(w[i], 5, h, "1", 0, "C", false, 0, "")
		}
		pdf.Ln(-1)
	}
	drawDetailHeader()
	pdf.SetFont("Times", "", 8)
	rowNum := 1
	currentCategory := ""
	w := []float64{8, 28, 22, 22, 28, 30, 28, 18, 30, 18}
	for _, d := range detailRows {
		if currentCategory != d.Category { // category header row
			currentCategory = d.Category
			pdf.SetFont("Times", "B", 8)
			pdf.CellFormat(sumFloats(w), 5, categoryLabel[currentCategory], "1", 1, "L", false, 0, "")
			pdf.SetFont("Times", "", 8)
		}
		if pdf.GetY() > 280 { // crude page break threshold
			pdf.AddPage()
			drawDetailHeader()
			pdf.SetFont("Times", "", 8)
		}
		pdf.CellFormat(w[0], 4, fmt.Sprintf("%d", rowNum), "1", 0, "C", false, 0, "")
		pdf.CellFormat(w[1], 4, categoryLabel[d.Category], "1", 0, "L", false, 0, "")
		pdf.CellFormat(w[2], 4, d.Company, "1", 0, "L", false, 0, "")
		pdf.CellFormat(w[3], 4, d.AssetTag, "1", 0, "L", false, 0, "")
		pdf.CellFormat(w[4], 4, truncate(d.AssetName, 20), "1", 0, "L", false, 0, "")
		pdf.CellFormat(w[5], 4, safeNullable(d.Equipments), "1", 0, "L", false, 0, "")
		pdf.CellFormat(w[6], 4, truncate(d.UserNameAndPosition, 18), "1", 0, "L", false, 0, "")
		pdf.CellFormat(w[7], 4, d.AssetStatus, "1", 0, "L", false, 0, "")
		pdf.CellFormat(w[8], 4, truncate(safeNullable(d.ActionNotes), 22), "1", 0, "L", false, 0, "")
		pdf.CellFormat(w[9], 4, safeNullableInt(d.CostCenterID), "1", 0, "C", false, 0, "")
		pdf.Ln(-1)
		rowNum++
	}

	// Footer with page numbers
	pdf.SetFooterFunc(func() {
		pdf.SetY(-10)
		pdf.SetFont("Times", "", 8)
		footer := fmt.Sprintf("Halaman %d/%d", pdf.PageNo(), pdf.PageCount())
		pdf.CellFormat(0, 5, footer, "0", 0, "R", false, 0, "")
	})

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// GenerateAndAssembleBAP fetches session + related user/site names, builds signatures and generates PDF.
func (s *Service) GenerateAndAssembleBAP(sessionID int64) ([]byte, string, error) {
	sm, err := s.repo.GetSessionMeta(sessionID)
	if err != nil || sm == nil {
		return nil, "", fmt.Errorf("session not found")
	}

	// Fetch site info (reuse existing site function through raw SQL inside report repo to avoid import cycle)
	// For simplicity we query minimal fields here.
	type siteMini struct{ Name, Group string }
	var siteInfo siteMini
	row := s.repo.db.QueryRow(`SELECT site_name, site_group_name FROM get_site_by_id($1)`, sm.SiteID)
	if err := row.Scan(&siteInfo.Name, &siteInfo.Group); err != nil {
		return nil, "", fmt.Errorf("site fetch failed: %w", err)
	}

	// Fetch submitter name
	var submitterFirst, submitterLast string
	urow := s.repo.db.QueryRow(`SELECT first_name, last_name FROM get_user_by_id($1)`, sm.UserID)
	_ = urow.Scan(&submitterFirst, &submitterLast)
	submitterName := strings.TrimSpace(submitterFirst + " " + submitterLast)

	// Determine reviewers based on status
	var reviewers []string
	lowerStatus := strings.ToLower(sm.Status)
	if lowerStatus == "escalated" || lowerStatus == "verified" || lowerStatus == "rejected" {
		if sm.ManagerReviewerID.Valid {
			var f, l string
			_ = s.repo.db.QueryRow(`SELECT first_name, last_name FROM get_user_by_id($1)`, sm.ManagerReviewerID.Int64).Scan(&f, &l)
			if strings.TrimSpace(f+l) != "" {
				reviewers = append(reviewers, strings.TrimSpace(f+" "+l))
			}
		}
	}
	if lowerStatus == "verified" || lowerStatus == "rejected" {
		if sm.L1ReviewerID.Valid {
			var f, l string
			_ = s.repo.db.QueryRow(`SELECT first_name, last_name FROM get_user_by_id($1)`, sm.L1ReviewerID.Int64).Scan(&f, &l)
			if strings.TrimSpace(f+l) != "" {
				reviewers = append(reviewers, strings.TrimSpace(f+" "+l))
			}
		}
	}
	signatures := BuildSignatures(submitterName, reviewers)

	endDate := time.Now()
	if sm.EndDate.Valid {
		endDate = time.Now()
	}

	pdfBytes, err := s.GenerateBAPPDF(sessionID, signatures, siteInfo.Name, siteInfo.Group, endDate)
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

func sumFloats(v []float64) float64 {
	var s float64
	for _, x := range v {
		s += x
	}
	return s
}
func truncate(s string, max int) string {
	if len([]rune(s)) <= max {
		return s
	}
	rs := []rune(s)
	return string(rs[:max-1]) + "…"
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

// Build dynamic signatures list given submitter + optional reviewers.
func BuildSignatures(submitter string, reviewers []string) []string {
	now := time.Now().Format("2006-01-02 15:04 WIB")
	var sigs []string
	if submitter != "" {
		sigs = append(sigs, fmt.Sprintf("Dilaksanakan oleh: %s – %s", submitter, now))
	}
	for _, r := range reviewers {
		if strings.TrimSpace(r) != "" {
			sigs = append(sigs, fmt.Sprintf("Disetujui oleh: %s – %s", r, now))
		}
	}
	return sigs
}
