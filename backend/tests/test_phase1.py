import asyncio
import importlib
import json
import logging
import os
import sys
import tempfile
import unittest
from unittest import mock
from pathlib import Path

from fastapi.testclient import TestClient
from sqlmodel import Session, create_engine, select

WORKSPACE_ROOT = Path(__file__).resolve().parents[2]
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

import backend.db.session as db_session
import backend.integrations.mcp_server as mcp_module
from backend.domain.models import Task
from backend.settings import get_settings
from backend.telemetry import request_telemetry

app_module = importlib.import_module("backend.app")


class BackendPhase1Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        get_settings.cache_clear()

    def setUp(self):
        request_telemetry.reset()
        self.temp_dir = tempfile.TemporaryDirectory()
        database_path = Path(self.temp_dir.name) / "test.db"
        self.test_engine = create_engine(
            f"sqlite:///{database_path.as_posix()}",
            connect_args={"check_same_thread": False},
        )

        self.original_db_engine = db_session.get_engine()
        self.original_database_url = db_session.get_database_url()

        db_session.set_engine(
            self.test_engine,
            f"sqlite:///{database_path.as_posix()}",
        )

        self.client_context = TestClient(app_module.create_app())
        self.client = self.client_context.__enter__()

    def tearDown(self):
        self.client_context.__exit__(None, None, None)
        self.client.close()
        db_session.set_engine(self.original_db_engine, self.original_database_url)
        get_settings.cache_clear()
        self.test_engine.dispose(close=True)
        self.temp_dir.cleanup()

    @classmethod
    def tearDownClass(cls):
        get_settings.cache_clear()

    def create_project(self, project_id: str, name: str | None = None) -> dict:
        response = self.client.post(
            "/api/projects",
            json={"id": project_id, "name": name or project_id.title()},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def auth_headers(self, user_id: str, role: str = "member") -> dict[str, str]:
        return {"X-Nexus-User": user_id, "X-Nexus-Role": role}

    def create_task(self, project_id: str, title: str, status: str = "todo") -> dict:
        response = self.client.post(
            "/api/tasks",
            json={
                "title": title,
                "status": status,
                "priority": "medium",
                "project_id": project_id,
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def create_dependency(self, source_task_id: int, target_task_id: int) -> dict:
        response = self.client.post(
            "/api/dependencies",
            json={
                "source_task_id": source_task_id,
                "target_task_id": target_task_id,
                "type": "blocks",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def create_handoff(
        self, task_id: int, project_id: str, summary: str, next_step: str
    ) -> dict:
        response = self.client.post(
            f"/api/tasks/{task_id}/context",
            params={"project_id": project_id},
            json={
                "entry_type": "handoff",
                "summary": summary,
                "next_step": next_step,
                "what_changed": f"Updated {summary}",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_workspace_snapshot_is_project_scoped(self):
        self.create_project("alpha")
        self.create_project("beta")

        alpha_one = self.create_task("alpha", "Alpha One")
        alpha_two = self.create_task("alpha", "Alpha Two")
        beta_one = self.create_task("beta", "Beta One")
        beta_two = self.create_task("beta", "Beta Two")

        self.create_dependency(alpha_one["id"], alpha_two["id"])
        self.create_dependency(beta_one["id"], beta_two["id"])

        self.create_handoff(alpha_one["id"], "alpha", "Alpha handoff", "Finish alpha")
        self.create_handoff(beta_one["id"], "beta", "Beta handoff", "Finish beta")

        response = self.client.get("/api/workspace", params={"project_id": "alpha"})
        self.assertEqual(response.status_code, 200, response.text)
        snapshot = response.json()

        task_ids = {task["id"] for task in snapshot["tasks"]}
        self.assertEqual(task_ids, {alpha_one["id"], alpha_two["id"]})

        dependency_pairs = {
            (item["source_task_id"], item["target_task_id"])
            for item in snapshot["dependencies"]
        }
        self.assertEqual(dependency_pairs, {(alpha_one["id"], alpha_two["id"])})

        memory_task_ids = {item["task_id"] for item in snapshot["memory"]}
        self.assertEqual(memory_task_ids, {alpha_one["id"], alpha_two["id"]})
        for memory_item in snapshot["memory"]:
            for entry in memory_item["recent_entries"]:
                self.assertIn(entry["task_id"], task_ids)

    def test_control_center_and_activity_are_project_scoped(self):
        self.create_project("alpha")
        self.create_project("beta")

        alpha_task = self.create_task("alpha", "Alpha Task")
        beta_task = self.create_task("beta", "Beta Task")

        self.create_handoff(alpha_task["id"], "alpha", "Alpha summary", "Alpha next")
        self.create_handoff(beta_task["id"], "beta", "Beta summary", "Beta next")

        response = self.client.get(
            "/api/control-center", params={"project_id": "alpha"}
        )
        self.assertEqual(response.status_code, 200, response.text)
        snapshot = response.json()

        self.assertEqual(snapshot["total_tasks"], 1)
        self.assertEqual(snapshot["handoffs_last_7_days"], 1)
        self.assertTrue(
            all(
                item["task_id"] == alpha_task["id"]
                for item in snapshot["latest_handoffs"]
            )
        )

        activity_response = self.client.get(
            "/api/activity", params={"project_id": "alpha"}
        )
        self.assertEqual(activity_response.status_code, 200, activity_response.text)
        activity = activity_response.json()
        self.assertTrue(activity)
        self.assertTrue(all(event["project_id"] == "alpha" for event in activity))

    def test_cross_project_dependency_is_rejected(self):
        self.create_project("alpha")
        self.create_project("beta")

        alpha_task = self.create_task("alpha", "Alpha Task")
        beta_task = self.create_task("beta", "Beta Task")

        response = self.client.post(
            "/api/dependencies",
            json={
                "source_task_id": alpha_task["id"],
                "target_task_id": beta_task["id"],
                "type": "blocks",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("same project", response.json()["detail"])

    def test_task_detail_endpoints_require_matching_project(self):
        self.create_project("alpha")
        self.create_project("beta")

        beta_task = self.create_task("beta", "Beta Task")
        self.create_handoff(beta_task["id"], "beta", "Beta summary", "Beta next")

        for path in (
            f"/api/tasks/{beta_task['id']}/context",
            f"/api/tasks/{beta_task['id']}/memory",
            f"/api/tasks/{beta_task['id']}/resume-packet",
        ):
            response = self.client.get(path, params={"project_id": "alpha"})
            self.assertEqual(response.status_code, 404, response.text)

    def test_mcp_create_task_respects_project_scope(self):
        self.create_project("alpha")

        result = asyncio.run(
            mcp_module.create_task(
                title="Created from MCP",
                description="Scoped task",
                project_id="alpha",
            )
        )

        self.assertIn("Task created with ID", result)

        with Session(self.test_engine) as session:
            task = session.exec(
                select(Task).where(Task.title == "Created from MCP")
            ).one()
            self.assertEqual(task.project_id, "alpha")

        graph_payload = json.loads(
            asyncio.run(mcp_module.get_task_graph(project_id="alpha"))
        )
        graph_titles = {task["title"] for task in graph_payload["tasks"]}
        self.assertIn("Created from MCP", graph_titles)

    def test_control_center_uses_configured_public_mcp_urls(self):
        from unittest.mock import patch

        get_settings.cache_clear()
        with patch.dict(
            "os.environ",
            {
                "NEXUS_PUBLIC_MCP_BASE_URL": "https://example.test/custom-mcp",
            },
            clear=False,
        ):
            get_settings.cache_clear()
            response = self.client.get("/api/control-center")

        self.assertEqual(response.status_code, 200, response.text)
        server = response.json()["server"]
        self.assertEqual(server["sse_url"], "https://example.test/custom-mcp/sse")
        self.assertEqual(
            server["post_message_url"],
            "https://example.test/custom-mcp/messages",
        )
        get_settings.cache_clear()

    def test_health_and_ready_endpoints_respond(self):
        health_response = self.client.get("/health")
        self.assertEqual(health_response.status_code, 200, health_response.text)
        self.assertEqual(health_response.json()["status"], "ok")
        self.assertIn("request_id", health_response.json())
        self.assertTrue(health_response.headers.get("X-Request-ID"))

        ready_response = self.client.get("/ready")
        self.assertEqual(ready_response.status_code, 200, ready_response.text)
        self.assertEqual(ready_response.json()["status"], "ready")
        self.assertIn("request_id", ready_response.json())

        config_response = self.client.get("/config")
        self.assertEqual(config_response.status_code, 200, config_response.text)
        self.assertEqual(config_response.json()["status"], "ok")
        self.assertIn("request_logging_enabled", config_response.json())
        self.assertIn("telemetry_recent_request_limit", config_response.json())

    def test_metrics_endpoint_reports_counts(self):
        self.create_project("alpha")
        task_one = self.create_task("alpha", "Alpha One", status="todo")
        task_two = self.create_task("alpha", "Alpha Two", status="in_progress")
        self.create_handoff(task_one["id"], "alpha", "Alpha summary", "Alpha next")
        self.create_dependency(task_two["id"], task_one["id"])

        response = self.client.get("/metrics", params={"project_id": "alpha"})
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()

        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["project_id"], "alpha")
        self.assertEqual(payload["task_count"], 2)
        self.assertEqual(payload["dependency_count"], 1)
        self.assertEqual(payload["context_entry_count"], 1)
        self.assertEqual(payload["todo_task_count"], 1)
        self.assertEqual(payload["in_progress_task_count"], 1)
        self.assertEqual(payload["done_task_count"], 0)
        self.assertIn("request_id", payload)
        self.assertGreaterEqual(payload["request_totals"]["total"], 1)
        self.assertEqual(payload["request_totals"]["last_request_path"], "/metrics")
        self.assertIn("average_duration_ms", payload["request_totals"])
        self.assertIn("max_duration_ms", payload["request_totals"])
        self.assertGreaterEqual(payload["request_totals"]["max_duration_ms"], 0)
        self.assertTrue(payload["recent_requests"])
        self.assertEqual(payload["recent_requests"][0]["path"], "/api/dependencies")
        self.assertIn("duration_ms", payload["recent_requests"][0])
        self.assertTrue(payload["path_aggregates"])
        aggregates_by_path = {item["path"]: item for item in payload["path_aggregates"]}
        self.assertIn("/api/tasks", aggregates_by_path)
        self.assertIn("/api/dependencies", aggregates_by_path)
        self.assertGreaterEqual(aggregates_by_path["/api/tasks"]["total_requests"], 2)
        self.assertEqual(aggregates_by_path["/api/dependencies"]["total_requests"], 1)
        self.assertIn("average_duration_ms", aggregates_by_path["/api/dependencies"])
        self.assertTrue(payload["latency_trend"])
        self.assertIn("request_count", payload["latency_trend"][0])
        self.assertIn("average_duration_ms", payload["latency_trend"][0])
        self.assertEqual(payload["telemetry_window"]["recent_request_limit"], 12)

    def test_request_logging_emits_structured_message(self):
        get_settings.cache_clear()
        logger = logging.getLogger("nexus.requests")
        response = None

        with mock.patch.dict(
            os.environ,
            {
                "NEXUS_REQUEST_LOGGING_ENABLED": "true",
                "NEXUS_REQUEST_LOG_LEVEL": "INFO",
            },
            clear=False,
        ):
            get_settings.cache_clear()
            local_client_context = TestClient(app_module.create_app())
            local_client = local_client_context.__enter__()
            try:
                with self.assertLogs(logger, level="INFO") as captured:
                    response = local_client.get(
                        "/health", headers={"X-Request-ID": "test-request-id"}
                    )
            finally:
                local_client_context.__exit__(None, None, None)
                local_client.close()

        assert response is not None
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.headers.get("X-Request-ID"), "test-request-id")
        self.assertTrue(
            any(
                "request_completed request_id=test-request-id method=GET path=/health status_code=200"
                in message
                for message in captured.output
            )
        )

    def test_project_access_is_restricted_without_membership(self):
        owner_headers = self.auth_headers("owner")
        outsider_headers = self.auth_headers("outsider")

        response = self.client.post(
            "/api/projects",
            json={"id": "alpha", "name": "Alpha"},
            headers=owner_headers,
        )
        self.assertEqual(response.status_code, 200, response.text)

        read_response = self.client.get("/api/projects/alpha", headers=outsider_headers)
        self.assertEqual(read_response.status_code, 403, read_response.text)

        list_response = self.client.get("/api/projects", headers=outsider_headers)
        self.assertEqual(list_response.status_code, 200, list_response.text)
        self.assertEqual(list_response.json(), [])

    def test_project_membership_grants_access(self):
        owner_headers = self.auth_headers("owner")
        collaborator_headers = self.auth_headers("collab")

        create_response = self.client.post(
            "/api/projects",
            json={"id": "alpha", "name": "Alpha"},
            headers=owner_headers,
        )
        self.assertEqual(create_response.status_code, 200, create_response.text)

        membership_response = self.client.post(
            "/api/projects/alpha/memberships",
            json={"user_id": "collab", "role": "member"},
            headers=owner_headers,
        )
        self.assertEqual(membership_response.status_code, 200, membership_response.text)

        project_response = self.client.get(
            "/api/projects/alpha", headers=collaborator_headers
        )
        self.assertEqual(project_response.status_code, 200, project_response.text)

        membership_list_response = self.client.get(
            "/api/projects/alpha/memberships", headers=collaborator_headers
        )
        self.assertEqual(
            membership_list_response.status_code, 200, membership_list_response.text
        )
        memberships = membership_list_response.json()
        self.assertTrue(any(item["user_id"] == "collab" for item in memberships))

    def test_project_membership_can_be_removed(self):
        owner_headers = self.auth_headers("owner")
        collaborator_headers = self.auth_headers("collab")

        create_response = self.client.post(
            "/api/projects",
            json={"id": "alpha", "name": "Alpha"},
            headers=owner_headers,
        )
        self.assertEqual(create_response.status_code, 200, create_response.text)

        membership_response = self.client.post(
            "/api/projects/alpha/memberships",
            json={"user_id": "collab", "role": "member"},
            headers=owner_headers,
        )
        self.assertEqual(membership_response.status_code, 200, membership_response.text)

        delete_response = self.client.delete(
            "/api/projects/alpha/memberships/collab",
            headers=owner_headers,
        )
        self.assertEqual(delete_response.status_code, 200, delete_response.text)

        access_response = self.client.get(
            "/api/projects/alpha",
            headers=collaborator_headers,
        )
        self.assertEqual(access_response.status_code, 403, access_response.text)

    def test_project_creator_membership_cannot_be_removed(self):
        owner_headers = self.auth_headers("owner")

        create_response = self.client.post(
            "/api/projects",
            json={"id": "alpha", "name": "Alpha"},
            headers=owner_headers,
        )
        self.assertEqual(create_response.status_code, 200, create_response.text)

        delete_response = self.client.delete(
            "/api/projects/alpha/memberships/owner",
            headers=owner_headers,
        )
        self.assertEqual(delete_response.status_code, 400, delete_response.text)
        self.assertIn("creator", delete_response.json()["detail"].lower())

    def test_admin_can_access_any_project(self):
        owner_headers = self.auth_headers("owner")
        admin_headers = self.auth_headers("ops-admin", role="admin")

        response = self.client.post(
            "/api/projects",
            json={"id": "alpha", "name": "Alpha"},
            headers=owner_headers,
        )
        self.assertEqual(response.status_code, 200, response.text)

        read_response = self.client.get("/api/projects/alpha", headers=admin_headers)
        self.assertEqual(read_response.status_code, 200, read_response.text)

    def test_project_archive_hides_project_from_member_views(self):
        owner_headers = self.auth_headers("owner")
        response = self.client.post(
            "/api/projects",
            json={"id": "alpha", "name": "Alpha"},
            headers=owner_headers,
        )
        self.assertEqual(response.status_code, 200, response.text)

        archive_response = self.client.patch(
            "/api/projects/alpha/archive",
            json={"archived": True},
            headers=owner_headers,
        )
        self.assertEqual(archive_response.status_code, 200, archive_response.text)
        self.assertTrue(archive_response.json()["archived"])

        list_response = self.client.get("/api/projects", headers=owner_headers)
        self.assertEqual(list_response.status_code, 200, list_response.text)
        self.assertEqual(list_response.json(), [])

        archived_read_response = self.client.get(
            "/api/projects/alpha", headers=owner_headers
        )
        self.assertEqual(
            archived_read_response.status_code, 200, archived_read_response.text
        )

    def test_task_archive_removes_task_from_active_views(self):
        owner_headers = self.auth_headers("owner")
        project_response = self.client.post(
            "/api/projects",
            json={"id": "alpha", "name": "Alpha"},
            headers=owner_headers,
        )
        self.assertEqual(project_response.status_code, 200, project_response.text)

        task_response = self.client.post(
            "/api/tasks",
            json={
                "title": "Archive me",
                "status": "todo",
                "priority": "medium",
                "project_id": "alpha",
            },
            headers=owner_headers,
        )
        self.assertEqual(task_response.status_code, 200, task_response.text)
        task_id = task_response.json()["id"]

        archive_response = self.client.patch(
            f"/api/tasks/{task_id}/archive",
            json={"archived": True},
            headers=owner_headers,
        )
        self.assertEqual(archive_response.status_code, 200, archive_response.text)
        self.assertTrue(archive_response.json()["archived"])

        tasks_response = self.client.get(
            "/api/tasks", params={"project_id": "alpha"}, headers=owner_headers
        )
        self.assertEqual(tasks_response.status_code, 200, tasks_response.text)
        self.assertEqual(tasks_response.json(), [])

        memory_response = self.client.get(
            "/api/memory", params={"project_id": "alpha"}, headers=owner_headers
        )
        self.assertEqual(memory_response.status_code, 200, memory_response.text)
        self.assertEqual(memory_response.json(), [])

    def test_members_cannot_archive_or_delete_project_content(self):
        owner_headers = self.auth_headers("owner")
        member_headers = self.auth_headers("member")

        create_project_response = self.client.post(
            "/api/projects",
            json={"id": "alpha", "name": "Alpha"},
            headers=owner_headers,
        )
        self.assertEqual(
            create_project_response.status_code, 200, create_project_response.text
        )

        create_task_response = self.client.post(
            "/api/tasks",
            json={
                "title": "Protected task",
                "status": "todo",
                "priority": "medium",
                "project_id": "alpha",
            },
            headers=owner_headers,
        )
        self.assertEqual(
            create_task_response.status_code, 200, create_task_response.text
        )
        task_id = create_task_response.json()["id"]

        membership_response = self.client.post(
            "/api/projects/alpha/memberships",
            json={"user_id": "member", "role": "member"},
            headers=owner_headers,
        )
        self.assertEqual(membership_response.status_code, 200, membership_response.text)

        archive_project_response = self.client.patch(
            "/api/projects/alpha/archive",
            json={"archived": True},
            headers=member_headers,
        )
        self.assertEqual(archive_project_response.status_code, 403)

        archive_task_response = self.client.patch(
            f"/api/tasks/{task_id}/archive",
            json={"archived": True},
            headers=member_headers,
        )
        self.assertEqual(archive_task_response.status_code, 403)

        delete_task_response = self.client.delete(
            f"/api/tasks/{task_id}", headers=member_headers
        )
        self.assertEqual(delete_task_response.status_code, 403)

    def test_memory_search_filters_results(self):
        owner_headers = self.auth_headers("owner")
        create_project_response = self.client.post(
            "/api/projects",
            json={"id": "alpha", "name": "Alpha"},
            headers=owner_headers,
        )
        self.assertEqual(
            create_project_response.status_code, 200, create_project_response.text
        )

        alpha_task_response = self.client.post(
            "/api/tasks",
            json={
                "title": "API pipeline",
                "status": "todo",
                "priority": "medium",
                "project_id": "alpha",
            },
            headers=owner_headers,
        )
        self.assertEqual(alpha_task_response.status_code, 200, alpha_task_response.text)
        alpha_task_id = alpha_task_response.json()["id"]

        beta_task_response = self.client.post(
            "/api/tasks",
            json={
                "title": "UI polish",
                "status": "todo",
                "priority": "medium",
                "project_id": "alpha",
            },
            headers=owner_headers,
        )
        self.assertEqual(beta_task_response.status_code, 200, beta_task_response.text)
        beta_task_id = beta_task_response.json()["id"]

        first_context_response = self.client.post(
            f"/api/tasks/{alpha_task_id}/context",
            params={"project_id": "alpha"},
            json={
                "entry_type": "handoff",
                "summary": "Investigated memory cache bug",
                "next_step": "Patch memory cache invalidation",
            },
            headers=owner_headers,
        )
        self.assertEqual(
            first_context_response.status_code, 200, first_context_response.text
        )

        second_context_response = self.client.post(
            f"/api/tasks/{beta_task_id}/context",
            params={"project_id": "alpha"},
            json={
                "entry_type": "handoff",
                "summary": "Adjusted hero spacing",
                "next_step": "Tune mobile gutters",
            },
            headers=owner_headers,
        )
        self.assertEqual(
            second_context_response.status_code, 200, second_context_response.text
        )

        search_response = self.client.get(
            "/api/memory",
            params={"project_id": "alpha", "search": "cache"},
            headers=owner_headers,
        )
        self.assertEqual(search_response.status_code, 200, search_response.text)
        results = search_response.json()
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["task_id"], alpha_task_id)

    def test_activity_search_filters_results(self):
        owner_headers = self.auth_headers("owner")
        create_project_response = self.client.post(
            "/api/projects",
            json={"id": "alpha", "name": "Alpha"},
            headers=owner_headers,
        )
        self.assertEqual(
            create_project_response.status_code, 200, create_project_response.text
        )

        task_response = self.client.post(
            "/api/tasks",
            json={
                "title": "Searchable task",
                "status": "todo",
                "priority": "medium",
                "project_id": "alpha",
            },
            headers=owner_headers,
        )
        self.assertEqual(task_response.status_code, 200, task_response.text)
        task_id = task_response.json()["id"]

        handoff_response = self.client.post(
            f"/api/tasks/{task_id}/context",
            params={"project_id": "alpha"},
            json={
                "entry_type": "handoff",
                "summary": "Need follow-up on token rotation",
                "next_step": "Finish token rotation rollout",
            },
            headers=owner_headers,
        )
        self.assertEqual(handoff_response.status_code, 200, handoff_response.text)

        search_response = self.client.get(
            "/api/activity",
            params={"project_id": "alpha", "search": "token rotation"},
            headers=owner_headers,
        )
        self.assertEqual(search_response.status_code, 200, search_response.text)
        events = search_response.json()
        self.assertTrue(events)
        self.assertTrue(
            all(
                "token rotation"
                in ((event["summary"] or "") + " " + (event["title"] or "")).lower()
                for event in events
            )
        )


if __name__ == "__main__":
    unittest.main()
