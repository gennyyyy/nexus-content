from sqlmodel import Session, select

from ..domain.models import (
    ContextEntry,
    ContextEntryCreate,
    Task,
    TaskDependency,
    TaskMemorySummary,
)
from .activity import record_activity, truncate
from .errors import NotFoundError
from .workspace import build_memory_summary, build_resume_packet


def list_task_context(session: Session, task_id: int) -> list[ContextEntry]:
    rows = session.exec(
        select(ContextEntry).where(ContextEntry.task_id == task_id)
    ).all()
    return [entry for entry in rows]


def create_task_context(
    session: Session,
    task_id: int,
    entry: ContextEntryCreate,
    *,
    actor: str = "Web operator",
    source: str = "web",
) -> ContextEntry:
    task = session.get(Task, task_id)
    if not task:
        raise NotFoundError("Task not found")

    normalized_summary = entry.summary or entry.content or "Working update"
    normalized_content = entry.content.strip() or "\n\n".join(
        part
        for part in [
            entry.summary,
            entry.what_changed,
            entry.decisions,
            entry.open_questions,
            entry.next_step,
        ]
        if part
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
        actor=actor,
        source=source,
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
        summary=f"{'Captured a structured handoff.' if is_handoff else 'Logged task context.'} {activity_summary}".strip(),
        actor=actor,
        source=source,
        project_id=task.project_id,
    )
    session.commit()
    session.refresh(db_entry)
    return db_entry


def create_memory_handoff(
    session: Session,
    task_id: int,
    *,
    summary: str,
    what_changed: str = "",
    files_touched: str = "",
    decisions: str = "",
    open_questions: str = "",
    next_step: str = "",
    actor: str = "MCP agent",
    source: str = "mcp",
) -> ContextEntry:
    return create_task_context(
        session,
        task_id,
        ContextEntryCreate(
            entry_type="handoff",
            summary=summary,
            what_changed=what_changed or None,
            files_touched=files_touched or None,
            decisions=decisions or None,
            open_questions=open_questions or None,
            next_step=next_step or None,
        ),
        actor=actor,
        source=source,
    )


def get_task_memory_summary(session: Session, task_id: int) -> TaskMemorySummary:
    task = session.get(Task, task_id)
    if not task:
        raise NotFoundError("Task not found")

    entry_rows = session.exec(
        select(ContextEntry).where(ContextEntry.task_id == task_id)
    ).all()
    entries = [entry for entry in entry_rows]
    return build_memory_summary(task, entries)


def get_task_resume_packet(session: Session, task_id: int):
    task = session.get(Task, task_id)
    if not task:
        raise NotFoundError("Task not found")

    entry_rows = session.exec(
        select(ContextEntry).where(ContextEntry.task_id == task_id)
    ).all()
    dependency_rows = session.exec(select(TaskDependency)).all()
    task_rows = session.exec(select(Task)).all()
    entries = [entry for entry in entry_rows]
    dependencies = [dependency for dependency in dependency_rows]
    tasks = [item for item in task_rows]
    return build_resume_packet(task, entries, dependencies, tasks)


def list_memory_overview(
    session: Session, project_id: str | None = None
) -> list[TaskMemorySummary]:
    query = select(Task)
    if project_id:
        query = query.where(Task.project_id == project_id)
    task_rows = session.exec(query).all()
    tasks = [task for task in task_rows]
    task_ids = [task.id for task in tasks if task.id is not None]
    entry_rows = session.exec(select(ContextEntry)).all()
    entries = [entry for entry in entry_rows]

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
