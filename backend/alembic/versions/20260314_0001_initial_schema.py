"""initial schema

Revision ID: 20260314_0001
Revises:
Create Date: 2026-03-14 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20260314_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "project" in existing_tables:
        return

    op.create_table(
        "project",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "task",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("priority", sa.String(), nullable=False),
        sa.Column("labels", sa.String(), nullable=True),
        sa.Column("project_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["project.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_task_project_id", "task", ["project_id"], unique=False)

    op.create_table(
        "taskdependency",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("source_task_id", sa.Integer(), nullable=False),
        sa.Column("target_task_id", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("source_handle", sa.String(), nullable=True),
        sa.Column("target_handle", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["source_task_id"], ["task.id"]),
        sa.ForeignKeyConstraint(["target_task_id"], ["task.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_taskdependency_source_target",
        "taskdependency",
        ["source_task_id", "target_task_id"],
        unique=False,
    )

    op.create_table(
        "contextentry",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=False),
        sa.Column("content", sa.String(), nullable=False),
        sa.Column("entry_type", sa.String(), nullable=False),
        sa.Column("summary", sa.String(), nullable=True),
        sa.Column("what_changed", sa.String(), nullable=True),
        sa.Column("files_touched", sa.String(), nullable=True),
        sa.Column("decisions", sa.String(), nullable=True),
        sa.Column("open_questions", sa.String(), nullable=True),
        sa.Column("next_step", sa.String(), nullable=True),
        sa.Column("actor", sa.String(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("timestamp", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["task_id"], ["task.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_contextentry_task_id", "contextentry", ["task_id"], unique=False
    )

    op.create_table(
        "activityevent",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("entity_type", sa.String(), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("task_id", sa.Integer(), nullable=True),
        sa.Column("task_title", sa.String(), nullable=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("summary", sa.String(), nullable=False),
        sa.Column("actor", sa.String(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("project_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["project.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_activityevent_project_id", "activityevent", ["project_id"], unique=False
    )
    op.create_index(
        "ix_activityevent_task_id", "activityevent", ["task_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_activityevent_task_id", table_name="activityevent")
    op.drop_index("ix_activityevent_project_id", table_name="activityevent")
    op.drop_table("activityevent")

    op.drop_index("ix_contextentry_task_id", table_name="contextentry")
    op.drop_table("contextentry")

    op.drop_index("ix_taskdependency_source_target", table_name="taskdependency")
    op.drop_table("taskdependency")

    op.drop_index("ix_task_project_id", table_name="task")
    op.drop_table("task")

    op.drop_table("project")
