// Generic helper functions for nullable SQL types and safe conversions.
package utils

import (
	"database/sql"
	"errors"
	"fmt"
	"strconv"
)

// SerializeNS converts sql.NullString to either its string value or nil.
func SerializeNS(ns sql.NullString) interface{} {
	if ns.Valid {
		return ns.String
	}
	return nil
}

// SerializeNI converts sql.NullInt64 to either its int64 value or nil.
func SerializeNI(ni sql.NullInt64) interface{} {
	if ni.Valid {
		return ni.Int64
	}
	return nil
}

// SafeString returns the underlying string or "-" if null/invalid.
func SafeString(nullable interface{}) string {
	switch cast := nullable.(type) {
	case string:
		return cast
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

// SafeIntString returns the int64 as string or "-" if null.
func SafeIntString(nullableInt sql.NullInt64) string {
	if nullableInt.Valid {
		return fmt.Sprintf("%d", nullableInt.Int64)
	}
	return "-"
}

// Helper function to parse nullable integers
func ParseNullableInt(nullableInt *int) sql.NullInt64 {
	// If non-nil and positive...
	if nullableInt != nil && *nullableInt > 0 {
		return sql.NullInt64{Int64: int64(*nullableInt), Valid: true}
	}
	return sql.NullInt64{Valid: false}
}

// Helper function to parse optional query params for location requests (site and dept id)
func ParseLocationParams(siteIDParam, deptIDParam string) (siteID *int, deptID *int, err error) {
	// Read optional query params: /api/opname/location?site_id=1&dept_id=2
	if siteIDParam != "" {
		if parsedSiteID, err := strconv.Atoi(siteIDParam); err != nil {
			return nil, nil, errors.New("invalid site_id, must be an integer: " + err.Error())
		} else {
			siteID = &parsedSiteID
		}
	}

	if deptIDParam != "" {
		if parsedDeptID, err := strconv.Atoi(deptIDParam); err != nil {
			return nil, nil, errors.New("invalid dept_id, must be an integer: " + err.Error())
		} else {
			deptID = &parsedDeptID
		}
	}

	if siteID == nil && deptID == nil {
		return nil, nil, errors.New("at least one of site_id or dept_id must be provided")
	}

	return siteID, deptID, nil
}
