package config

import (
	"encoding/json"
	"fmt"
	"os"
	"sort"
)

type AppConfig struct {
	Port             int               `json:"port"`
	SelectOnly       bool              `json:"select_only"`
	AllowedOrigins   []string          `json:"allowed_origins"`
	DatabaseProfiles []DatabaseProfile `json:"database_profiles"`
	path             string
}

type DatabaseProfile struct {
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

func Load(path string) (*AppConfig, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read config: %w", err)
	}

	var cfg AppConfig
	if err := json.Unmarshal(content, &cfg); err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}

	if cfg.Port == 0 {
		cfg.Port = 17890
	}
	if len(cfg.AllowedOrigins) == 0 {
		cfg.AllowedOrigins = []string{"http://localhost:5173"}
	}
	cfg.path = path

	return &cfg, nil
}

func (c *AppConfig) FindProfile(databaseID string) *DatabaseProfile {
	for _, profile := range c.DatabaseProfiles {
		if profile.DatabaseID == databaseID {
			copy := profile
			return &copy
		}
	}
	return nil
}

func (c *AppConfig) UpsertProfile(profile DatabaseProfile) error {
	for index, existing := range c.DatabaseProfiles {
		if existing.DatabaseID == profile.DatabaseID {
			c.DatabaseProfiles[index] = profile
			return c.Save()
		}
	}
	c.DatabaseProfiles = append(c.DatabaseProfiles, profile)
	sort.Slice(c.DatabaseProfiles, func(i, j int) bool {
		return c.DatabaseProfiles[i].DatabaseID < c.DatabaseProfiles[j].DatabaseID
	})
	return c.Save()
}

func (c *AppConfig) DeleteProfile(databaseID string) error {
	filtered := make([]DatabaseProfile, 0, len(c.DatabaseProfiles))
	for _, profile := range c.DatabaseProfiles {
		if profile.DatabaseID != databaseID {
			filtered = append(filtered, profile)
		}
	}
	c.DatabaseProfiles = filtered
	return c.Save()
}

func (c *AppConfig) Save() error {
	content, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal config: %w", err)
	}
	content = append(content, '\n')
	if err := os.WriteFile(c.path, content, 0o600); err != nil {
		return fmt.Errorf("write config: %w", err)
	}
	return nil
}
