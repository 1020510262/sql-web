# SQL Central Console Architecture

## Overview

SQL Central Console is split into three trust zones:

1. Browser UI
2. Cloud Configuration Center
3. Local Agent on the user's machine

The cloud server manages identities, roles, database catalog metadata, templates, and query history. The local agent owns real connection credentials and executes SQL directly against department databases.

## Security Boundary

The following data must never pass through the cloud backend:

- database passwords
- raw database connection strings
- SQL execution traffic
- query result sets

Execution path for a query:

1. User logs into the web UI through the cloud backend.
2. Web UI fetches authorized logical databases from the backend.
3. User selects a database and writes SQL in the browser.
4. Browser sends the SQL directly to `http://127.0.0.1:17890/query`.
5. Local agent maps `database_id` to a locally stored connection profile.
6. Agent executes SQL against the target database.
7. Agent returns columns and rows directly to the browser.
8. Browser posts a history record to the cloud backend without result data.

## Components

### Frontend

- React + TypeScript + Vite
- TailwindCSS for styling
- Monaco Editor for SQL editing
- AG Grid for result rendering

### Backend

- FastAPI
- SQLAlchemy ORM
- SQLite for MVP metadata storage
- JWT authentication

Responsibilities:

- user login
- roles and permissions
- logical database registry
- SQL templates
- query history logging

### Local Agent

- Go HTTP server
- binds to `127.0.0.1:17890`
- supports MySQL, PostgreSQL, SQLite
- optional select-only protection
- local `agent-config.json` for credentials

## Logical Database Model

The backend stores only these fields for shared metadata:

- `id`
- `name`
- `type`
- `host`
- `port`
- `database_name`
- `description`

The agent stores the runtime fields locally:

- `database_id`
- `username`
- `password`
- local DSN overrides if needed

## MVP Scope

The MVP includes:

- login
- list accessible databases
- execute SQL through local agent
- display results
- record query history

## Future Extensions

- agent registration and heartbeat
- encrypted local credential storage
- SSO integration
- approval workflow for dangerous SQL
- saved query result exports
- audit alerts and masking rules
