// Contains generic helper functions to be used throughout the project

package utils

import (
	"database/sql"
	"fmt"
)

func SerializeNS(ns sql.NullString) interface{} {
	if ns.Valid {
		return ns.String
	}
	return nil
}

func SerializeNI(ni sql.NullInt64) interface{} {
	if ni.Valid {
		return ni.Int64
	}
	return nil
}

// SafeString converts nullable types to string, returning "-" for null values
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

// SafeIntString converts sql.NullInt64 to string, returning "-" for null values
func SafeIntString(nullableInt sql.NullInt64) string {
	if nullableInt.Valid {
		return fmt.Sprintf("%d", nullableInt.Int64)
	}
	return "-"
}
