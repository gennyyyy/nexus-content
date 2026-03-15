from datetime import datetime, timedelta, timezone
from typing import Any, cast

from sqlmodel import Session, select

from ..domain.models import (
    ActivityEvent,
    AttentionTaskItem,
    ContextEntry,
    ControlCenterSnapshot,
    HandoffPulseItem,
    MCPServerStatus,
    Project,
    ReadyQueueItem,
    Task,
    TaskDependency,
)
from ..settings import get_settings
from ..telemetry import request_telemetry
from .workspace import build_memory_summary, build_operational_states

PRIORITY_ORDER = {
    "critical": 0,
    "high": 1,
    "medium": 2,
    "low": 3,
}

STATUS_LABELS = {
    "todo": "To Do",
    "in_progress": "In Progress",
    "done": "Done",
}


def normalize_priority(value: str | None) -> str:
    if value in PRIORITY_ORDER:
        return value
    return "medium"


def status_label(value: str) -> str:
    return STATUS_LABELS.get(value, value.replace("_", " ").title())


def truncate(value: str | None, max_length: int = 160) -> str:
    if not value:
        return ""
    compact = " ".join(value.split())
    if len(compact) <= max_length:
        return compact
    return f"{compact[: max_length - 1].rstrip()}..."


def record_activity(
    session: Session,
    *,
    event_type: str,
    entity_type: str,
    title: str,
    summary: str,
    entity_id: int | None = None,
    task_id: int | None = None,
    task_title: str | None = None,
    actor: str = "System",
    source: str = "system",
    project_id: str | None = None,
    created_at: datetime | None = None,
) -> ActivityEvent:
    event = ActivityEvent(
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        task_id=task_id,
        task_title=task_title,
        title=title,
        summary=summary,
        actor=actor,
        source=source,
        project_id=project_id,
        created_at=created_at or datetime.now(timezone.utc).replace(tzinfo=None),
    )
    session.add(event)
    request_telemetry.emit_event(
        event_type="domain.updated",
        project_id=project_id,
        detail=f"{event_type}: {truncate(summary, 96)}",
    )
    return event


def seed_activity_events(session: Session) -> None:
    default_project = session.get(Project, "default")
    if not default_project:
        default_project = Project(
            id="default",
            name="Default Project",
            description="Auto-created default project",
        )
        session.add(default_project)
        session.commit()

    task_rows = session.exec(select(Task).where(Task.project_id == None)).all()
    tasks_without_project = [task for task in task_rows]
    if tasks_without_project:
        for task in tasks_without_project:
            task.project_id = "default"
            session.add(task)
        session.commit()

    existing_event = session.exec(select(ActivityEvent.id).limit(1)).first()
    if existing_event is not None:
        return

    task_rows = session.exec(select(Task)).all()
    entry_rows = session.exec(select(ContextEntry)).all()
    tasks = [task for task in task_rows]
    entries = [entry for entry in entry_rows]
    task_by_id = {task.id: task for task in tasks if task.id is not None}

    events: list[ActivityEvent] = []

    for task in tasks:
        events.append(
            ActivityEvent(
                event_type="task.created",
                entity_type="task",
                entity_id=task.id,
                task_id=task.id,
                task_title=task.title,
                title=f'Created task "{task.title}"',
                summary=f"Started in {status_label(task.status)} with {normalize_priority(task.priority)} priority.",
                actor="System",
                source="system",
                project_id=task.project_id,
                created_at=task.created_at,
            )
        )

    for entry in entries:
        task = task_by_id.get(entry.task_id)
        if not task:
            continue
        is_handoff = entry.entry_type == "handoff"
        summary = truncate(entry.summary or entry.content)
        body = (
            "Recorded a structured handoff." if is_handoff else "Added context entry."
        )
        if summary:
            body = f"{body} {summary}"
        events.append(
            ActivityEvent(
                event_type="context.handoff" if is_handoff else "context.note",
                entity_type="context",
                entity_id=entry.id,
                task_id=task.id,
                task_title=task.title,
                title=f'{"Saved handoff" if is_handoff else "Added context"} for "{task.title}"',
                summary=body,
                actor="System",
                source="system",
                project_id=task.project_id,
                created_at=entry.timestamp,
            )
        )

    if not events:
        return

    events.sort(key=lambda item: item.created_at)
    session.add_all(events)
    session.commit()


def build_activity_feed(
    session: Session, limit: int = 60, project_id: str | None = None
) -> list[ActivityEvent]:
    safe_limit = max(1, min(limit, 200))
    created_at_column = cast(Any, ActivityEvent.created_at)
    id_column = cast(Any, ActivityEvent.id)
    statement = (
        select(ActivityEvent)
        .order_by(created_at_column.desc(), id_column.desc())
        .limit(safe_limit)
    )
    if project_id:
        statement = statement.where(ActivityEvent.project_id == project_id)
    rows = session.exec(statement).all()
    return [event for event in rows]


def build_task_activity_feed(
    session: Session,
    task_id: int,
    limit: int = 60,
    project_id: str | None = None,
) -> list[ActivityEvent]:
    safe_limit = max(1, min(limit, 200))
    created_at_column = cast(Any, ActivityEvent.created_at)
    id_column = cast(Any, ActivityEvent.id)
    statement = (
        select(ActivityEvent)
        .where(ActivityEvent.task_id == task_id)
        .order_by(created_at_column.desc(), id_column.desc())
        .limit(safe_limit)
    )
    if project_id:
        statement = statement.where(ActivityEvent.project_id == project_id)
    rows = session.exec(statement).all()
    return [event for event in rows]


def build_control_center_snapshot(
    tasks: list[Task],
    dependencies: list[TaskDependency],
    entries: list[ContextEntry],
) -> ControlCenterSnapshot:
    settings = get_settings()
    entries_by_task: dict[int, list[ContextEntry]] = {}
    for entry in entries:
        entries_by_task.setdefault(entry.task_id, []).append(entry)

    memory_by_task = {
        task.id: build_memory_summary(task, entries_by_task.get(task.id or -1, []))
        for task in tasks
        if task.id is not None
    }
    operational_by_task = {
        state.task_id: state for state in build_operational_states(tasks, dependencies)
    }

    ready_queue: list[ReadyQueueItem] = []
    attention_tasks: list[AttentionTaskItem] = []
    latest_handoffs: list[HandoffPulseItem] = []

    for task in tasks:
        if task.id is None:
            continue

        memory = memory_by_task.get(task.id)
        state = operational_by_task.get(task.id)
        recent_entries = sorted(
            entries_by_task.get(task.id, []),
            key=lambda entry: entry.timestamp,
            reverse=True,
        )
        handoff_complete = bool(
            memory and memory.latest_summary and memory.latest_next_step
        )
        missing_summary = task.status != "done" and not (
            memory and memory.latest_summary
        )
        missing_next_step = task.status != "done" and not (
            memory and memory.latest_next_step
        )

        if state and state.is_ready:
            ready_queue.append(
                ReadyQueueItem(
                    task_id=task.id,
                    task_title=task.title,
                    description=task.description,
                    task_status=task.status,
                    priority=normalize_priority(task.priority),
                    labels=task.labels,
                    latest_summary=memory.latest_summary if memory else None,
                    latest_next_step=memory.latest_next_step if memory else None,
                    blocks_open_count=state.blocks_open_count,
                    recent_files=memory.recent_files if memory else [],
                    handoff_complete=handoff_complete,
                )
            )

        if state and (state.is_blocked or missing_summary or missing_next_step):
            attention_tasks.append(
                AttentionTaskItem(
                    task_id=task.id,
                    task_title=task.title,
                    task_status=task.status,
                    priority=normalize_priority(task.priority),
                    is_blocked=state.is_blocked,
                    blocked_by_open_count=state.blocked_by_open_count,
                    missing_summary=missing_summary,
                    missing_next_step=missing_next_step,
                    recent_entries=len(recent_entries),
                    latest_summary=memory.latest_summary if memory else None,
                    latest_next_step=memory.latest_next_step if memory else None,
                )
            )

        latest_handoff = next(
            (entry for entry in recent_entries if entry.entry_type == "handoff"), None
        )
        if latest_handoff:
            latest_handoffs.append(
                HandoffPulseItem(
                    task_id=task.id,
                    task_title=task.title,
                    task_status=task.status,
                    summary=latest_handoff.summary,
                    next_step=latest_handoff.next_step,
                    timestamp=latest_handoff.timestamp,
                )
            )

    ready_queue.sort(
        key=lambda item: (
            PRIORITY_ORDER.get(item.priority, PRIORITY_ORDER["medium"]),
            -item.blocks_open_count,
            item.task_title.lower(),
        )
    )
    attention_tasks.sort(
        key=lambda item: (
            0 if item.is_blocked else 1,
            0 if item.task_status == "in_progress" else 1,
            PRIORITY_ORDER.get(item.priority, PRIORITY_ORDER["medium"]),
            item.task_title.lower(),
        )
    )
    latest_handoffs.sort(
        key=lambda item: item.timestamp or datetime.min,
        reverse=True,
    )

    seven_days_ago = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=7)

    return ControlCenterSnapshot(
        total_tasks=len(tasks),
        todo_count=sum(1 for task in tasks if task.status == "todo"),
        in_progress_count=sum(1 for task in tasks if task.status == "in_progress"),
        done_count=sum(1 for task in tasks if task.status == "done"),
        ready_count=sum(1 for state in operational_by_task.values() if state.is_ready),
        blocked_count=sum(
            1 for state in operational_by_task.values() if state.is_blocked
        ),
        handoff_gap_count=sum(
            1
            for task in tasks
            if task.status != "done"
            and (
                not memory_by_task.get(task.id or -1)
                or not memory_by_task[task.id or -1].latest_summary
                or not memory_by_task[task.id or -1].latest_next_step
            )
        ),
        handoffs_last_7_days=sum(
            1
            for entry in entries
            if entry.entry_type == "handoff" and entry.timestamp >= seven_days_ago
        ),
        ready_queue=ready_queue[:8],
        attention_tasks=attention_tasks[:8],
        latest_handoffs=latest_handoffs[:6],
        server=MCPServerStatus(
            sse_url=settings.public_mcp_sse_url,
            post_message_url=settings.public_mcp_messages_url,
        ),
    )
