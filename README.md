# Nexus Context

Nexus Context is a self-hosted platform designed to provide long-term context for AI agents using the **Model Context Protocol (MCP)**. It combines a Task-based management system (Kanban & Dependency Graph) with a Context Logging mechanism to ensure AI agents never lose their context across multiple sessions.

![Nexus Context Dashboard](https://github.com/user-attachments/assets/vibrant-ui-placeholder)

## Key Features
- **Control Center**: Operational dashboard with the ready queue, handoff health, and audit timeline.
- **Workspace**: Project-scoped easy and advanced task views for drag-and-drop execution and graph planning.
- **Context Logs**: Sequential feed of AI-generated progress logs for every task.
- **MCP Server**: Integrated SSE endpoint for seamless AI agent integration.
- **Discord Assistant Bridge**: TypeScript bot that binds channels to projects and answers using live project context.

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 20+

### Step 1: Backend Setup
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
copy .env.example .env
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```
*The backend runs on http://localhost:8000*

Backend configuration now lives in environment variables:

- `NEXUS_ENV`
- `NEXUS_DATABASE_URL`
- `NEXUS_CORS_ORIGINS`
- `NEXUS_PUBLIC_API_BASE_URL`
- `NEXUS_PUBLIC_MCP_BASE_URL`
- `NEXUS_REQUEST_LOGGING_ENABLED`
- `NEXUS_REQUEST_LOGGING_INCLUDE_QUERY_STRING`
- `NEXUS_REQUEST_LOG_LEVEL`
- `NEXUS_REQUEST_ID_HEADER_NAME`

Use `backend/.env.example` as the starting point for local setup.

### Step 2: Frontend Setup
```bash
cd nexus-context
npm install
npm run dev
```
*The frontend runs on http://localhost:5173*

The web app now opens on the **Project Selector** by default. Each project has its own routes:

- `/projects/:projectId/control-center`
- `/projects/:projectId/workspace`
- `/projects/:projectId/memory`

### Step 3: Discord Bot Setup (Optional)
```bash
cd discord-bot
npm install
cp .env.example .env
# Fill DISCORD_BOT_TOKEN and optional assistant settings
npm run dev
```
*The bot connects to your Discord server and uses the backend API on `http://localhost:8000/api` by default.*

## Running as an MCP Server
Point your MCP client (like Claude Desktop or MCP Inspector) to:
- **SSE URL**: `http://localhost:8000/mcp/sse`
- **Post Message URL**: `http://localhost:8000/mcp/messages`

## Validation Commands
- Frontend build: `cd nexus-context && npm run build`
- Frontend lint: `cd nexus-context && npm run lint`
- Frontend all-in-one check: `cd nexus-context && npm run check`
- Backend tests: `cd backend && .\venv\Scripts\python.exe -m unittest tests.test_phase1`
- Alembic migrations: `cd backend && .\venv\Scripts\alembic.exe upgrade head`
- Backend all-in-one check: `cd backend && .\venv\Scripts\python.exe run_checks.py`

## Operations Endpoints
- `GET /health` returns app-level status and environment.
- `GET /ready` verifies the API can reach the configured database.
- `GET /metrics` returns task, dependency, context, and flow counts for the whole workspace or a project.

## Observability
- Request logging is enabled by default and emits structured `method`, `path`, `status_code`, `client`, and `duration_ms` fields.
- Every HTTP response now includes a request correlation header, `X-Request-ID` by default.
- Use `NEXUS_REQUEST_LOGGING_INCLUDE_QUERY_STRING=true` only when query visibility is worth the extra log noise.
- `GET /metrics` now includes recent request history plus average and max request latency summaries.
- `GET /metrics` also includes per-route aggregates so operators can spot the busiest or slowest paths quickly.

## Control Center Ops View
- The Control Center now includes an operator metrics panel backed by `GET /metrics`.
- It surfaces request tracing, recent request history, latency summaries, environment, and task-flow counts without leaving the dashboard.
- Recent request history supports text search plus `All` / `OK` / `Failed` filtering.
- The panel also shows top routes and a `Show more` control for deeper request-history inspection.

## Frontend Performance
- Route-level lazy loading now splits major screens like Project Selector, Control Center, Memory Hub, Workspace, and Command Palette.
- Workspace modes are also split so the graph-heavy advanced view does not inflate the initial route bundle.

## Documentation
- [Implementation Plan](Plan.md) - Technical overview for AI agents.
- [Improvement Plan](improvement_plan.md) - Prioritized roadmap for correctness, testing, docs, and migrations.
- [Database Models](backend/domain/models.py) - SQLite schema definitions.
- [Discord Bot Guide](discord-bot/README.md) - Architecture and command reference for channel/project assistant flows.

## License
MIT
