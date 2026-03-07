package main

import (
	"flag"
	"log"

	"sql-central-console-agent/internal/config"
	"sql-central-console-agent/internal/httpserver"
)

func main() {
	configPath := flag.String("config", "./agent-config.json", "Path to the local agent config file")
	flag.Parse()

	cfg, err := config.Load(*configPath)
	if err != nil {
		log.Fatalf("load config failed: %v", err)
	}

	if err := httpserver.Start(cfg); err != nil {
		log.Fatalf("agent server stopped: %v", err)
	}
}
