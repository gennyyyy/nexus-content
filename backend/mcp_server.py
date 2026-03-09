import json
from mcp.server.fastmcp import FastMCP
from sqlmodel import Session, select
from database import engine
from models import Task, TaskDependency, ContextEntry, TaskStatus

# Create an MCP Server instance
mcp = FastMCP("nexus-context")


def build_memory_payload(task: Task, entries: list[ContextEntry]) -> dict:
    ordered_entries = sorted(entries, key=lambda entry: entry.timestamp, reverse=True)
    recent_entries = ordered_entries[:8]

    def split_lines(value: str | None) -> list[str]:
        if not value:
            return []
        return [line.strip() for line in value.splitlines() if line.strip()]

    files: list[str] = []
    decisions: list[str] = []
    questions: list[str] = []

    for entry in recent_entries:
        for item in split_lines(entry.files_touched):
            if item not in files:
                files.append(item)
        for item in split_lines(entry.decisions):
            if item not in decisions:
                decisions.append(item)
        for item in split_lines(entry.open_questions):
            if item not in questions:
                questions.append(item)

    latest = recent_entries[0] if recent_entries else None
    return {
        "task": {
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "status": task.status,
        },
        "latest_summary": latest.summary if latest else None,
        "latest_next_step": latest.next_step if latest else None,
        "recent_files": files[:10],
        "decisions": decisions[:6],
        "open_questions": questions[:6],
        "recent_entries": [
            {
                "timestamp": entry.timestamp.isoformat(),
                "entry_type": entry.entry_type,
                "summary": entry.summary,
                "what_changed": entry.what_changed,
                "next_step": entry.next_step,
            }
            for entry in recent_entries
        ],
    }

# Define tools
@mcp.tool()
async def get_task_graph() -> str:
    """Get the full tree of tasks and their connections."""
    with Session(engine) as session:
        tasks = session.exec(select(Task)).all()
        deps = session.exec(select(TaskDependency)).all()
        
        result = {
            "tasks": [{"id": t.id, "title": t.title, "status": t.status} for t in tasks],
            "dependencies": [{"source": d.source_task_id, "target": d.target_task_id, "type": d.type} for d in deps]
        }
        return json.dumps(result)

@mcp.tool()
async def create_task(title: str, description: str = "", parent_task_id: int | None = None) -> str:
    """Create a new task, optionally linking it to a parent task that it blocks."""
    with Session(engine) as session:
        task = Task(title=title, description=description, status=TaskStatus.TODO)
        session.add(task)
        session.commit()
        session.refresh(task)
        
        if parent_task_id is not None:
            dep = TaskDependency(source_task_id=task.id, target_task_id=parent_task_id, type="blocks")
            session.add(dep)
            session.commit()
            
        return f"Task created with ID: {task.id}"

@mcp.tool()
async def update_task_status(task_id: int, status: str) -> str:
    """Update task status ('todo', 'in_progress', 'done')."""
    with Session(engine) as session:
        task = session.get(Task, task_id)
        if not task:
            return f"Error: Task {task_id} not found."
        
        try:
            task.status = TaskStatus(status)
            session.add(task)
            session.commit()
            return f"Task {task_id} updated to {status}."
        except ValueError:
            return f"Error: Invalid status '{status}'."

@mcp.tool()
async def add_context(task_id: int, content: str) -> str:
    """Document progress or add context to a task."""
    with Session(engine) as session:
        task = session.get(Task, task_id)
        if not task:
            return f"Error: Task {task_id} not found."
            
        entry = ContextEntry(task_id=task_id, content=content)
        session.add(entry)
        session.commit()
        return f"Context added to Task {task_id}."


@mcp.tool()
async def get_task_memory(task_id: int) -> str:
    """Get the latest handoff memory for a task so an agent can resume work cleanly."""
    with Session(engine) as session:
        task = session.get(Task, task_id)
        if not task:
            return f"Error: Task {task_id} not found."

        entries = session.exec(select(ContextEntry).where(ContextEntry.task_id == task_id)).all()
        return json.dumps(build_memory_payload(task, entries))


@mcp.tool()
async def add_memory_handoff(
    task_id: int,
    summary: str,
    what_changed: str = "",
    files_touched: str = "",
    decisions: str = "",
    open_questions: str = "",
    next_step: str = "",
) -> str:
    """Write a structured memory handoff so another agent can continue the task without losing context."""
    with Session(engine) as session:
        task = session.get(Task, task_id)
        if not task:
            return f"Error: Task {task_id} not found."

        content = "\n\n".join(
            part for part in [summary, what_changed, decisions, open_questions, next_step] if part.strip()
        )
        entry = ContextEntry(
            task_id=task_id,
            content=content or summary,
            entry_type="handoff",
            summary=summary,
            what_changed=what_changed or None,
            files_touched=files_touched or None,
            decisions=decisions or None,
            open_questions=open_questions or None,
            next_step=next_step or None,
        )
        session.add(entry)
        session.commit()
        return f"Memory handoff added to Task {task_id}."
