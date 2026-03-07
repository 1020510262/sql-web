package httpserver

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"sync"

	"github.com/gorilla/mux"

	"sql-central-console-agent/internal/config"
	"sql-central-console-agent/internal/db"
)

type queryRequest struct {
	DatabaseID string `json:"database_id"`
	SQL        string `json:"sql"`
}

type connectionUpsertRequest struct {
	DatabaseID string `json:"database_id"`
	Type       string `json:"type"`
	Host       string `json:"host"`
	Port       int    `json:"port"`
	Database   string `json:"database"`
	Username   string `json:"username"`
	Password   string `json:"password"`
	SQLitePath string `json:"sqlite_path"`
	SSLMode    string `json:"ssl_mode"`
}

type connectionSummary struct {
	DatabaseID string `json:"database_id"`
	Type       string `json:"type"`
	Host       string `json:"host"`
	Port       int    `json:"port"`
	Database   string `json:"database"`
	Username   string `json:"username"`
	HasPassword bool  `json:"has_password"`
	SQLitePath string `json:"sqlite_path,omitempty"`
	SSLMode    string `json:"ssl_mode,omitempty"`
}

type Server struct {
	config *config.AppConfig
	mu     sync.Mutex
}

func New(cfg *config.AppConfig) *Server {
	return &Server{config: cfg}
}

func (s *Server) Router() http.Handler {
	r := mux.NewRouter()
	r.Use(s.corsMiddleware)
	r.HandleFunc("/health", s.handleHealth).Methods(http.MethodGet, http.MethodOptions)
	r.HandleFunc("/query", s.handleQuery).Methods(http.MethodPost, http.MethodOptions)
	r.HandleFunc("/connections", s.handleListConnections).Methods(http.MethodGet, http.MethodOptions)
	r.HandleFunc("/connections/{database_id}", s.handleGetConnection).Methods(http.MethodGet, http.MethodOptions)
	r.HandleFunc("/connections/upsert", s.handleUpsertConnection).Methods(http.MethodPost, http.MethodOptions)
	r.HandleFunc("/connections/{database_id}", s.handleDeleteConnection).Methods(http.MethodDelete, http.MethodOptions)
	return r
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleQuery(w http.ResponseWriter, r *http.Request) {
	var payload queryRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	profile := s.config.FindProfile(payload.DatabaseID)
	if profile == nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "database profile not found in local agent config"})
		return
	}

	result, err := db.Execute(profile, payload.SQL, s.config.SelectOnly)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (s *Server) handleListConnections(w http.ResponseWriter, _ *http.Request) {
	summaries := make([]connectionSummary, 0, len(s.config.DatabaseProfiles))
	for _, profile := range s.config.DatabaseProfiles {
		summaries = append(summaries, summarizeProfile(profile))
	}
	writeJSON(w, http.StatusOK, summaries)
}

func (s *Server) handleGetConnection(w http.ResponseWriter, r *http.Request) {
	databaseID := mux.Vars(r)["database_id"]
	profile := s.config.FindProfile(databaseID)
	if profile == nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "local credential not found"})
		return
	}
	writeJSON(w, http.StatusOK, summarizeProfile(*profile))
}

func (s *Server) handleUpsertConnection(w http.ResponseWriter, r *http.Request) {
	var payload connectionUpsertRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}
	if payload.DatabaseID == "" || payload.Type == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "database_id and type are required"})
		return
	}
	if payload.Type != "sqlite" && payload.Password == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "password is required for network databases"})
		return
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	profile := config.DatabaseProfile{
		DatabaseID: payload.DatabaseID,
		Type:       payload.Type,
		Host:       payload.Host,
		Port:       payload.Port,
		Database:   payload.Database,
		Username:   payload.Username,
		Password:   payload.Password,
		SQLitePath: payload.SQLitePath,
		SSLMode:    payload.SSLMode,
	}
	if err := s.config.UpsertProfile(profile); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, summarizeProfile(profile))
}

func (s *Server) handleDeleteConnection(w http.ResponseWriter, r *http.Request) {
	databaseID := mux.Vars(r)["database_id"]
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.config.DeleteProfile(databaseID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func summarizeProfile(profile config.DatabaseProfile) connectionSummary {
	return connectionSummary{
		DatabaseID: profile.DatabaseID,
		Type: profile.Type,
		Host: profile.Host,
		Port: profile.Port,
		Database: profile.Database,
		Username: profile.Username,
		HasPassword: profile.Password != "",
		SQLitePath: profile.SQLitePath,
		SSLMode: profile.SSLMode,
	}
}

func (s *Server) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		for _, allowed := range s.config.AllowedOrigins {
			if origin == allowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				break
			}
		}
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Private-Network", "true")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("write response failed: %v", err)
	}
}

func Start(cfg *config.AppConfig) error {
	server := New(cfg)
	addr := "127.0.0.1:" + strconv.Itoa(cfg.Port)
	log.Printf("local agent listening on %s", addr)
	return http.ListenAndServe(addr, server.Router())
}
