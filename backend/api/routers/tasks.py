from fastapi import APIRouter

from ...api.dependencies import SessionDep
from ...domain.models import (
    ActivityEvent,
    ContextEntry,
    ContextEntryCreate,
    ResumePacket,
    Task,
    TaskCreate,
    TaskMemorySummary,
    TaskUpdate,
)
from ...services.context import (
    create_task_context,
    get_task_memory_summary,
    get_task_resume_packet,
    list_task_context,
)
from ...services.tasks import create_task, delete_task, list_tasks, update_task
from ...services.views import list_task_activity_events

router = APIRouter(tags=["tasks"])


@router.get("/api/tasks", response_model=list[Task])
def read_tasks(session: SessionDep, project_id: str | None = None):
    return list_tasks(session, project_id)


@router.post("/api/tasks", response_model=Task)
def create_task_endpoint(task: TaskCreate, session: SessionDep):
    return create_task(session, **task.model_dump())


@router.put("/api/tasks/{task_id}", response_model=Task)
def update_task_endpoint(task_id: int, task_update: TaskUpdate, session: SessionDep):
    return update_task(session, task_id, task_update)


@router.delete("/api/tasks/{task_id}")
def delete_task_endpoint(task_id: int, session: SessionDep):
    delete_task(session, task_id)
    return {"ok": True}


@router.get("/api/tasks/{task_id}/context", response_model=list[ContextEntry])
def read_task_context(task_id: int, session: SessionDep):
    return list_task_context(session, task_id)


@router.post("/api/tasks/{task_id}/context", response_model=ContextEntry)
def create_task_context_endpoint(
    task_id: int, entry: ContextEntryCreate, session: SessionDep
):
    return create_task_context(session, task_id, entry)


@router.get("/api/tasks/{task_id}/memory", response_model=TaskMemorySummary)
def read_task_memory(task_id: int, session: SessionDep):
    return get_task_memory_summary(session, task_id)


@router.get("/api/tasks/{task_id}/resume-packet", response_model=ResumePacket)
def read_task_resume_packet(task_id: int, session: SessionDep):
    return get_task_resume_packet(session, task_id)


@router.get("/api/tasks/{task_id}/activity", response_model=list[ActivityEvent])
def read_task_activity(task_id: int, session: SessionDep, limit: int = 60):
    return list_task_activity_events(session, task_id, limit)
