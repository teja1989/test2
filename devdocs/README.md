# DevDocs — OMS Documentation Portal

A self-hosted internal documentation portal for Order Management System (OMS) teams.
Automatically syncs Markdown and PDF docs from GitHub repositories, indexes them in
Azure AI Search, and surfaces them through a fast, searchable web UI with an integrated
AI chat assistant.

---

## Capabilities

### Document Management
- **Auto-sync from GitHub** — watches configured repositories; pulls new and updated docs on every push
- **Markdown & PDF support** — renders Markdown with syntax highlighting and serves PDFs with a fit-to-width viewer
- **Frontmatter metadata** — extracts `title`, `tags`, and `updatedAt` from YAML frontmatter automatically
- **File watcher** — `chokidar`-based watcher re-indexes changed local files in real time during development

### Search
- **Azure AI Search** — full-text keyword search backed by Azure AI Search (BM25 ranking)
- **Repo-scoped search** — filter results to a single repository
- **Highlighted snippets** — matched terms returned with `<mark>` highlights for in-context previews
- **Command-palette UI** — `⌘K` / `Ctrl+K` opens a fast fuzzy search dialog

### AI Chat Assistant
- **RAG-powered chat** — answers questions by retrieving the most relevant document sections from the index
- **Azure OpenAI backend** — uses GPT-4o (configurable deployment) for response generation
- **Source citations** — every answer links back to the originating document and section

### Authentication
- **Azure Active Directory SSO** — OpenID Connect login via `openid-client`; session-based auth with `express-session`
- **Protected routes** — all API and UI routes require a valid AAD session

### PDF Viewer
- **Fit-to-width rendering** — automatically fills the available container width via `ResizeObserver`
- **Page navigation** — previous/next buttons, direct page-number input, keyboard shortcuts (`←` / `→` / `PageUp` / `PageDown`)
- **Zoom controls** — manual zoom in/out when fit-to-width is disabled

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, Tailwind CSS, TanStack Query, Zustand |
| Backend | Node.js 20, Express 5, TypeScript |
| Search | Azure AI Search (`@azure/search-documents` v12) |
| AI Chat | Azure OpenAI (GPT-4o) |
| Auth | Azure AD via OpenID Connect |
| PDF | `react-pdf` (frontend), `pdf-parse` (backend indexer) |
| Monorepo | pnpm workspaces |

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- An [Azure AI Search](https://azure.microsoft.com/en-us/products/ai-services/ai-search) instance (Free or Standard tier)
- An Azure OpenAI resource with a GPT-4o deployment (for chat)
- An Azure AD app registration (for SSO)

### 1. Clone and install

```bash
git clone https://github.com/teja1989/test2.git
cd test2/devdocs
make install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Azure AI Search
AZURE_SEARCH_ENDPOINT=https://your-instance.search.windows.net
AZURE_SEARCH_KEY=your-admin-key
AZURE_SEARCH_INDEX_NAME=devdocs

# Azure OpenAI (chat)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT=gpt-4o

# Azure AD (SSO)
AZURE_AD_CLIENT_ID=your-app-client-id
AZURE_AD_CLIENT_SECRET=your-app-client-secret
AZURE_AD_TENANT_ID=your-tenant-id

# GitHub repos to sync (JSON array)
GITHUB_REPOS=["org/oms-docs","org/api-reference"]
GITHUB_PAT=your-personal-access-token

# Local filesystem path where synced docs are stored
DOCS_BASE_PATH=./docs

# Server
PORT=3001
NODE_ENV=development
SESSION_SECRET=change-me-in-production
```

### 3. Start development servers

```bash
make dev
```

This starts the backend on `http://localhost:3001` and the frontend on `http://localhost:5173`
(both with hot reload) in parallel.

### 4. Sync your first repository

```bash
curl -X POST http://localhost:3001/api/repos/oms-docs/sync
```

The backend will clone/pull the repo, parse all `.md` and `.pdf` files, and index them in
Azure AI Search. The frontend will show them immediately.

---

## Available Make Commands

```
make install          Install all dependencies (pnpm install)
make dev              Start backend + frontend in parallel (hot reload)
make dev-backend      Start backend only
make dev-frontend     Start frontend only
make build            Production build (both packages)
make typecheck        Run TypeScript type checks across the monorepo
make lint             Run linting across the monorepo
make test             Run all tests (backend + frontend)
make test-backend     Run backend tests only
make test-frontend    Run frontend tests only
make test-watch       Run tests in watch mode
make test-coverage    Run tests with coverage report
make docker-dev       Start via Docker Compose (development)
make docker-down      Stop Docker containers
make docker-logs      Tail Docker container logs
make clean            Remove dist/ and node_modules/
```

---

## Project Structure

```
devdocs/
├── packages/
│   ├── backend/               Express 5 API server
│   │   └── src/
│   │       ├── routes/        HTTP route handlers (docs, search, repos, chat, auth)
│   │       ├── services/      Business logic (azureAISearch, fileWatcher, markdownParser, pdfParser, azureOpenAI)
│   │       ├── lib/           Config (Zod-validated env), shared utilities
│   │       └── __tests__/     Vitest + supertest integration tests
│   └── frontend/              React + Vite SPA
│       └── src/
│           ├── components/    UI components (PdfViewer, SearchDialog, Sidebar, ChatPanel, …)
│           ├── pages/         Route-level page components
│           ├── lib/           API client, utility functions
│           └── __tests__/     Vitest + React Testing Library unit tests
├── Makefile                   Developer convenience commands
├── docker-compose.yml         Local Docker development stack
├── docker-compose.prod.yml    Production Docker stack
└── .env.example               Environment variable template
```

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/repos` | List configured repositories |
| `POST` | `/api/repos/:name/sync` | Trigger manual sync for a repo |
| `GET` | `/api/docs` | List all indexed documents |
| `GET` | `/api/docs/:repo/*` | Render a single document (Markdown or PDF) |
| `GET` | `/api/search?q=&repo=&size=` | Full-text keyword search |
| `POST` | `/api/chat` | AI chat with RAG context |
| `POST` | `/api/webhooks/github` | GitHub push webhook (auto re-index) |
| `GET` | `/api/auth/login` | Initiate Azure AD SSO login |
| `GET` | `/api/auth/callback` | Azure AD OAuth2 callback |

---

## Running Tests

```bash
# All tests
make test

# Backend only (69 tests: services + routes)
make test-backend

# Frontend only (37 tests: components + utilities)
make test-frontend

# With coverage
make test-coverage
```

---

## Docker

For a fully containerised local environment (no need to install Node/pnpm locally):

```bash
make docker-dev
```

Services started:
- `backend` — Express API on port 3001
- `frontend` — Vite dev server on port 5173

```bash
make docker-down    # stop
make docker-logs    # tail logs
```
