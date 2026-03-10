from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from typing import List

from models import (
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
from database import create_db_and_tables, get_session
from workspace import build_memory_summary, build_operational_states, build_resume_packet, build_workspace_snapshot

from mcp_server import mcp

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan, title="Context-Aware MCP Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/tasks", response_model=List[Task])
def read_tasks(session: Session = Depends(get_session)):
    return session.exec(select(Task)).all()

@app.post("/api/tasks", response_model=Task)
def create_task(task: TaskCreate, session: Session = Depends(get_session)):
    db_task = Task.model_validate(task)
    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    return db_task

@app.put("/api/tasks/{task_id}", response_model=Task)
def update_task(task_id: int, task_update: TaskUpdate, session: Session = Depends(get_session)):
    db_task = session.get(Task, task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    updates = task_update.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(db_task, field, value)

    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    return db_task


@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

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
    session.commit()
    session.refresh(db_dependency)
    return db_dependency


@app.delete("/api/dependencies/{dependency_id}")
def delete_dependency(dependency_id: int, session: Session = Depends(get_session)):
    dependency = session.get(TaskDependency, dependency_id)
    if not dependency:
        raise HTTPException(status_code=404, detail="Dependency not found")

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
def read_memory_overview(session: Session = Depends(get_session)):
    tasks = session.exec(select(Task)).all()
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
def read_task_operational_states(session: Session = Depends(get_session)):
    tasks = session.exec(select(Task)).all()
    dependencies = session.exec(select(TaskDependency)).all()
    return build_operational_states(tasks, dependencies)


@app.get("/api/workspace", response_model=WorkspaceSnapshot)
def read_workspace_snapshot(session: Session = Depends(get_session)):
    tasks = session.exec(select(Task)).all()
    dependencies = session.exec(select(TaskDependency)).all()
    entries = session.exec(select(ContextEntry)).all()
    return build_workspace_snapshot(tasks, dependencies, entries)

app.mount("/mcp", mcp.sse_app("/mcp"))
