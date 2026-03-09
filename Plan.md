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
- **Kanban View**: A drag-and-drop board for managing task statuses.
- **Dependency Graph**: A node-based visualization using **React Flow**, allowing users to map out complex task relationships visually.
- **Context Modal**: A slide-over panel that shows the history of context entries for a selected task, acting as a "memory feed" for the AI.

## How to use as an AI Agent
AI agents can connect to this platform using the MCP SSE endpoint:
- **SSE URL**: `http://localhost:8000/mcp/sse`
- **Post Message URL**: `http://localhost:8000/mcp/messages`

### Available MCP Tools
- `get_task_graph()`: Retrieves all tasks and their dependencies. Use this to understand the project architecture or current roadmap.
- `create_task(title, description, parent_task_id?)`: Create a new task. If `parent_task_id` is provided, it creates a dependency.
- `update_task_status(task_id, status)`: Move a task through the Kanban columns (`todo`, `in_progress`, `done`).
- `add_context(task_id, content)`: Document what you've just done or learned. This is critical for maintaining context for yourself or other agents.

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

## Future Roadmap
- [ ] Integration with more MCP clients (Claude Desktop, etc.)
- [ ] Multi-user / Workspace support.
- [ ] Automatic task decomposition based on high-level goals.
