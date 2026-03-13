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
The backend acts as the "Source of Truth" for both human and machine agents.

*   **FastAPI REST Layer**: Serves the React frontend with a sub-100ms response time, ensuring the graph feels snappy.
*   **SQLModel (SQLite Partitioning)**: Uses a type-safe ORM to manage complex relationships between `Tasks`, `Dependencies`, and `ContextEntries`.
*   **Business Logic Layer**: Located in `workspace.py`, this layer performs the recursive graph traversal to determine task readiness and calculate project velocity.

---

## 4. The Model Context Protocol (MCP) Utility

Nexus Context is not just a tool; it's an **MCP Server**. This means any MCP-compliant agent (Claude, Copilot, etc.) can "plug in" to your project.

### 4.1 Exposed Agent Tools:
1.  **`get_task_graph`**: The agent downloads the entire dependency map, giving it an instant "30,000-foot view" of the project.
2.  **`create_task`**: Agents can propose their own sub-tasks, decomposing complex goals into manageable nodes.
3.  **`update_task_status`**: As the code is written and tests pass, the agent moves the card, updating the human's dashboard in real-time.
4.  **`add_context`**: This is the heart of the system. The agent logs a **Structured Handoff** before finishing its turn.

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
| **Frontend UI** | React 18 / Tailwind CSS v4 | Maximum flexibility for custom graph components. |
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
    source venv/bin/activate
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
    ```
2.  **Frontend Initialization**:
    ```bash
    cd nexus-context
    npm install
    npm run dev -- --port 5173
    ```

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
