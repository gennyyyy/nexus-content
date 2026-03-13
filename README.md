# Nexus Context

Nexus Context is a self-hosted platform designed to provide long-term context for AI agents using the **Model Context Protocol (MCP)**. It combines a Task-based management system (Kanban & Dependency Graph) with a Context Logging mechanism to ensure AI agents never lose their context across multiple sessions.

![Nexus Context Dashboard](https://github.com/user-attachments/assets/vibrant-ui-placeholder)

## Key Features
- **Control Center**: Operational dashboard with the ready queue, handoff health, and audit timeline.
- **Kanban Board**: Drag-and-drop task management.
- **Dependency Graph**: Visual node-based mapping of task relationships using React Flow.
- **Context Logs**: Sequential feed of AI-generated progress logs for every task.
- **MCP Server**: Integrated SSE endpoint for seamless AI agent integration.

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 20+

### Step 1: Backend Setup
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
.\venv\Scripts\activate; python -m uvicorn main:app --reload --port 8000
```
*The backend runs on http://localhost:8000*

### Step 2: Frontend Setup
```bash
cd nexus-context
npm install
npm run dev
```
*The frontend runs on http://localhost:5173*

The web app now opens on the **Control Center** by default. The task workspace remains available at `/workspace`, and the memory view remains available at `/memory`.

## Running as an MCP Server
Point your MCP client (like Claude Desktop or MCP Inspector) to:
- **SSE URL**: `http://localhost:8000/mcp/sse`
- **Post Message URL**: `http://localhost:8000/mcp/messages`

## Documentation
- [Implementation Plan](Plan.md) - Technical overview for AI agents.
- [Database Models](backend/models.py) - SQLite schema definitions.

## License
MIT
