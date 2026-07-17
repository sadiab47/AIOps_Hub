# 05 API Specification

Our API endpoints reside behind the versioned prefix `/api/v1`.

## Authentication

### POST `/api/v1/auth/register`
Creates a new User account.

### POST `/api/v1/auth/login`
Validates user credentials and issues session cookies.

### POST `/api/v1/auth/logout`
Clears session cookies.

---

## Organizations

### GET `/api/v1/organizations`
Lists organizations the authenticated user belongs to.

### POST `/api/v1/organizations`
Creates a new organization.

---

## Health

### GET `/api/v1/health`
Returns system status checks (Database and Cache checks).
