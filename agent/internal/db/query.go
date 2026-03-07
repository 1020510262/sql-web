package db

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	_ "github.com/jackc/pgx/v5/stdlib"
	_ "modernc.org/sqlite"

	"sql-central-console-agent/internal/config"
)

type QueryResult struct {
	Columns         []string        `json:"columns"`
	Rows            [][]interface{} `json:"rows"`
	ExecutionTimeMS int64           `json:"execution_time_ms"`
}

func Execute(profile *config.DatabaseProfile, sqlText string, selectOnly bool) (*QueryResult, error) {
	if selectOnly && !isSafeSelect(sqlText) {
		return nil, errors.New("only SELECT statements are allowed")
	}

	db, err := sql.Open(driverName(profile.Type), buildDSN(profile))
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}
	defer db.Close()

	started := time.Now()
	rows, err := db.Query(sqlText)
	if err != nil {
		return nil, fmt.Errorf("execute query: %w", err)
	}
	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		return nil, fmt.Errorf("read columns: %w", err)
	}

	resultRows := make([][]interface{}, 0)
	for rows.Next() {
		rawValues := make([]interface{}, len(columns))
		scanTargets := make([]interface{}, len(columns))
		for i := range rawValues {
			scanTargets[i] = &rawValues[i]
		}

		if err := rows.Scan(scanTargets...); err != nil {
			return nil, fmt.Errorf("scan row: %w", err)
		}

		resultRow := make([]interface{}, len(columns))
		for i, value := range rawValues {
			switch v := value.(type) {
			case []byte:
				resultRow[i] = string(v)
			default:
				resultRow[i] = v
			}
		}
		resultRows = append(resultRows, resultRow)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate rows: %w", err)
	}

	return &QueryResult{
		Columns:         columns,
		Rows:            resultRows,
		ExecutionTimeMS: time.Since(started).Milliseconds(),
	}, nil
}

func isSafeSelect(sqlText string) bool {
	normalized := strings.TrimSpace(strings.ToLower(sqlText))
	if normalized == "" {
		return false
	}
	if strings.Contains(normalized, ";") {
		normalized = strings.TrimSuffix(normalized, ";")
		if strings.Contains(normalized, ";") {
			return false
		}
	}
	return strings.HasPrefix(normalized, "select") || strings.HasPrefix(normalized, "with")
}

func driverName(dbType string) string {
	switch strings.ToLower(dbType) {
	case "mysql":
		return "mysql"
	case "postgres", "postgresql":
		return "pgx"
	case "sqlite", "sqlite3":
		return "sqlite"
	default:
		return ""
	}
}

func buildDSN(profile *config.DatabaseProfile) string {
	switch strings.ToLower(profile.Type) {
	case "mysql":
		return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?parseTime=true", profile.Username, profile.Password, profile.Host, profile.Port, profile.Database)
	case "postgres", "postgresql":
		sslMode := profile.SSLMode
		if sslMode == "" {
			sslMode = "disable"
		}
		return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s", profile.Host, profile.Port, profile.Username, profile.Password, profile.Database, sslMode)
	case "sqlite", "sqlite3":
		return profile.SQLitePath
	default:
		return ""
	}
}
