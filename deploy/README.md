# TDTD reference production stack

Portable Docker Compose stack for `tdtd-node` + `tdtd-batch` with a shared SQLite volume.

**Epic:** [.cursor/gaps-p0/GAP-003.md](../.cursor/gaps-p0/GAP-003.md)

## Prerequisites

- Docker Engine + Docker Compose v2
- Repo cloned locally

## Quick start

```bash
cd deploy
cp .env.example .env
# Edit .env — set TDTD_JWT_ACCESS_SECRET and TDTD_REFRESH_TOKEN_PEPPER
docker compose build
docker compose up -d
curl http://localhost:3000/api/health
```

For production-mode fail-fast testing, set `TDTD_ENV=production` and real secrets in `.env`. The API refuses to start without `TDTD_CORS_ORIGINS` and non-dev JWT secrets.

## Services

| Service | Purpose |
|---------|---------|
| `api` | `tdtd-node` REST API on port `API_PORT` (default 3000) |
| `batch` | Quartz daemon for AM/PM attendance reminders |
| `caddy` | TLS termination (profile `tls`) |
| `backup` | One-shot SQLite backup (profile `backup`) |

## Environment

Copy [`.env.example`](./.env.example) to `.env`. See [GAP-003 env matrix](../.cursor/gaps-p0/GAP-003.md#environment-matrix-gap-004).

Node-only local dev (without Docker): use [`tdtd-node/.env.example`](../tdtd-node/.env.example).

## TLS (optional)

```bash
cp Caddyfile.example Caddyfile
# Set API_DOMAIN and ACME_EMAIL in .env
docker compose --profile tls up -d
```

For local smoke tests, HTTP on `API_PORT` is sufficient.

## Backup

```bash
docker compose --profile backup run --rm backup
ls -la tdtd_data  # backups live inside the named volume at /data/backups
```

Inspect volume:

```bash
docker compose exec api ls -la /data/backups
```

### Restore smoke test

```bash
docker compose stop batch api
docker compose exec api sh -c 'cp /data/backups/teacher_app-YYYYMMDDTHHMMSSZ.sqlite /data/teacher_app.sqlite'
docker compose start api batch
```

## Architecture notes

- **`tdtd-node` does not serve the SPA.** Capacitor bundles the UI; host web static assets separately.
- API and batch share `tdtd_data` volume at `/data/teacher_app.sqlite`.
- On-demand PDF reports spawn the batch JAR inside the `api` container (`/opt/tdtd/tdtd-batch-app.jar`).

## CI deploy (deferred)

GitHub workflows [deploy-production.yml](../.github/workflows/deploy-production.yml) and [deploy-staging.yml](../.github/workflows/deploy-staging.yml) remain placeholders until a hosting target is chosen. See GAP-003 §CI / deploy.
