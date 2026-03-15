from sqlmodel import Session, select

from ..domain.models import (
    ContextEntry,
    ContextEntryCreate,
    Task,
    TaskDependency,
    TaskMemorySummary,
    UserContext,
)
from .authz import ensure_project_access
from .activity import record_activity, truncate
from .errors import ForbiddenError, NotFoundError
from .workspace import build_memory_summary, build_resume_packet


def _get_task_or_raise(
    session: Session,
    task_id: int,
    project_id: str | None = None,
    user: UserContext | None = None,
) -> Task:
    task = session.get(Task, task_id)
    if not task or (project_id is not None and task.project_id != project_id):
        raise NotFoundError("Task not found")
    if user is not None:
        ensure_project_access(session, task.project_id, user, allow_archived=True)
    return task


def _task_is_visible(
    session: Session, task: Task, user: UserContext | None = None
) -> bool:
    if task.archived:
        return False
    if user is None:
        return True
    try:
        ensure_project_access(session, task.project_id, user)
    except (ForbiddenError, NotFoundError):
        return False
    return True


def _matches_memory_search(summary: TaskMemorySummary, search: str | None) -> bool:
    if not search:
        return True
    needle = search.strip().lower()
    if not needle:
        return True

    haystacks = [
        summary.task_title,
        summary.latest_summary,
        summary.latest_next_step,
        *summary.active_decisions,
        *summary.open_questions,
        *summary.recent_files,
    ]
    haystacks.extend(entry.content for entry in summary.recent_entries)
    haystacks.extend(entry.summary for entry in summary.recent_entries)
    return any(value and needle in value.lower() for value in haystacks)


def _load_project_dependencies(
    session: Session, project_id: str | None
) -> list[TaskDependency]:
    dependency_rows = session.exec(select(TaskDependency)).all()
    dependencies = [dependency for dependency in dependency_rows]
    if not project_id:
        return dependencies

    task_rows = session.exec(select(Task).where(Task.project_id == project_id)).all()
    task_ids = {task.id for task in task_rows if task.id is not None}
    if not task_ids:
        return []

    return [
        dependency
        for dependency in dependencies
        if dependency.source_task_id in task_ids
        and dependency.target_task_id in task_ids
    ]


def list_task_context(
    session: Session,
    task_id: int,
    project_id: str | None = None,
    user: UserContext | None = None,
) -> list[ContextEntry]:
    _get_task_or_raise(session, task_id, project_id, user)
    rows = session.exec(
        select(ContextEntry).where(ContextEntry.task_id == task_id)
    ).all()
    return [entry for entry in rows]


def create_task_context(
    session: Session,
    task_id: int,
    entry: ContextEntryCreate,
    *,
    project_id: str | None = None,
    user: UserContext | None = None,
    actor: str = "Web operator",
    source: str = "web",
) -> ContextEntry:
    task = _get_task_or_raise(session, task_id, project_id, user)

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
    project_id: str | None = None,
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
        project_id=project_id,
        actor=actor,
        source=source,
    )


def get_task_memory_summary(
    session: Session,
    task_id: int,
    project_id: str | None = None,
    user: UserContext | None = None,
) -> TaskMemorySummary:
    task = _get_task_or_raise(session, task_id, project_id, user)

    entry_rows = session.exec(
        select(ContextEntry).where(ContextEntry.task_id == task_id)
    ).all()
    entries = [entry for entry in entry_rows]
    return build_memory_summary(task, entries)


def get_task_resume_packet(
    session: Session,
    task_id: int,
    project_id: str | None = None,
    user: UserContext | None = None,
):
    task = _get_task_or_raise(session, task_id, project_id, user)
    scoped_project_id = project_id or task.project_id

    entry_rows = session.exec(
        select(ContextEntry).where(ContextEntry.task_id == task_id)
    ).all()
    if scoped_project_id:
        task_rows = session.exec(
            select(Task).where(
                Task.project_id == scoped_project_id,
                Task.archived == False,
            )
        ).all()
    else:
        task_rows = session.exec(select(Task).where(Task.archived == False)).all()
    dependency_rows = _load_project_dependencies(session, scoped_project_id)
    entries = [entry for entry in entry_rows]
    dependencies = [dependency for dependency in dependency_rows]
    tasks = [item for item in task_rows]
    return build_resume_packet(task, entries, dependencies, tasks)


def list_memory_overview(
    session: Session,
    project_id: str | None = None,
    user: UserContext | None = None,
    search: str | None = None,
) -> list[TaskMemorySummary]:
    if user is not None and project_id:
        ensure_project_access(session, project_id, user)

    query = select(Task)
    if project_id:
        query = query.where(Task.project_id == project_id)
    query = query.where(Task.archived == False)
    task_rows = session.exec(query).all()
    tasks = [task for task in task_rows if _task_is_visible(session, task, user)]
    task_ids = [task.id for task in tasks if task.id is not None]
    entry_rows = session.exec(select(ContextEntry)).all()
    entries = [entry for entry in entry_rows if entry.task_id in task_ids]

    entries_by_task: dict[int, list[ContextEntry]] = {}
    for entry in entries:
        entries_by_task.setdefault(entry.task_id, []).append(entry)

    summaries = [
        build_memory_summary(task, entries_by_task.get(task.id or -1, []))
        for task in tasks
        if task.id in task_ids
    ]
    summaries = [
        summary for summary in summaries if _matches_memory_search(summary, search)
    ]
    summaries.sort(key=lambda summary: len(summary.recent_entries), reverse=True)
    return summaries
