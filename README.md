# DevDocs — Internal Documentation Portal

A monorepo documentation portal that clones Git repos, indexes Markdown/PDF files into Elasticsearch, and serves a full-text search UI.

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node 20, Express 5, TypeScript, tsx, tsup |
| Frontend | React 18, Vite 5, TailwindCSS 3, React Query 5 |
| Search | Elasticsearch 8.x |
| Infra | Docker Compose, pnpm workspaces |

## Prerequisites

- Node.js >= 20
- pnpm >= 8 (`npm i -g pnpm`)
- Docker + Docker Compose (for Elasticsearch)

## Quick Start

```bash
# 1. Clone and install all workspace packages
git clone <repo-url> devdocs
cd devdocs
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set your REPO_* URLs and WEBHOOK_SECRET

# 3. Start Elasticsearch
docker compose up elasticsearch -d

# 4. Start backend + frontend in watch mode
pnpm dev
```

Open http://localhost:5173 (frontend) and http://localhost:3001/health (backend).

## Docker Compose (full stack)

```bash
# Development — all services
docker compose up

# With Kibana
docker compose --profile kibana up

# Production
docker compose -f docker-compose.prod.yml up -d
```

## Environment Variables

See [`.env.example`](.env.example) for all variables.

| Variable | Description | Default |
|----------|-------------|---------|
| `GITHUB_REPOS` | JSON array of repo objects (see below) | `[]` |
| `GITHUB_PAT` | Personal Access Token — `repo` read scope for private HTTPS repos | — |
| `DOCS_BASE_PATH` | Root dir for cloned repos | `./repos` |
| `ES_NODE` | Elasticsearch URL | `http://localhost:9200` |
| `ES_INDEX` | Index name | `devdocs` |
| `WEBHOOK_SECRET` | HMAC secret for GitHub webhooks | `changeme` |
| `PORT` | Backend listen port | `3001` |
| `VITE_API_BASE` | Backend base URL (used by frontend) | `http://localhost:3001` |

## Repository Configuration

`GITHUB_REPOS` is a JSON array. Each entry supports `url`, `name`, and an optional `branch` (default `main`):

```env
GITHUB_REPOS=[
  {"url":"https://github.com/org/service-platform.git","name":"service-platform","branch":"main"},
  {"url":"https://github.com/org/infra-platform.git","name":"infra-platform"},
  {"url":"git@github.com:org/private-docs.git","name":"private-docs"}
]
```

> **PAT vs SSH**
> - **HTTPS repos** — set `GITHUB_PAT` to a fine-grained token with _Contents: Read_ permission. The token is injected into the URL at runtime and is never written to `.git/config`.
> - **SSH repos** — PAT is ignored; authentication uses your SSH key as normal.

## GitHub Webhook

Point your GitHub webhook to `POST /api/webhooks/github` with content type `application/json` and set the secret to match `WEBHOOK_SECRET`. The backend will auto-pull and re-index on pushes to `main`.

## Scripts

```bash
pnpm dev          # Start all packages in parallel (watch mode)
pnpm build        # Build all packages
pnpm typecheck    # TypeScript check all packages
pnpm lint         # Lint all packages
```

## Project Structure

```
devdocs/
├── packages/
│   ├── backend/        Express 5 API — git sync, file indexing, search
│   └── frontend/       React 18 SPA — doc browser, full-text search UI
├── docker-compose.yml
├── docker-compose.prod.yml
└── .env.example
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/repos` | List configured repos |
| `POST` | `/api/repos/:name/sync` | Trigger manual sync |
| `GET` | `/api/docs` | List all indexed documents |
| `GET` | `/api/docs/:repo/*` | Render a single document |
| `GET` | `/api/search?q=` | Full-text search |
| `POST` | `/api/webhooks/github` | GitHub push webhook |
