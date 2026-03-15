# Remaining Implementation

This file tracks what still needs work before `improvement_plan.md` can be treated as fully closed.

## Immediate blockers

- Fix `nexus-context/src/App.test.tsx` so the Control Center smoke test renders reliably in Vitest. Right now that route can stay on the loading fallback during the test run.
- Fix `backend/tests/test_phase1.py` for `test_request_logging_emits_structured_message`. The test still does not deterministically capture `nexus.requests` output under the env-driven logging setup.
- Add `path_separator = os` to `backend/alembic.ini` to remove the Alembic deprecation warning during `backend/run_checks.py`.
- Re-run the full validation cycle after the two fixes above because the newest persistence, live update, and generated-type changes have not yet completed one end-to-end green run.

## Work already started but not fully closed

- Persistence/data-ops backend and UI were started in:
  - `backend/services/data_ops.py`
  - `backend/api/routers/data_ops.py`
  - `nexus-context/src/components/SettingsModal.tsx`
- Live update/SSE support was started in:
  - `backend/api/routers/ops.py`
  - `backend/telemetry.py`
  - `nexus-context/src/lib/live-updates.ts`
  - `nexus-context/src/pages/control-center/useControlCenter.ts`
  - `nexus-context/src/pages/memory/useMemoryHubData.ts`
- Generated contract sync and frontend smoke testing were started in:
  - `backend/openapi.json`
  - `nexus-context/src/lib/generated-api.ts`
  - `nexus-context/src/lib/api-types.ts`
  - `nexus-context/src/App.test.tsx`
  - `nexus-context/vitest.config.ts`

## Remaining implementation work

### Persistence and data operations

- Add backend tests for:
  - project export
  - project backup file creation
  - project import into a new project
  - project import with `replace_existing=true`
  - membership import behavior and owner safety
- Polish the frontend persistence UX in `nexus-context/src/components/SettingsModal.tsx`:
  - replace-existing toggle for imports
  - clearer import validation and error states
  - downloadable export flow instead of clipboard-only behavior
  - optional backup history listing
- Verify and document the backup storage strategy under `backend/backups/`.

### Live updates and operator runtime

- Finish stabilizing SSE/live refresh in Control Center and Memory Hub.
- Decide whether Workspace should also subscribe to live invalidation or keep current query invalidation behavior.
- Surface failed request/live error events more clearly in the UI instead of only relying on backend logs and metrics panels.

### Contract sync and generated API types

- Add scripts to regenerate:
  - `backend/openapi.json`
  - `nexus-context/src/lib/generated-api.ts`
- Keep the generated schema flow documented so frontend/backend contracts stay in sync.
- Review whether `OperatorMetrics` should remain hand-authored or get a dedicated typed response model from the backend.

### Frontend smoke tests

- Finish the Vitest smoke suite so `nexus-context/npm run check` stays green.
- Keep smoke coverage for:
  - Project Selector
  - Control Center
  - Workspace
- Consider adding one Settings modal smoke path once the base route tests are stable.

### Remaining refactor debt

- Split `nexus-context/src/components/SettingsModal.tsx` into smaller modules/hooks.
- Further split `nexus-context/src/pages/workspace/EasyWorkspaceView.tsx`.
- Review `nexus-context/src/pages/workspace/AdvancedWorkspaceView.tsx` for further decomposition.

### Docs and final closure

- Update:
  - `README.md`
  - `documentation.md`
  - `Plan.md`
- Document:
  - Alembic-driven bootstrapping replacing ad hoc startup migrations
  - new schema/index coverage
  - export/import/backup flows
  - `/events` live update endpoint
  - generated OpenAPI frontend types
  - frontend smoke tests
- Finish with a clean final validation run:
  - `backend\venv\Scripts\python.exe run_checks.py`
  - `cd nexus-context && npm run check`

## Done means

- Backend checks pass with no failing tests.
- Frontend `npm run check` passes including lint, smoke tests, and build.
- Docs cover the new runtime, persistence, and testing workflows.
- `improvement_plan.md` no longer has outstanding implementation items.
