from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from typing import List, Optional

from activity import (
    build_activity_feed,
    build_control_center_snapshot,
    normalize_priority,
    record_activity,
    seed_activity_events,
    status_label,
    truncate,
)

from models import (
    ActivityEvent,
    ControlCenterSnapshot,
    Task,
    TaskDependency,
    TaskDependencyCreate,
    ContextEntry,
    ContextEntryCreate,
    ResumePacket,
    TaskCreate,
    TaskMemorySummary,
    TaskOperationalState,
    TaskUpdate,
    WorkspaceSnapshot,
)
from database import create_db_and_tables, engine, get_session
from workspace import build_memory_summary, build_operational_states, build_resume_packet, build_workspace_snapshot

from mcp_server import mcp

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    with Session(engine) as session:
        seed_activity_events(session)
    yield

app = FastAPI(lifespan=lifespan, title="Context-Aware MCP Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/projects", response_model=List[str])
def read_projects(session: Session = Depends(get_session)):
    projects = session.exec(select(Task.project_id).distinct()).all()
    return [p for p in projects if p]

@app.get("/api/tasks", response_model=List[Task])
def read_tasks(project_id: Optional[str] = None, session: Session = Depends(get_session)):
    query = select(Task)
    if project_id:
        query = query.where(Task.project_id == project_id)
    return session.exec(query).all()

@app.post("/api/tasks", response_model=Task)
def create_task(task: TaskCreate, session: Session = Depends(get_session)):
    db_task = Task.model_validate(task)
    session.add(db_task)
    session.flush()
    record_activity(
        session,
        event_type="task.created",
        entity_type="task",
        entity_id=db_task.id,
        task_id=db_task.id,
        task_title=db_task.title,
        title=f'Created task "{db_task.title}"',
        summary=f'Started in {status_label(db_task.status)} with {normalize_priority(db_task.priority)} priority.',
        actor="Web operator",
        source="web",
    )
    session.commit()
    session.refresh(db_task)
    return db_task

@app.put("/api/tasks/{task_id}", response_model=Task)
def update_task(task_id: int, task_update: TaskUpdate, session: Session = Depends(get_session)):
    db_task = session.get(Task, task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    updates = task_update.model_dump(exclude_unset=True)
    before = {
        "title": db_task.title,
        "description": db_task.description,
        "status": db_task.status,
        "priority": db_task.priority,
        "labels": db_task.labels,
    }
    changed_fields: list[str] = []
    for field, value in updates.items():
        if before.get(field) == value:
            continue
        setattr(db_task, field, value)
        changed_fields.append(field)

    if changed_fields:
        session.add(db_task)
        if "status" in changed_fields and len(changed_fields) == 1:
            record_activity(
                session,
                event_type="task.status_changed",
                entity_type="task",
                entity_id=db_task.id,
                task_id=db_task.id,
                task_title=db_task.title,
                title=f'Moved "{db_task.title}" to {status_label(db_task.status)}',
                summary=f'Status changed from {status_label(before["status"])} to {status_label(db_task.status)}.',
                actor="Web operator",
                source="web",
            )
        else:
            changed_labels = ", ".join(field.replace("_", " ") for field in changed_fields)
            status_suffix = (
                f" Status moved from {status_label(before['status'])} to {status_label(db_task.status)}."
                if "status" in changed_fields
                else ""
            )
            record_activity(
                session,
                event_type="task.updated",
                entity_type="task",
                entity_id=db_task.id,
                task_id=db_task.id,
                task_title=db_task.title,
                title=f'Updated task "{db_task.title}"',
                summary=f"Changed {changed_labels}.{status_suffix}",
                actor="Web operator",
                source="web",
            )
        session.commit()
        session.refresh(db_task)
    return db_task


@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    deleted_task_title = task.title
    deleted_task_status = task.status

    dependencies = session.exec(
        select(TaskDependency).where(
            (TaskDependency.source_task_id == task_id) | (TaskDependency.target_task_id == task_id)
        )
    ).all()
    for dependency in dependencies:
        session.delete(dependency)

    context_entries = session.exec(select(ContextEntry).where(ContextEntry.task_id == task_id)).all()
    for entry in context_entries:
        session.delete(entry)

    session.delete(task)
    record_activity(
        session,
        event_type="task.deleted",
        entity_type="task",
        entity_id=task_id,
        task_id=task_id,
        task_title=deleted_task_title,
        title=f'Deleted task "{deleted_task_title}"',
        summary=f"Removed the task from {status_label(deleted_task_status)} and cleared related dependencies and memory.",
        actor="Web operator",
        source="web",
    )
    session.commit()
    return {"ok": True}

@app.get("/api/dependencies", response_model=List[TaskDependency])
def read_dependencies(session: Session = Depends(get_session)):
    return session.exec(select(TaskDependency)).all()


@app.post("/api/dependencies", response_model=TaskDependency)
def create_dependency(dependency: TaskDependencyCreate, session: Session = Depends(get_session)):
    if dependency.source_task_id == dependency.target_task_id:
        raise HTTPException(status_code=400, detail="A task cannot depend on itself")

    source_task = session.get(Task, dependency.source_task_id)
    target_task = session.get(Task, dependency.target_task_id)
    if not source_task or not target_task:
        raise HTTPException(status_code=404, detail="Source or target task not found")

    existing = session.exec(
        select(TaskDependency).where(
            TaskDependency.source_task_id == dependency.source_task_id,
            TaskDependency.target_task_id == dependency.target_task_id,
            TaskDependency.type == dependency.type,
        )
    ).first()
    if existing:
        existing.source_handle = dependency.source_handle
        existing.target_handle = dependency.target_handle
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    db_dependency = TaskDependency.model_validate(dependency)
    session.add(db_dependency)
    session.flush()
    record_activity(
        session,
        event_type="dependency.created",
        entity_type="dependency",
        entity_id=db_dependency.id,
        task_id=target_task.id,
        task_title=target_task.title,
        title=f'Linked "{source_task.title}" to "{target_task.title}"',
        summary=f'Added a {dependency.type} dependency between the tasks.',
        actor="Web operator",
        source="web",
    )
    session.commit()
    session.refresh(db_dependency)
    return db_dependency


@app.delete("/api/dependencies/{dependency_id}")
def delete_dependency(dependency_id: int, session: Session = Depends(get_session)):
    dependency = session.get(TaskDependency, dependency_id)
    if not dependency:
        raise HTTPException(status_code=404, detail="Dependency not found")

    source_task = session.get(Task, dependency.source_task_id)
    target_task = session.get(Task, dependency.target_task_id)
    source_title = source_task.title if source_task else f"Task {dependency.source_task_id}"
    target_title = target_task.title if target_task else f"Task {dependency.target_task_id}"

    record_activity(
        session,
        event_type="dependency.deleted",
        entity_type="dependency",
        entity_id=dependency_id,
        task_id=dependency.target_task_id,
        task_title=target_task.title if target_task else None,
        title=f'Removed dependency from "{source_title}" to "{target_title}"',
        summary=f'Deleted the {dependency.type} link.',
        actor="Web operator",
        source="web",
    )
    session.delete(dependency)
    session.commit()
    return {"ok": True}

@app.get("/api/tasks/{task_id}/context", response_model=List[ContextEntry])
def read_task_context(task_id: int, session: Session = Depends(get_session)):
    return session.exec(select(ContextEntry).where(ContextEntry.task_id == task_id)).all()


@app.post("/api/tasks/{task_id}/context", response_model=ContextEntry)
def create_task_context(task_id: int, entry: ContextEntryCreate, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    normalized_summary = entry.summary or entry.content or "Working update"
    normalized_content = entry.content.strip() or "\n\n".join(
        part for part in [
            entry.summary,
            entry.what_changed,
            entry.decisions,
            entry.open_questions,
            entry.next_step,
        ] if part
    )

    db_entry = ContextEntry(
        task_id=task_id,
        content=normalized_content.strip() or normalized_summary,
        entry_type=entry.entry_type,
        summary=normalized_summary,
        what_changed=entry.what_changed,
        files_touched=entry.files_touched,
        decisions=entry.decisions,
        open_questions=entry.open_questions,
        next_step=entry.next_step,
    )
    session.add(db_entry)
    session.flush()
    is_handoff = db_entry.entry_type == "handoff"
    activity_summary = truncate(db_entry.summary or db_entry.content)
    record_activity(
        session,
        event_type="context.handoff" if is_handoff else "context.note",
        entity_type="context",
        entity_id=db_entry.id,
        task_id=task.id,
        task_title=task.title,
        title=f'{"Saved handoff" if is_handoff else "Added context"} for "{task.title}"',
        summary=f'{"Captured a structured handoff." if is_handoff else "Logged task context."} {activity_summary}'.strip(),
        actor="Web operator",
        source="web",
    )
    session.commit()
    session.refresh(db_entry)
    return db_entry


@app.get("/api/tasks/{task_id}/memory", response_model=TaskMemorySummary)
def read_task_memory(task_id: int, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    entries = session.exec(select(ContextEntry).where(ContextEntry.task_id == task_id)).all()
    return build_memory_summary(task, entries)


@app.get("/api/tasks/{task_id}/resume-packet", response_model=ResumePacket)
def read_task_resume_packet(task_id: int, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    entries = session.exec(select(ContextEntry).where(ContextEntry.task_id == task_id)).all()
    dependencies = session.exec(select(TaskDependency)).all()
    tasks = session.exec(select(Task)).all()
    return build_resume_packet(task, entries, dependencies, tasks)


@app.get("/api/memory", response_model=List[TaskMemorySummary])
def read_memory_overview(project_id: Optional[str] = None, session: Session = Depends(get_session)):
    query = select(Task)
    if project_id:
        query = query.where(Task.project_id == project_id)
    tasks = session.exec(query).all()
    task_ids = [task.id for task in tasks if task.id is not None]
    entries = session.exec(select(ContextEntry)).all()

    entries_by_task: dict[int, list[ContextEntry]] = {}
    for entry in entries:
        entries_by_task.setdefault(entry.task_id, []).append(entry)

    summaries = [
        build_memory_summary(task, entries_by_task.get(task.id or -1, []))
        for task in tasks
        if task.id in task_ids
    ]
    summaries.sort(key=lambda summary: len(summary.recent_entries), reverse=True)
    return summaries


@app.get("/api/task-states", response_model=List[TaskOperationalState])
def read_task_operational_states(project_id: Optional[str] = None, session: Session = Depends(get_session)):
    query = select(Task)
    if project_id:
        query = query.where(Task.project_id == project_id)
    tasks = session.exec(query).all()
    dependencies = session.exec(select(TaskDependency)).all()
    return build_operational_states(tasks, dependencies)


@app.get("/api/workspace", response_model=WorkspaceSnapshot)
def read_workspace_snapshot(project_id: Optional[str] = None, session: Session = Depends(get_session)):
    query = select(Task)
    if project_id:
        query = query.where(Task.project_id == project_id)
    tasks = session.exec(query).all()
    dependencies = session.exec(select(TaskDependency)).all()
    entries = session.exec(select(ContextEntry)).all()
    return build_workspace_snapshot(tasks, dependencies, entries)


@app.get("/api/control-center", response_model=ControlCenterSnapshot)
def read_control_center_snapshot(project_id: Optional[str] = None, session: Session = Depends(get_session)):
    query = select(Task)
    if project_id:
        query = query.where(Task.project_id == project_id)
    tasks = session.exec(query).all()
    dependencies = session.exec(select(TaskDependency)).all()
    entries = session.exec(select(ContextEntry)).all()
    return build_control_center_snapshot(tasks, dependencies, entries)


@app.get("/api/activity", response_model=List[ActivityEvent])
def read_activity_feed(limit: int = 60, session: Session = Depends(get_session)):
    return build_activity_feed(session, limit)

app.mount("/mcp", mcp.sse_app("/mcp"))
