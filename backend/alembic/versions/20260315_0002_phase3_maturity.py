"""phase 3 maturity schema updates

Revision ID: 20260315_0002
Revises: 20260314_0001
Create Date: 2026-03-15 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text


revision = "20260315_0002"
down_revision = "20260314_0001"
branch_labels = None
depends_on = None


def _table_names(bind) -> set[str]:
    return set(inspect(bind).get_table_names())


def _column_names(bind, table_name: str) -> set[str]:
    inspector = inspect(bind)
    if table_name not in inspector.get_table_names():
        return set()
    return {column["name"] for column in inspector.get_columns(table_name)}


def _has_index(bind, table_name: str, index_name: str) -> bool:
    inspector = inspect(bind)
    if table_name not in inspector.get_table_names():
        return False
    return any(
        index["name"] == index_name for index in inspector.get_indexes(table_name)
    )


def upgrade() -> None:
    bind = op.get_bind()
    tables = _table_names(bind)

    project_columns = _column_names(bind, "project")
    if "project" in tables and "owner_user_id" not in project_columns:
        op.add_column(
            "project",
            sa.Column(
                "owner_user_id",
                sa.String(),
                nullable=False,
                server_default="default-user",
            ),
        )
    if "project" in tables and "archived" not in project_columns:
        op.add_column(
            "project",
            sa.Column(
                "archived", sa.Boolean(), nullable=False, server_default=sa.false()
            ),
        )
    if "project" in tables and not _has_index(
        bind, "project", "ix_project_owner_user_id"
    ):
        op.create_index(
            "ix_project_owner_user_id", "project", ["owner_user_id"], unique=False
        )
    if "project" in tables and not _has_index(bind, "project", "ix_project_archived"):
        op.create_index("ix_project_archived", "project", ["archived"], unique=False)

    task_columns = _column_names(bind, "task")
    if "task" in tables and "archived" not in task_columns:
        op.add_column(
            "task",
            sa.Column(
                "archived", sa.Boolean(), nullable=False, server_default=sa.false()
            ),
        )
    if "task" in tables and not _has_index(
        bind, "task", "ix_task_project_archived_status"
    ):
        op.create_index(
            "ix_task_project_archived_status",
            "task",
            ["project_id", "archived", "status"],
            unique=False,
        )
    if "task" in tables and not _has_index(bind, "task", "ix_task_created_at"):
        op.create_index("ix_task_created_at", "task", ["created_at"], unique=False)

    context_columns = _column_names(bind, "contextentry")
    for column_name, server_default in (
        ("entry_type", "note"),
        ("summary", None),
        ("what_changed", None),
        ("files_touched", None),
        ("decisions", None),
        ("open_questions", None),
        ("next_step", None),
        ("actor", "System"),
        ("source", "system"),
    ):
        if "contextentry" not in tables or column_name in context_columns:
            continue
        op.add_column(
            "contextentry",
            sa.Column(
                column_name,
                sa.String(),
                nullable=column_name not in {"entry_type", "actor", "source"},
                server_default=server_default,
            ),
        )
    if "contextentry" in tables and not _has_index(
        bind, "contextentry", "ix_contextentry_timestamp"
    ):
        op.create_index(
            "ix_contextentry_timestamp", "contextentry", ["timestamp"], unique=False
        )

    activity_columns = _column_names(bind, "activityevent")
    if "activityevent" in tables and "project_id" not in activity_columns:
        op.add_column(
            "activityevent",
            sa.Column("project_id", sa.String(), nullable=True),
        )
    if "activityevent" in tables and not _has_index(
        bind, "activityevent", "ix_activityevent_created_at"
    ):
        op.create_index(
            "ix_activityevent_created_at", "activityevent", ["created_at"], unique=False
        )
    if "activityevent" in tables and not _has_index(
        bind, "activityevent", "ix_activityevent_project_created"
    ):
        op.create_index(
            "ix_activityevent_project_created",
            "activityevent",
            ["project_id", "created_at"],
            unique=False,
        )

    dependency_columns = _column_names(bind, "taskdependency")
    if "taskdependency" in tables and "source_handle" not in dependency_columns:
        op.add_column(
            "taskdependency", sa.Column("source_handle", sa.String(), nullable=True)
        )
    if "taskdependency" in tables and "target_handle" not in dependency_columns:
        op.add_column(
            "taskdependency", sa.Column("target_handle", sa.String(), nullable=True)
        )
    if "taskdependency" in tables and not _has_index(
        bind, "taskdependency", "ix_taskdependency_target_task_id"
    ):
        op.create_index(
            "ix_taskdependency_target_task_id",
            "taskdependency",
            ["target_task_id"],
            unique=False,
        )

    if "projectmembership" not in tables:
        op.create_table(
            "projectmembership",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("project_id", sa.String(), nullable=False),
            sa.Column("user_id", sa.String(), nullable=False),
            sa.Column("role", sa.String(), nullable=False, server_default="member"),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["project_id"], ["project.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
    if "projectmembership" in _table_names(bind):
        if not _has_index(
            bind, "projectmembership", "ix_projectmembership_project_user"
        ):
            op.create_index(
                "ix_projectmembership_project_user",
                "projectmembership",
                ["project_id", "user_id"],
                unique=True,
            )
        if not _has_index(bind, "projectmembership", "ix_projectmembership_user_id"):
            op.create_index(
                "ix_projectmembership_user_id",
                "projectmembership",
                ["user_id"],
                unique=False,
            )

    if "project" in _table_names(bind):
        bind.execute(
            text(
                "UPDATE project SET owner_user_id = 'default-user' WHERE owner_user_id IS NULL OR owner_user_id = ''"
            )
        )


def downgrade() -> None:
    bind = op.get_bind()

    for table_name, index_name in (
        ("projectmembership", "ix_projectmembership_user_id"),
        ("projectmembership", "ix_projectmembership_project_user"),
        ("taskdependency", "ix_taskdependency_target_task_id"),
        ("activityevent", "ix_activityevent_project_created"),
        ("activityevent", "ix_activityevent_created_at"),
        ("contextentry", "ix_contextentry_timestamp"),
        ("task", "ix_task_created_at"),
        ("task", "ix_task_project_archived_status"),
        ("project", "ix_project_archived"),
        ("project", "ix_project_owner_user_id"),
    ):
        if _has_index(bind, table_name, index_name):
            op.drop_index(index_name, table_name=table_name)

    if "projectmembership" in _table_names(bind):
        op.drop_table("projectmembership")
