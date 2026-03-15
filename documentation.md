# Nexus Context: AI-Human Context Synchronization
> **A Comprehensive Technical Specification and Presentation Guide for the Model Context Protocol (MCP) Task Memory Framework.**

---

## 1. Executive Vision: Solving the "Context Horizon" Problem
In the rapidly evolving landscape of Large Language Model (LLM) agents, the primary bottleneck for productivity is not reasoning capability, but **state persistence**. Standard project management tools (Jira, Trello, Linear) are designed for human-to-human communication. They lack the technical granularity and protocol-level access required for an AI agent to truly understand its environment without exhaustive, repetitive prompting.

Nexus Context introduces the **"Persistent Memory Handoff"**—a paradigm shift where the context window is no longer a constraint of the model, but a manageable asset of the project itself. By treating tasks as nodes in a graph and context as a first-class citizen, we ensure that an agent resuming a task on Monday has the exact "train of thought" that the Friday agent left behind.

---

## 2. Theoretical Framework: Beyond Kanban
Standard Kanban boards are linear and flatten the complexity of software engineering. Nexus Context utilizes a **Directed Acyclic Graph (DAG)** model for task management.

### The Problem with Status-Only Tracking:
- **Invisible Blockers**: A "To-Do" item might be blocked by a specific technical uncertainty in another "In-Progress" task.
- **Context Decay**: Implementation details discussed in a 50-message chat thread vanish when a new agent is invoked.
- **Architectural Drift**: Without a visual hierarchy, agents and humans lose sight of the "big picture" dependencies.

### The Nexus Solution:
- **Semantic Linkages**: Every task can be linked via `Blocks`, `Requires`, or `Relates To`.
- **Inherited State**: Child nodes can automatically reference the "Handoff Packet" of their parent nodes.
- **Operational Intelligence**: The system calculates a task's "Operational State" (Ready, Blocked, or Active) in real-time by traversing the graph.

---

## 3. Platform Architecture: System Deep-Dive

### 3.1 The Frontend Concept (React / Vite / Tailwind v4)
The frontend is designed with a **"High-Density Dashboard"** philosophy. It prioritizes information throughput over minimalist aesthetics.

*   **Advanced Mode (The Canvas)**: Utilizing **React Flow**, this view allows for spatial reasoning. Users can group tasks, visualize bottlenecks, and define the critical path via drag-and-drop links.
*   **Easy Mode (The Operational View)**: A streamlined view for execution. It features a "Ready Queue"—a priority list of tasks that have zero open dependencies, allowing for a "flow state" workflow.
*   **The Memory Hub**: A specialized analytics interface. It aggregates the "Thinking Logs" of all MCP-enabled agents, providing a historical audit trail of *why* certain technical decisions were made.

### 3.2 The Backend Infrastructure (FastAPI / SQLModel)
The backend is organized using a modular, service-oriented architecture, acting as the "Source of Truth" for both human and machine agents.

*   **API Layer (`backend/api/`)**: Structured using FastAPI routers. It handles request validation, dependency injection, and routes requests to the appropriate services.
    *   `routers/`: Feature-specific endpoints for `tasks`, `projects`, and `views`.
*   **Service Layer (`backend/services/`)**: Contains the core business logic. Each service is responsible for a specific domain.
    *   `workspace.py`: Recursive graph traversal, task readiness logic, and workspace state management.
    *   `tasks.py` & `projects.py`: CRUD operations and complex state transitions.
    *   `activity.py` & `context.py`: Management of event streams and the AI handoff lifecycle.
*   **Domain Models (`backend/domain/models.py`)**: Centralized SQLModel definitions for `Tasks`, `Project`, `ContextEntry`, and complex response schemas like `ResumePacket` and `ControlCenterSnapshot`.
*   **Integration Layer (`backend/integrations/`)**: Houses the **Model Context Protocol (MCP)** server implementation, bridging the internal state to standardized AI tools.
*   **Database & Session (`backend/db/`)**: Manages the SQLAlchemy/SQLModel engine and session lifecycle, utilizing SQLite for lightweight, local-first persistence.
*   **Runtime Settings (`backend/settings.py`)**: Centralizes environment-driven configuration for database access, browser origins, and public MCP/API URLs.

---

## 4. The Model Context Protocol (MCP) Utility

Nexus Context is not just a tool; it's an **MCP Server**. This means any MCP-compliant agent (Claude, Copilot, etc.) can "plug in" to your project.

### 4.1 Exposed Agent Tools:
1.  **`get_task_graph(project_id?)`**: The agent downloads the dependency map for the current project or the whole workspace.
2.  **`get_ready_tasks(project_id?)`**: The agent pulls only work that is safe to start now.
3.  **`get_resume_packet(task_id, project_id?)`**: The agent retrieves a focused brief with blockers, memory, and next actions.
4.  **`create_task(title, description, parent_task_id?, project_id?)`**: Agents can propose sub-tasks inside the correct project scope.
5.  **`update_task_status(task_id, status, project_id?)`**: The agent moves the task while respecting project boundaries.
6.  **`add_context(task_id, content, project_id?)`**: The agent records progress notes or structured handoffs without crossing project scope.

### 4.2 Anatomy of a Structured Handoff:
When an agent completes a session, it must leave behind a `ResumePacket`:
- **Current Summary**: A succinct technical status update.
- **Implementation Victories**: What was successfully built/fixed.
- **Architectural Decisions**: Why a specific library or pattern was chosen.
- **Known Blockers**: What stopped the agent from going further.
- **Explicit Next Steps**: A direct instruction for the next agent to follow (e.g., "Run migrate script then update App.tsx").

---

## 5. Technical Stack and Deployment

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend UI** | React 19 / Tailwind CSS v4 | Maximum flexibility for custom graph components. |
| **State Management** | Custom Workspace Controller | Manages the sync between React Flow and REST API. |
| **Visualization** | React Flow (SvelteFlow port) | Industry standard for node-based graph interfaces. |
| **API Framework** | FastAPI (Python 3.11+) | Async performance and automatic OpenAPI documentation. |
| **Database** | SQLModel / SQLite | Zero-config, file-based persistence for local development. |
| **Protocol** | Model Context Protocol | Standardizes AI-to-tool communication. |

### Installation Instructions
1.  **Backend Initialization**:
    ```bash
    cd backend
    python -m venv venv
    # Windows PowerShell: .\venv\Scripts\activate
    # macOS/Linux: source venv/bin/activate
    cp .env.example .env
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
    ```
2.  **Frontend Initialization**:
    ```bash
    cd nexus-context
    npm install
    npm run dev -- --port 5173
    ```

### Local Validation Workflow

- Frontend lint: `cd nexus-context && npm run lint`
- Frontend production build: `cd nexus-context && npm run build`
- Frontend combined check: `cd nexus-context && npm run check`
- Backend tests: `cd backend && .\venv\Scripts\python.exe -m unittest tests.test_phase1`
- Backend migrations: `cd backend && .\venv\Scripts\alembic.exe upgrade head`
- Backend combined check: `cd backend && .\venv\Scripts\python.exe run_checks.py`

For existing local SQLite databases created before Alembic was introduced, the first `upgrade head` may only stamp the migration state after detecting pre-existing tables. Fresh databases still receive the full initial schema from the migration.

### Runtime Configuration

The backend now reads its local runtime settings from environment variables:

- `NEXUS_ENV`
- `NEXUS_DATABASE_URL`
- `NEXUS_CORS_ORIGINS`
- `NEXUS_PUBLIC_API_BASE_URL`
- `NEXUS_PUBLIC_MCP_BASE_URL`
- `NEXUS_REQUEST_LOGGING_ENABLED`
- `NEXUS_REQUEST_LOGGING_INCLUDE_QUERY_STRING`
- `NEXUS_REQUEST_LOG_LEVEL`
- `NEXUS_REQUEST_ID_HEADER_NAME`

These values control database bootstrapping, CORS policy, and the MCP URLs shown in the web app.

### Operator Endpoints

- `GET /health`: lightweight process health and environment metadata.
- `GET /ready`: readiness probe that confirms the API can execute a database round-trip.
- `GET /metrics`: compact operator summary for task, dependency, context, and flow-state counts.

### Observability

- The API now applies structured request logging middleware for all HTTP routes.
- Each request log records `request_id`, `method`, `path`, `status_code`, `client`, and `duration_ms`.
- The API echoes the correlation ID in every HTTP response header, using `X-Request-ID` by default.
- Query-string logging stays off by default to keep operator logs quieter and safer.
- In-process telemetry now tracks recent request history along with average and max request latency.
- The metrics payload now includes per-path aggregates for volume, failures, and latency hot spots.

### Control Center Metrics Surface

- The frontend Control Center now consumes `GET /metrics` through React Query.
- Operators can inspect flow totals, backend environment, latency summaries, and recent traced requests directly in the dashboard.
- Recent request history supports quick text search and `All` / `OK` / `Failed` filtering for triage.
- The ops panel also highlights top routes and supports incremental expansion of request history with `Show more`.

### Frontend Delivery Optimization

- Major routes now load lazily so the first screen no longer pulls every page eagerly.
- Workspace easy/advanced views are split into separate async chunks, reducing initial graph-related download cost.
- Vite manual chunking now separates heavy libraries such as React Flow, Recharts, Markdown rendering, React Query, and command-palette dependencies.

### Current Route Structure

- `http://localhost:5173/projects`
- `http://localhost:5173/projects/:projectId/control-center`
- `http://localhost:5173/projects/:projectId/workspace`
- `http://localhost:5173/projects/:projectId/memory`

---

## 6. Case Study: A Typical Workflow
1.  **Human** creates a high-level task: "Implement Auth Flow."
2.  **AI Agent** connects via MCP, reads the task, and creates 3 child sub-tasks: "Setup JWT," "Create Login UI," and "Database Schema."
3.  **AI Agent** completes "Database Schema," and leaves a handoff: "Schema is in `models.py`. Next: Run migrations."
4.  **Human** wakes up, sees the "Ready" status on the next task, and continues work with full context.

---

## 7. Roadmap and Future Evolution
- **Stage 1 (Current)**: Local graph management and basic MCP toolset.
- **Stage 2 (Short-term)**: Multi-agent support where different models (Claude, GPT, Gemini) collaborate on the same graph nodes.
- **Stage 3 (Long-term)**: "Predictive Blockers"—An AI agent scans the repository and the graph to predict which tasks will be blocked next based on code changes.

---
*Prepared for the March 2026 Engineering Summit*
*Version: 1.0.4-L (Long Form Refactor)*
