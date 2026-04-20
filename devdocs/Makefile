PNPM := pnpm

.PHONY: help install dev dev-backend dev-frontend build typecheck \
        test test-backend test-frontend test-watch test-coverage \
        lint clean docker-dev docker-down setup

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort \
	  | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'

# ── Setup ─────────────────────────────────────────────────────────────────────

.env:
	cp .env.example .env
	@echo "Created .env from .env.example — edit AZURE_SEARCH_ENDPOINT, AZURE_SEARCH_KEY before running 'make dev'"

setup: .env install ## First-time setup: copy .env and install all dependencies

install: ## Install all workspace dependencies
	$(PNPM) install

# ── Development ───────────────────────────────────────────────────────────────

dev: ## Start backend + frontend concurrently (hot-reload)
	$(PNPM) --parallel -r run dev

dev-backend: ## Start backend only on port 3001
	$(PNPM) --filter @devdocs/backend run dev

dev-frontend: ## Start frontend only on port 5173
	$(PNPM) --filter @devdocs/frontend run dev

# ── Build ─────────────────────────────────────────────────────────────────────

build: ## Build all packages for production
	$(PNPM) -r run build

build-backend: ## Build backend only
	$(PNPM) --filter @devdocs/backend run build

build-frontend: ## Build frontend only
	$(PNPM) --filter @devdocs/frontend run build

# ── Quality ───────────────────────────────────────────────────────────────────

typecheck: ## Run TypeScript type checks across all packages
	$(PNPM) -r run typecheck

lint: ## Run linters across all packages
	$(PNPM) -r run lint

# ── Tests ─────────────────────────────────────────────────────────────────────

test: ## Run all tests (backend + frontend)
	$(PNPM) -r run test

test-backend: ## Run backend tests
	$(PNPM) --filter @devdocs/backend run test

test-frontend: ## Run frontend tests
	$(PNPM) --filter @devdocs/frontend run test

test-watch: ## Run tests in watch mode (both packages)
	$(PNPM) -r run test:watch

test-coverage: ## Run tests with coverage report
	$(PNPM) -r run test:coverage

# ── Docker ────────────────────────────────────────────────────────────────────

docker-dev: ## Start dev environment with Docker Compose (backend + frontend)
	docker compose up --build

docker-down: ## Stop and remove Docker Compose containers
	docker compose down

docker-logs: ## Tail logs from all Docker Compose services
	docker compose logs -f

# ── Cleanup ───────────────────────────────────────────────────────────────────

clean: ## Remove build artifacts (dist folders)
	$(PNPM) -r exec -- rm -rf dist

clean-all: ## Remove dist folders AND all node_modules (full reset)
	$(PNPM) -r exec -- rm -rf dist node_modules
	rm -rf node_modules
