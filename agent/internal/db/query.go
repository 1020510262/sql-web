package db

import (
	"database/sql"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	_ "github.com/jackc/pgx/v5/stdlib"
	_ "github.com/sijms/go-ora/v2"
	_ "modernc.org/sqlite"

	"sql-central-console-agent/internal/config"
)

type QueryResult struct {
	Columns         []string        `json:"columns"`
	Rows            [][]interface{} `json:"rows"`
	ExecutionTimeMS int64           `json:"execution_time_ms"`
}

type MultiQueryResult struct {
	Results         []QueryResult `json:"results"`
	ExecutionTimeMS int64         `json:"execution_time_ms"`
}

func Execute(profile *config.DatabaseProfile, sqlText string, _ bool) (*MultiQueryResult, error) {
	statements := splitStatements(sqlText)
	if len(statements) == 0 {
		return nil, errors.New("empty sql")
	}
	if err := ensureNoDelete(statements); err != nil {
		return nil, err
	}

	db, err := sql.Open(driverName(profile.Type), buildDSN(profile))
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}
	defer db.Close()

	totalStarted := time.Now()
	results := make([]QueryResult, 0, len(statements))
	for _, statement := range statements {
		result, err := executeStatement(db, statement)
		if err != nil {
			return nil, err
		}
		results = append(results, result)
	}

	return &MultiQueryResult{
		Results:         results,
		ExecutionTimeMS: time.Since(totalStarted).Milliseconds(),
	}, nil
}

func executeStatement(db *sql.DB, sqlText string) (QueryResult, error) {
	if isQueryStatement(sqlText) {
		return executeQuery(db, sqlText)
	}
	return executeExec(db, sqlText)
}

func executeQuery(db *sql.DB, sqlText string) (QueryResult, error) {
	started := time.Now()
	rows, err := db.Query(sqlText)
	if err != nil {
		return QueryResult{}, fmt.Errorf("execute query: %w", err)
	}
	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		return QueryResult{}, fmt.Errorf("read columns: %w", err)
	}

	resultRows := make([][]interface{}, 0)
	for rows.Next() {
		rawValues := make([]interface{}, len(columns))
		scanTargets := make([]interface{}, len(columns))
		for i := range rawValues {
			scanTargets[i] = &rawValues[i]
		}

		if err := rows.Scan(scanTargets...); err != nil {
			return QueryResult{}, fmt.Errorf("scan row: %w", err)
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
		return QueryResult{}, fmt.Errorf("iterate rows: %w", err)
	}

	return QueryResult{
		Columns:         columns,
		Rows:            resultRows,
		ExecutionTimeMS: time.Since(started).Milliseconds(),
	}, nil
}

func executeExec(db *sql.DB, sqlText string) (QueryResult, error) {
	started := time.Now()
	result, err := db.Exec(sqlText)
	if err != nil {
		return QueryResult{}, fmt.Errorf("execute statement: %w", err)
	}
	affected, _ := result.RowsAffected()
	return QueryResult{
		Columns:         []string{"rows_affected"},
		Rows:            [][]interface{}{{affected}},
		ExecutionTimeMS: time.Since(started).Milliseconds(),
	}, nil
}

func isQueryStatement(sqlText string) bool {
	normalized := strings.TrimSpace(strings.ToLower(sqlText))
	if normalized == "" {
		return false
	}
	return strings.HasPrefix(normalized, "select") ||
		strings.HasPrefix(normalized, "with") ||
		strings.HasPrefix(normalized, "show") ||
		strings.HasPrefix(normalized, "describe") ||
		strings.HasPrefix(normalized, "desc") ||
		strings.HasPrefix(normalized, "explain")
}

func driverName(dbType string) string {
	switch strings.ToLower(dbType) {
	case "mysql":
		return "mysql"
	case "postgres", "postgresql":
		return "pgx"
	case "oracle":
		return "oracle"
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
	case "oracle":
		return fmt.Sprintf("oracle://%s:%s@%s:%d/%s", profile.Username, profile.Password, profile.Host, profile.Port, profile.Database)
	case "sqlite", "sqlite3":
		return profile.SQLitePath
	default:
		return ""
	}
}

func splitStatements(sqlText string) []string {
	var statements []string
	var current strings.Builder

	inSingle := false
	inDouble := false
	inBacktick := false
	inLineComment := false
	inBlockComment := false

	runes := []rune(sqlText)
	for i := 0; i < len(runes); i++ {
		ch := runes[i]
		next := rune(0)
		if i+1 < len(runes) {
			next = runes[i+1]
		}

		if inLineComment {
			if ch == '\n' {
				inLineComment = false
			}
			continue
		}
		if inBlockComment {
			if ch == '*' && next == '/' {
				inBlockComment = false
				i++
			}
			continue
		}

		if !inSingle && !inDouble && !inBacktick {
			if ch == '-' && next == '-' {
				inLineComment = true
				i++
				continue
			}
			if ch == '/' && next == '*' {
				inBlockComment = true
				i++
				continue
			}
		}

		switch ch {
		case '\'':
			if !inDouble && !inBacktick {
				inSingle = !inSingle
			}
		case '"':
			if !inSingle && !inBacktick {
				inDouble = !inDouble
			}
		case '`':
			if !inSingle && !inDouble {
				inBacktick = !inBacktick
			}
		case ';':
			if !inSingle && !inDouble && !inBacktick {
				statement := strings.TrimSpace(current.String())
				if statement != "" {
					statements = append(statements, statement)
				}
				current.Reset()
				continue
			}
		}

		current.WriteRune(ch)
	}

	if trailing := strings.TrimSpace(current.String()); trailing != "" {
		statements = append(statements, trailing)
	}

	return statements
}

func ensureNoDelete(statements []string) error {
	for _, statement := range statements {
		if containsDeleteKeyword(statement) {
			return errors.New("DELETE statements are not allowed")
		}
	}
	return nil
}

var deleteRegex = regexp.MustCompile(`\bdelete\b`)

func containsDeleteKeyword(statement string) bool {
	inSingle := false
	inDouble := false
	inBacktick := false
	var token strings.Builder
	runes := []rune(statement)

	flush := func() bool {
		if token.Len() == 0 {
			return false
		}
		if deleteRegex.MatchString(strings.ToLower(token.String())) {
			return true
		}
		token.Reset()
		return false
	}

	for _, ch := range runes {
		switch ch {
		case '\'':
			if !inDouble && !inBacktick {
				inSingle = !inSingle
				if flush() {
					return true
				}
			}
		case '"':
			if !inSingle && !inBacktick {
				inDouble = !inDouble
				if flush() {
					return true
				}
			}
		case '`':
			if !inSingle && !inDouble {
				inBacktick = !inBacktick
				if flush() {
					return true
				}
			}
		default:
			if inSingle || inDouble || inBacktick {
				continue
			}
			if (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') {
				token.WriteRune(ch)
			} else {
				if flush() {
					return true
				}
			}
		}
	}
	return flush()
}
