# CLAUDE.md

## Project overview

**agendate** is a multi-role appointment scheduling web app. Three roles:
- **proveedor** — business/professional offering services (configures services + availability)
- **cliente** — end user who books appointments
- **admin** — platform oversight

Production URL: `https://agendate.app`

## Stack

Same as lote.coffee:
- **Frontend**: Vite 6 + React 18 + TypeScript, Tailwind CSS v4, TanStack Query, React Router v6, `sonner` for toasts
- **Backend**: PHP 5.6 (XAMPP locally), each endpoint is a standalone `.php` file
- **Database**: MariaDB/MySQL, raw PDO, no ORM — DB name is `agendate`
- No ORM, no framework

## Commands

```bash
npm run dev     # Vite dev server on :8081
npm run build   # Production build → dist/
npm run lint    # ESLint
```

XAMPP must be running. MySQL socket: `/Applications/XAMPP/xamppfiles/var/mysql/mysql.sock`.

## Architecture

### Frontend (`src/`)

- `src/App.tsx` — all routes. Role sections: `/cliente/*`, `/proveedor/*`, `/admin/*`.
- `src/context/AuthContext.tsx` — `AuthProvider`, `useAuth()` → `{ user, login, register, logout, update, refresh }`
- `src/components/ProtectedRoute.tsx` — auth + role guard
- `src/lib/api.ts` — auth API (login, register, logout, session, profile)
- `src/lib/appointments-api.ts` — all appointment/service/availability/slot API calls
- `src/lib/csrf.ts` — CSRF token via `X-CSRF-Token` header; wrap every fetch with `withCsrfHeaders()`
- Mobile-first, Spanish copy

### Backend (`api/`)

- Every endpoint: `require_once __DIR__ . '/bootstrap.php'` + `require_once __DIR__ . '/db.php'` then `boot_api()`
- `boot_api()` — CORS, session, CSRF enforcement, OPTIONS preflight
- `get_pdo()` — singleton, creates DB, runs schema.sql, calls `ensure_runtime_schema()`
- `require_session_user()` — 401 if not authenticated
- `require_role($role)` — 403 if wrong role
- `json_response($payload, $status)` — sets headers, CSRF token, exits
- `serialize_appointment($row)` — canonical appointment shape

### Database

Schema: `database/schema.sql`. Runtime migrations: `ensure_runtime_schema()` in `api/db.php`.

Tables: `users`, `services`, `availability_rules`, `availability_exceptions`, `appointments`

Appointment statuses: `pending → confirmed → completed | no_show | cancelled_by_client | cancelled_by_provider`

### Slot generation (`api/slots.php`)

- Reads `availability_rules` for the requested weekday
- Checks `availability_exceptions` for date-level overrides/blocks
- Generates 30-minute grid slots within the provider's window, sized to service `duration_minutes`
- Filters out past times and existing non-cancelled appointments (overlap check)

## Environment variables

Copy `.env.example` to `.env`.

| Variable | Purpose |
|---|---|
| `AGENDATE_APP_URL` | Full origin for CORS / cookie domain |
| `AGENDATE_DB_SOCKET` | MySQL socket (XAMPP default) |
| `AGENDATE_ADMIN_EMAIL` / `AGENDATE_ADMIN_PASSWORD` | Seeded admin credentials |
| `VITE_PORT` | Dev server port (default 8081) |

## Notes

- `api/init.php` is blocked for non-local callers — run once to seed admin user
- Schema changes go in `ensure_runtime_schema()` as `ALTER TABLE` guards, not in `schema.sql`
- Port 8081 avoids conflict with lote.coffee on 8080
