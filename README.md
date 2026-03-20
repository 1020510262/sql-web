# SQL Central Console

SQL Central Console is an internal web platform for querying approved internal databases from a browser.

The system uses a split architecture:

- Cloud side: frontend + backend configuration center
- Local side: Windows Agent running on the user's machine

Critical rule:

- Database passwords do not go through the cloud backend
- SQL execution does not go through the cloud backend
- Query execution is always: browser -> local agent -> database

## Architecture

```text
Browser UI
  ├─ HTTPS -> Cloud Frontend / Backend
  │            ├─ login / auth
  │            ├─ users / roles / permissions
  │            ├─ database metadata
  │            ├─ SQL statements library
  │            └─ query audit history
  │
  └─ HTTP -> Local Agent (127.0.0.1:17890)
               ├─ local credential storage
               ├─ SQL execution
               └─ direct database connection
```

## Current Feature Set

### User side
- Login
- Database list with grouping and search
- SQL editor
- Query results table
- Query audit history
- Cloud SQL statement library
- Language switch: English / Simplified Chinese

### Admin side
- Add users
- Add / edit / disable databases
- Disabled databases are not physically deleted

### Local Agent side
- Save local credentials on the current device only
- Execute SQL locally
- Clear local credentials when a cloud database is disabled from the UI

## Repository Structure

```text
sql-web/
  agent/                  Go local agent
  backend/                FastAPI backend
  frontend/               React + Vite frontend
  docs/                   Architecture / API / schema docs
  examples/               Example config and demo DB
  README.md
```

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- TailwindCSS
- Monaco Editor
- AG Grid

### Backend
- Python
- FastAPI
- SQLAlchemy
- SQLite for current metadata store

### Agent
- Go
- Local HTTP server on `127.0.0.1:17890`
- MySQL / PostgreSQL / SQLite drivers

## Local Development

### 1. Start backend

```bash
cd /Volumes/外置存储/codex/sql-web/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
PYTHONPATH=. python scripts/seed.py
uvicorn app.main:app --reload --port 8000
```

### 2. Start frontend

```bash
cd /Volumes/外置存储/codex/sql-web/frontend
. "$HOME/.nvm/nvm.sh"
npm install
cp .env.example .env
npm run dev
```

### 3. Start local agent

```bash
cd /Volumes/外置存储/codex/sql-web/agent
go run ./cmd/agent -config ./agent-config.json
```

If you do not already have a runtime config file:

```bash
cp /Volumes/外置存储/codex/sql-web/examples/agent-config.json /Volumes/外置存储/codex/sql-web/agent/agent-config.json
```

## Production Deployment Overview

Production deployment is split into two completely separate parts:

1. Deploy cloud services to the server
2. Package and distribute the Windows Agent separately

### Cloud server deploys
- Frontend static site
- Backend API
- Backend metadata database

### User machine deploys
- Windows Agent executable
- Local agent config and local credentials

## Production Deployment To Server

Recommended target:

- OS: Ubuntu 22.04 or 24.04
- Reverse proxy: Nginx
- Backend process manager: systemd
- TLS: Let's Encrypt
- Metadata database:
  - current project supports SQLite immediately
  - production recommendation is PostgreSQL later

## Server Deployment Example

Assume:

- domain: `sql-console.example.com`
- app root: `/opt/sql-central-console`
- frontend static root: `/var/www/sql-central-console`
- backend port: `127.0.0.1:8000`

### 1. Prepare server directories

```bash
sudo mkdir -p /opt/sql-central-console
sudo mkdir -p /var/www/sql-central-console
sudo chown -R $USER /opt/sql-central-console
sudo chown -R $USER /var/www/sql-central-console
```

### 2. Upload project code

Example using git:

```bash
cd /opt/sql-central-console
git clone <your-repo-url> .
```

Or upload project files manually to `/opt/sql-central-console`.

### 3. Backend deployment

```bash
cd /opt/sql-central-console/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env`:

```env
SECRET_KEY=replace-with-a-long-random-secret
DATABASE_URL=sqlite:///./sql_central_console.db
CORS_ORIGINS=https://sql-console.example.com
```

Initialize metadata DB:

```bash
PYTHONPATH=. python scripts/seed.py
```

### 4. Backend systemd service

Create `/etc/systemd/system/sql-central-console-api.service`

```ini
[Unit]
Description=SQL Central Console API
After=network.target

[Service]
User=www-data
WorkingDirectory=/opt/sql-central-console/backend
Environment="PYTHONPATH=/opt/sql-central-console/backend"
ExecStart=/opt/sql-central-console/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable sql-central-console-api
sudo systemctl start sql-central-console-api
sudo systemctl status sql-central-console-api
```

### 5. Frontend build

```bash
cd /opt/sql-central-console/frontend
. "$HOME/.nvm/nvm.sh"
npm install
```

Create `.env.production`:

```env
VITE_API_BASE=https://sql-console.example.com
VITE_AGENT_BASE=http://127.0.0.1:17890
```

Build frontend:

```bash
. "$HOME/.nvm/nvm.sh"
npm run build
rm -rf /var/www/sql-central-console/*
cp -R dist/* /var/www/sql-central-console/
```

Important:

- `VITE_AGENT_BASE` must stay as `http://127.0.0.1:17890`
- Do not point agent traffic to the server
- The browser must talk directly to the local agent on the user's machine

### 6. Nginx configuration

Example `/etc/nginx/sites-available/sql-central-console`

```nginx
server {
    listen 80;
    server_name sql-console.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sql-console.example.com;

    ssl_certificate /etc/letsencrypt/live/sql-console.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sql-console.example.com/privkey.pem;

    root /var/www/sql-central-console;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:8000/health;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/sql-central-console /etc/nginx/sites-enabled/sql-central-console
sudo nginx -t
sudo systemctl reload nginx
```

### 7. TLS certificate

Example with certbot:

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d sql-console.example.com
```

## Windows Agent Packaging

The Windows Agent is packaged locally by you and distributed to users separately.

### Build Windows executable

Run on a machine with Go installed:

```bash
cd /Volumes/外置存储/codex/sql-web/agent
GOOS=windows GOARCH=amd64 go build -o sql-central-agent.exe ./cmd/agent
```

If you need 32-bit or ARM builds, build them separately.

### Runtime files to distribute

At minimum:

- `sql-central-agent.exe`
- `agent-config.json` (or generate it on first run)

### Recommended Windows runtime behavior

- Agent listens only on `127.0.0.1:17890`
- CORS whitelist should include your production frontend domain
- Local credentials should remain on the user device only

Example `agent-config.json`:

```json
{
  "port": 17890,
  "select_only": true,
  "allowed_origins": [
    "https://sql-console.example.com"
  ],
  "database_profiles": []
}
```

This is enough because:

- cloud database metadata comes from backend
- the frontend sends password directly to agent
- agent writes local credentials into its local config file

## Actual Production Flow

### Login
1. User opens `https://sql-console.example.com`
2. User enters username and password in the frontend
3. Frontend calls backend for authentication
4. Backend returns token and allowed database metadata

### First-time database use
1. User selects a database
2. If local agent has no credential for that `database_id`, frontend prompts for password
3. Frontend sends password directly to `http://127.0.0.1:17890`
4. Agent saves the password locally
5. Backend never receives the database password

### Query execution
1. User writes SQL in the browser
2. Browser sends SQL directly to local agent
3. Local agent executes SQL against the target database
4. Local agent returns results directly to browser
5. Browser sends audit history to backend without result rows

## Deployment Checklist

### Cloud side
- [ ] Backend `.env` configured
- [ ] Backend service running through systemd
- [ ] Frontend built and copied to Nginx root
- [ ] Nginx configured
- [ ] HTTPS certificate installed
- [ ] Domain resolves correctly

### Agent side
- [ ] Windows executable built
- [ ] Agent config prepared
- [ ] Production frontend domain added to `allowed_origins`
- [ ] Agent starts successfully on user machine
- [ ] Agent listens only on `127.0.0.1:17890`

## Important Security Notes

- Do not proxy SQL execution through the cloud backend
- Do not store database passwords in backend tables
- Do not change frontend production config to send agent traffic to the server
- Keep agent bound to localhost only
- Treat backend metadata DB as configuration data, not execution data

## Updating The System

### Update backend

```bash
cd /opt/sql-central-console
git pull
cd backend
source .venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart sql-central-console-api
```

### Update frontend

```bash
cd /opt/sql-central-console/frontend
. "$HOME/.nvm/nvm.sh"
npm install
npm run build
rm -rf /var/www/sql-central-console/*
cp -R dist/* /var/www/sql-central-console/
sudo systemctl reload nginx
```

### Update Windows Agent

- Rebuild `sql-central-agent.exe`
- Redistribute the executable to users
- Keep the user's local credential file if you want existing local passwords to remain usable

## Useful Commands

### Backend status

```bash
sudo systemctl status sql-central-console-api
journalctl -u sql-central-console-api -f
```

### Nginx status

```bash
sudo nginx -t
sudo systemctl status nginx
```

### Manual recovery: re-enable a disabled database

Disabled databases are not deleted. If needed, re-enable one directly in the backend metadata DB:

```bash
cd /opt/sql-central-console/backend
sqlite3 sql_central_console.db "UPDATE databases SET is_active = 1 WHERE id = <database_id>;"
```

## Current Limitations

- Backend metadata store is still SQLite in this repository
- Local agent credentials are still stored in local config rather than OS-native secure storage
- Large frontend bundle should be split later

## Recommended Next Steps

1. Move backend metadata DB from SQLite to PostgreSQL
2. Encrypt or OS-protect local agent credential storage on Windows
3. Add statement edit/delete and search
4. Add role-based database permission assignment UI

## Migrate SQLite Data to PostgreSQL

If you are switching the metadata store from SQLite to PostgreSQL, use the migration script below.
This will truncate the destination PostgreSQL tables and then copy all data from SQLite.

```bash
cd /opt/sql-central-console/backend
source .venv/bin/activate
export SQLITE_DATABASE_URL=sqlite:///./sql_central_console.db
export DATABASE_URL=postgresql+psycopg://sql_console:replace-this-password@127.0.0.1:5432/sql_central_console
PYTHONPATH=. python scripts/migrate_sqlite_to_postgres.py
```

Then update your `.env` on the server to point to PostgreSQL and restart the API service.
