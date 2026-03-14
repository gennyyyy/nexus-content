# Improvement Plan

Last updated: 2026-03-14

## Scope

This plan covers the current frontend and backend only:

- `backend/`
- `nexus-context/`

It intentionally excludes `discord-bot/`.

## What We Completed So Far

- Refactored the backend into a layered package structure under `backend/`
- Split responsibilities across `backend/app.py`, `backend/api/`, `backend/services/`, `backend/domain/`, `backend/db/`, and `backend/integrations/mcp_server.py`
- Preserved the current backend startup flow with `uvicorn main:app` through `backend/main.py`
- Removed the local MCP package collision by moving custom MCP logic into `backend/integrations/mcp_server.py`
- Verified core backend routes respond successfully:
  - `/api/projects`
  - `/api/tasks`
  - `/api/control-center`

## Current Strengths

- Strong core domain around tasks, dependencies, structured handoffs, and resume packets
- Cleaner backend separation between routing, business logic, persistence, and MCP integration
- Workspace is the strongest frontend feature area from an architectural standpoint
- Activity tracking and context handoffs already provide clear product value

## Highest Priority Risks

1. Project scoping is incomplete across backend views and MCP flows
2. There are no automated tests for backend or frontend
3. Database migrations are still ad hoc startup mutations in `backend/db/session.py`
4. API types are duplicated manually in `nexus-context/src/lib/api.ts`
5. Some frontend files are too large and mix too many responsibilities
6. Documentation is stale and no longer fully matches the current architecture and routes
7. Runtime configuration and deployment setup are still local-dev oriented

## Roadmap

### Phase 1 - Correctness and Safety (next 1-2 weeks)

#### 1. Fix project scoping end-to-end

- Scope dependencies, activity, context entries, workspace snapshots, and control-center metrics by project
- Make MCP-created tasks project-aware
- Primary files:
  - `backend/services/views.py`
  - `backend/services/activity.py`
  - `backend/integrations/mcp_server.py`
  - `backend/domain/models.py`

#### 2. Add minimal automated test coverage

- Backend tests for:
  - workspace snapshot correctness
  - resume packet generation
  - task/dependency/activity side effects
  - MCP tool behavior
- Frontend smoke tests for:
  - project routing
  - control center rendering
  - workspace rendering

#### 3. Fix known UX correctness issues

- Fix broken project-scoped links from the control center
- Remove or archive dead legacy pages if they are no longer used
- Primary files:
  - `nexus-context/src/pages/ControlCenter.tsx`
  - `nexus-context/src/App.tsx`
  - `nexus-context/src/pages/TaskGraph.tsx`
  - `nexus-context/src/pages/KanbanBoard.tsx`

#### 4. Update documentation to match reality

- Update:
  - `README.md`
  - `documentation.md`
  - `Plan.md`

#### 5. Replace ad hoc migrations with versioned migrations

- Introduce Alembic or an equivalent migration workflow
- Reduce or remove schema mutation logic in `backend/db/session.py`

### Phase 2 - Consistency and Maintainability (next 1-2 months)

#### 1. Standardize frontend data fetching

- Move more features onto shared React Query patterns similar to the workspace
- Primary files:
  - `nexus-context/src/pages/control-center/useControlCenter.ts`
  - `nexus-context/src/pages/MemoryHub.tsx`
  - `nexus-context/src/components/TaskContextModal.tsx`
  - `nexus-context/src/pages/ProjectSelector.tsx`

#### 2. Break up oversized frontend components

- Refactor:
  - `nexus-context/src/pages/ControlCenter.tsx`
  - `nexus-context/src/components/TaskContextModal.tsx`
  - `nexus-context/src/pages/workspace/AdvancedWorkspaceView.tsx`
  - `nexus-context/src/pages/workspace/EasyWorkspaceView.tsx`

#### 3. Remove API contract drift

- Generate TypeScript types or a client from FastAPI OpenAPI
- Reduce manual duplication in `nexus-context/src/lib/api.ts`

#### 4. Add a real config/settings layer

- Support:
  - database URL
  - CORS origins
  - public API and MCP URLs
  - environment mode
- Primary files:
  - `backend/app.py`
  - `backend/db/session.py`
  - `nexus-context/.env.example`

#### 5. Improve developer experience

- Pin backend dependencies
- Add CI checks
- Add lint/test commands
- Document architecture and local development flow clearly

### Phase 3 - Scale and Product Maturity (next 3-6 months)

#### 1. Improve persistence and data operations

- Add indexes where needed
- Define backup, export, and import flows
- Consider Postgres if multi-user support or larger write volume becomes important

#### 2. Make MCP fully project-aware and operator-grade

- Pass project scope through all MCP tools
- Add explicit health and readiness checks
- Consider live update patterns instead of only polling

#### 3. Add auth and multi-user boundaries

- Add user and project ownership
- Add permissions and access rules
- Strengthen audit guarantees

#### 4. Improve observability and runtime operations

- Structured logging
- Health endpoints
- Error reporting
- Performance monitoring

#### 5. Refine product UX

- Search and filter across memory and activity
- Archive flows
- Better empty states and onboarding
- Clearer explanations for ready, blocked, and handoff quality states

## Recommended Execution Order

1. Fix project scoping
2. Add backend tests
3. Update docs
4. Introduce versioned migrations
5. Fix route correctness issues
6. Standardize frontend query and state handling
7. Split oversized components
8. Generate API client or shared types
9. Add config, CI, and deployment basics
10. Plan scale, auth, and observability work

## Success Criteria

### Short-term

- Project-scoped pages only show project-scoped data
- MCP-created tasks land in the correct project
- Key backend flows have automated tests
- Documentation matches actual routes, commands, and architecture

### Mid-term

- Frontend data flow is consistent across major features
- Large UI files are split into smaller feature modules
- API contract drift is reduced or eliminated
- Migrations are versioned and repeatable

### Long-term

- The system supports safer upgrades and larger datasets
- Operational debugging is easier
- Product workflows are more predictable for both humans and agents
