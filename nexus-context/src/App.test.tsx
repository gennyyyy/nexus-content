import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderApp } from "./test/render-app";

vi.mock("./lib/api", async () => {
  const actual = await vi.importActual<object>("./lib/api");
  return {
    ...actual,
    fetchProjectsWithOptions: vi.fn(async () => [
      {
        id: "alpha",
        name: "Alpha",
        description: "Alpha project",
        owner_user_id: "default-user",
        archived: false,
        created_at: new Date().toISOString(),
      },
    ]),
    fetchControlCenterSnapshot: vi.fn(async () => ({
      generated_at: new Date().toISOString(),
      total_tasks: 1,
      todo_count: 1,
      in_progress_count: 0,
      done_count: 0,
      ready_count: 1,
      blocked_count: 0,
      handoff_gap_count: 0,
      handoffs_last_7_days: 0,
      ready_queue: [],
      attention_tasks: [],
      latest_handoffs: [],
      server: {
        name: "Nexus Context",
        transport: "sse",
        status: "online",
        sse_url: "http://localhost:8000/mcp/sse",
        post_message_url: "http://localhost:8000/mcp/messages",
      },
    })),
    fetchActivityFeed: vi.fn(async () => []),
    fetchOperatorMetrics: vi.fn(async () => ({
      status: "ok",
      environment: "test",
      request_id: "req-1",
      project_id: "alpha",
      task_count: 1,
      dependency_count: 0,
      context_entry_count: 0,
      ready_task_count: 1,
      blocked_task_count: 0,
      in_progress_task_count: 0,
      todo_task_count: 1,
      done_task_count: 0,
      request_totals: {
        total: 1,
        failed: 0,
        last_request_id: "req-1",
        last_request_path: "/metrics",
        last_status_code: 200,
        average_duration_ms: 2,
        max_duration_ms: 2,
      },
      recent_requests: [],
      path_aggregates: [],
      latency_trend: [],
      telemetry_window: {
        recent_request_limit: 12,
        path_aggregate_limit: 10,
      },
    })),
    fetchMemoryOverview: vi.fn(async () => []),
    fetchTasksWithOptions: vi.fn(async () => []),
    fetchWorkspaceSnapshot: vi.fn(async () => ({
      tasks: [],
      dependencies: [],
      memory: [],
      task_states: [],
    })),
  };
});

describe("App smoke routes", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "EventSource",
      class {
        close() {}
        addEventListener() {}
      } as unknown as typeof EventSource,
    );
  });

  it("renders the project selector route", async () => {
    renderApp(["/projects"]);

    await waitFor(() => {
      expect(screen.getByText("Workspaces")).toBeTruthy();
    });
  });

  it("renders the control center route", async () => {
    renderApp(["/projects/alpha/control-center"]);

    await waitFor(() => {
      expect(screen.getByText("Operations view for agent-ready work")).toBeTruthy();
    });
  });

  it("renders the workspace route", async () => {
    renderApp(["/projects/alpha/workspace"]);

    await waitFor(() => {
      expect(screen.getByText("Easy Mode")).toBeTruthy();
    });
  });
});
