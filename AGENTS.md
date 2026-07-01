# Repository Guidelines

## Project Structure & Module Organization

SubscribeManager is a full-stack subscription link manager split into `backend/` and `frontend/`:

- **`backend/`** — Express 5 + SQLite API server. Entry point: `backend/index.js`; schemas and DB init live in `database.js`; business logic under `services/`, HTTP handlers under `routes/`, shared helpers under `utils/`, and i18n under `i18n/`.
- **`frontend/`** — Vue 3 + Element Plus SPA built with Vite. Source under `frontend/src/` (views, composables, utils, api), proxy entry at `frontend/index.html`, Nginx template at `frontend/nginx.conf.template`.
- **`config/`**: shared runtime config (`ports.cjs`).
- **`scripts/`**: Node helpers for changelog/release automation.
- **`version.json`**: canonical version source (read by Make, Docker, and the release flow).

## Build, Test, and Development Commands

Ports are controlled by `BACKEND_PORT` and `FRONTEND_PORT` in `.env`. Start by copying `cp .env.example .env`.

| Command | Purpose |
| --- | --- |
| `make install` | Install backend + frontend dependencies. |
| `make dev` | Boot both services (handles port conflicts, logs to `/tmp/sm-*.log`). |
| `make backend-dev` | Run only the API server. |
| `make frontend-dev` | Run only the Vite dev server (proxies `/api` to backend). |
| `make frontend-build` | Produce production assets in `frontend/dist`. |
| `make test` | Run backend Jest suite. |
| `make test-frontend` | Run frontend Vitest suite. |
| `make up` / `make down` / `make logs` | Docker Compose lifecycle. |
| `make build` / `make push` | Build and publish multi-arch images (linux/amd64, linux/arm64). |
| `make bump-{patch,minor,major}` | Increment `version.json`. |
| `make release` | Changelog + Docker push + GitHub Release. |

## Coding Style & Naming Conventions

This repo uses no enforced formatter or linter, so match the existing code:

- **Backend**: CommonJS, 2-space indentation, double quotes for requires (see `backend/index.js`).
- **Frontend**: Vue 3 SFC + `<script setup>`, ES modules.
- **Tests**: co-located per feature, `<module>.test.js`, one level deep under `backend/tests/` or `frontend/tests/`.
- **Docker artifacts**: image names in `Makefile` (e.g. `knighttools/subscribe-manager-backend`).
- **Paths in code**: use forward slashes; never hardcode `localhost` in frontend subscription URLs — derive from `window.location.origin`.

## Testing Guidelines

- **Backend**: Jest with `supertest`. Coverage is collected across all `backend/**/*.js` (excludes `node_modules/`, `coverage/`). Run `cd backend && npm test -- --coverage` for a report.
- **Frontend**: Vitest + jsdom, matches `frontend/tests/**/*.test.js` (configured in `frontend/vitest.config.js`).
- Add tests alongside new service logic and regression-fix routes.

## Commit & Pull Request Guidelines

Commit history favors concise, action-prefixed messages — typically in English (e.g. `Fix Clash generate by inlining nodes for Subconverter`, `Unify port config and split Docker into frontend/backend services`) with occasional short Chinese commits or `no message` on release commits. Prefer the active, English-prefixed style.

Pull requests should:
- Summarize the behavior changed and what issue it resolves.
- Note any `*.env` or Compose assumptions (ports, volume paths).
- Include screenshots/frontend repro steps for UI changes.
- Reference version bump if a release follows.

## Release Workflow

- Bump version via `make bump-{patch,minor,major}`, which updates `version.json`.
- `make release` drives the full pipeline: `update-changelog` → `push` (Docker Hub multi-arch) → `github-release` (tagged `v<version>`, notes from `CHANGELOG.md`). Requires `gh` CLI authentication.
- Docker images are versioned as both `:latest` and `:<version>`.
