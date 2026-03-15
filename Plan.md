# Project Plan: Context-Aware MCP Server & Task Manager

## Overview
This project is a self-hosted platform designed to provide long-term context for AI agents using the **Model Context Protocol (MCP)**. It combines a **Task-based management system** (Kanban & Dependency Graph) with a **Context Logging mechanism** to ensure AI agents never lose their "train of thought" across multiple sessions.

## Project Structure

### 1. Backend (`/backend`)
Built with **Python**, **FastAPI**, and **SQLModel** (SQLite).
- **REST API**: Serves the frontend with task and dependency data.
- **MCP Server**: Implements the Model Context Protocol over **SSE (Server-Sent Events)**.
- **Models**:
  - `Task`: A unit of work with a title, description, and status (`todo`, `in_progress`, `done`).
  - `TaskDependency`: Represents relationships between tasks (e.g., "Task A blocks Task B").
  - `ContextEntry`: A log entry associated with a specific task, containing AI-generated context.

### 2. Frontend (`/nexus-context`)
Built with **React**, **Vite**, **Tailwind CSS v4**, and **shadcn/ui**.
- **Project Selector**: Entry point for choosing a workspace and checking global stats.
- **Control Center**: A project-scoped operational dashboard with ready queue, activity, and handoff health.
- **Workspace**: A project-scoped easy mode and advanced graph mode built on **React Flow**.
- **Context Modal**: A slide-over panel that shows the history of context entries for a selected task, acting as a "memory feed" for the AI.

## How to use as an AI Agent
AI agents can connect to this platform using the MCP SSE endpoint:
- **SSE URL**: `http://localhost:8000/mcp/sse`
- **Post Message URL**: `http://localhost:8000/mcp/messages`

### Available MCP Tools
- `get_task_graph(project_id?)`: Retrieves tasks and dependencies for a project or the full workspace.
- `get_ready_tasks(project_id?)`: Returns tasks that are safe to start immediately.
- `get_resume_packet(task_id, project_id?)`: Returns a focused resume payload for agent handoff.
- `create_task(title, description, parent_task_id?, project_id?)`: Create a new task inside the correct project scope.
- `update_task_status(task_id, status, project_id?)`: Move a task through the workflow safely.
- `add_context(task_id, content, project_id?)`: Record progress or context for a task.

## Installation & Setup

### Prerequisites
- Python 3.10+
- Node.js 20+

### Step 1: Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Unix:
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Step 2: Frontend Setup
```bash
cd nexus-context
npm install
npm run dev -- --port 5173
```

### Primary Routes

- `/projects`
- `/projects/:projectId/control-center`
- `/projects/:projectId/workspace`
- `/projects/:projectId/memory`

## Future Roadmap
- [ ] Integration with more MCP clients (Claude Desktop, etc.)
- [ ] Multi-user / Workspace support.
- [ ] Automatic task decomposition based on high-level goals.
