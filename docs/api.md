# API Specification

## Cloud Backend API

### POST /api/auth/login
Request:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

Response:
```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "admin",
    "full_name": "System Administrator",
    "role": "admin"
  }
}
```

### GET /api/databases
Returns authorized logical databases for the current user.

### GET /api/templates
Returns SQL templates visible to the current user.

### POST /api/history
Request:
```json
{
  "database_id": 1,
  "sql": "SELECT * FROM demo_users",
  "execution_time_ms": 18,
  "status": "success"
}
```

### GET /api/history
Returns recent query history for current user.

## Local Agent API

### GET /health
Response:
```json
{
  "status": "ok"
}
```

### POST /query
Request:
```json
{
  "database_id": "1",
  "sql": "SELECT * FROM demo_users LIMIT 10"
}
```

Response:
```json
{
  "columns": ["id", "name", "email"],
  "rows": [
    [1, "Alice", "alice@example.com"]
  ],
  "execution_time_ms": 10
}
```
