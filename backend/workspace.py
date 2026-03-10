from collections import defaultdict

from models import (
    ContextEntry,
    RelatedTaskSummary,
    ResumePacket,
    Task,
    TaskDependency,
    TaskMemorySummary,
    TaskOperationalState,
    WorkspaceSnapshot,
)


def split_lines(value: str | None) -> list[str]:
    if not value:
        return []
    return [line.strip() for line in value.splitlines() if line.strip()]


def build_memory_summary(task: Task, entries: list[ContextEntry]) -> TaskMemorySummary:
    ordered_entries = sorted(entries, key=lambda entry: entry.timestamp, reverse=True)
    recent_entries = ordered_entries[:8]
    latest_entry = recent_entries[0] if recent_entries else None

    recent_files: list[str] = []
    active_decisions: list[str] = []
    open_questions: list[str] = []

    for entry in recent_entries:
        for file_name in split_lines(entry.files_touched):
            if file_name not in recent_files:
                recent_files.append(file_name)
        for decision in split_lines(entry.decisions):
            if decision not in active_decisions:
                active_decisions.append(decision)
        for question in split_lines(entry.open_questions):
            if question not in open_questions:
                open_questions.append(question)

    return TaskMemorySummary(
        task_id=task.id or 0,
        task_title=task.title,
        task_status=task.status,
        latest_summary=latest_entry.summary if latest_entry else None,
        latest_next_step=latest_entry.next_step if latest_entry else None,
        active_decisions=active_decisions[:6],
        open_questions=open_questions[:6],
        recent_files=recent_files[:10],
        recent_entries=recent_entries,
    )


def build_operational_states(tasks: list[Task], dependencies: list[TaskDependency]) -> list[TaskOperationalState]:
    task_by_id = {task.id: task for task in tasks if task.id is not None}
    incoming: dict[int, list[TaskDependency]] = defaultdict(list)
    outgoing: dict[int, list[TaskDependency]] = defaultdict(list)

    for dependency in dependencies:
        incoming[dependency.target_task_id].append(dependency)
        outgoing[dependency.source_task_id].append(dependency)

    states: list[TaskOperationalState] = []

    for task in tasks:
        if task.id is None:
            continue

        blocked_by: list[RelatedTaskSummary] = []
        unblocks: list[RelatedTaskSummary] = []

        for dependency in incoming.get(task.id, []):
            source_task = task_by_id.get(dependency.source_task_id)
            if source_task and source_task.status != "done":
                blocked_by.append(
                    RelatedTaskSummary(
                        task_id=source_task.id or 0,
                        task_title=source_task.title,
                        task_status=source_task.status,
                        dependency_type=dependency.type,
                    )
                )

        for dependency in outgoing.get(task.id, []):
            target_task = task_by_id.get(dependency.target_task_id)
            if target_task and target_task.status != "done":
                unblocks.append(
                    RelatedTaskSummary(
                        task_id=target_task.id or 0,
                        task_title=target_task.title,
                        task_status=target_task.status,
                        dependency_type=dependency.type,
                    )
                )

        states.append(
            TaskOperationalState(
                task_id=task.id,
                is_ready=task.status == "todo" and len(blocked_by) == 0,
                is_blocked=task.status != "done" and len(blocked_by) > 0,
                blocked_by_open_count=len(blocked_by),
                blocks_open_count=len(unblocks),
                blocked_by=blocked_by,
                unblocks=unblocks,
            )
        )

    return states


def build_workspace_snapshot(
    tasks: list[Task],
    dependencies: list[TaskDependency],
    entries: list[ContextEntry],
) -> WorkspaceSnapshot:
    entries_by_task: dict[int, list[ContextEntry]] = defaultdict(list)
    for entry in entries:
        entries_by_task[entry.task_id].append(entry)

    memory = [
        build_memory_summary(task, entries_by_task.get(task.id or -1, []))
        for task in tasks
        if task.id is not None
    ]
    memory.sort(key=lambda summary: len(summary.recent_entries), reverse=True)

    return WorkspaceSnapshot(
        tasks=tasks,
        dependencies=dependencies,
        memory=memory,
        task_states=build_operational_states(tasks, dependencies),
    )


def build_resume_packet(
    task: Task,
    entries: list[ContextEntry],
    dependencies: list[TaskDependency],
    all_tasks: list[Task],
) -> ResumePacket:
    memory = build_memory_summary(task, entries)
    state = next(
        (
            state
            for state in build_operational_states(all_tasks, dependencies)
            if state.task_id == (task.id or -1)
        ),
        TaskOperationalState(task_id=task.id or 0),
    )

    recommended_next_actions: list[str] = []
    if not memory.latest_summary:
        recommended_next_actions.append("Review the task description and latest context logs before making changes.")
    if state.is_blocked and state.blocked_by:
        blocker_titles = ", ".join(item.task_title for item in state.blocked_by[:3])
        recommended_next_actions.append(f"Resolve or verify blockers from: {blocker_titles}.")
    if memory.latest_next_step:
        recommended_next_actions.append(f"Start with the recorded next step: {memory.latest_next_step}")
    else:
        recommended_next_actions.append("Capture a concrete next step before handing this task to another agent.")
    if memory.open_questions:
        recommended_next_actions.append(f"Answer the top open question: {memory.open_questions[0]}")
    elif not state.is_blocked:
        recommended_next_actions.append("Confirm the first implementation step and write a fresh handoff once progress is made.")

    handoff_complete = bool(memory.latest_summary and memory.latest_next_step)
    brief_sections = [
        f"Task: {task.title}",
        f"Status: {task.status}",
        f"Flow state: {'blocked' if state.is_blocked else 'ready' if state.is_ready else 'active' if task.status == 'in_progress' else 'idle'}",
        f"Latest summary: {memory.latest_summary or 'No summary captured yet.'}",
        f"Next step: {memory.latest_next_step or 'No next step captured yet.'}",
        f"Open blockers: {', '.join(item.task_title for item in state.blocked_by) or 'None'}",
        f"Recent files: {', '.join(memory.recent_files) or 'None'}",
    ]

    return ResumePacket(
        task=task,
        task_state=state,
        memory=memory,
        blocked_by=state.blocked_by,
        unblocks=state.unblocks,
        handoff_complete=handoff_complete,
        recommended_next_actions=recommended_next_actions[:5],
        agent_brief="\n".join(brief_sections),
    )
