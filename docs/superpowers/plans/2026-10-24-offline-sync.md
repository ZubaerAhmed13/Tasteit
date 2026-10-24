# Offline and Sync Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans; native implementation and one final independent review.

**Goal:** Complete offline use, optional account sync and mobile reliability, then update the private preview.
**Architecture:** Versioned snapshot API, a local-first reconciliation controller and a narrowly scoped service worker. Existing UI and records remain.
**Tech Stack:** Browser JavaScript, Cloudflare Worker/D1, Node/SQLite tests, Playwright, build-only esbuild/Drizzle tools.
**Spec:** docs/superpowers/specs/2026-10-24-offline-sync-design.md

## Global Constraints
- PR #1 remains draft and unmerged; update only the existing private Site.
- Browser data stays local unless the person enables cloud sync.
- Preserve version-1 backups, all existing IDs and browser workflows.
- Cache no authentication pages, API/private responses or remote photographs.
- Keep the browser app dependency-free; build-only tooling is permitted.

## Review Focus
- A login response cannot be replaced by a cached authenticated shell.
- Concurrent device saves and edits during upload/review must never be silently lost.
- Trusted account identity and SQL predicates must isolate every cloud operation.
- Storage/network failures cannot produce a false synced state or erase local data.
- Tombstones, account changes and disabling sync must preserve the browser copy.

## Task 1: Versioned account API and schema
**Files:** server/sync-api.js, db/schema.ts, drizzle/, drizzle.config.ts,
tests/sync-api.test.js, tests/helpers/sqlite-d1.js, package.json.
**Interfaces:** handleSync(request,env) -> Response; GET/PUT/DELETE /api/sync,
{accountId,revision,updatedAt,data}, PUT {revision,data}, DELETE {revision}.
- [x] Write/run failing identity/origin, size, malformed-data, account-isolation,
  stale-write and tombstone tests against a real SQLite D1 adapter.
- [x] Implement bounded validation, parameterised CAS SQL and no-store responses.
- [x] Generate/inspect schema-only migration; verify existing Node suite and commit.

## Task 2: Local-first reconciliation controller
**Files:** src/cloud-sync.js, tests/cloud-sync.test.js, src/model.js.
**Interfaces:** createCloudSync({readLocal,writeLocal,readMeta,writeMeta,fetch,onState,isOnline})
returns connect(), sync(), resolve(choice), disconnect(), removeCloud(), changed(), get state.
- [x] Write/run failing tests for first sync, two-sided conflict, in-flight local
  edits, account changes, stale resolution, failed storage, retry and cloud removal.
- [x] Implement serial requests, persisted common snapshot and explicit choices.
- [x] Notify the controller only after successful local writes; verify suite and commit.

## Task 3: Offline shell and connected UI
**Files:** sw.js, app.webmanifest, src/offline.js, src/app.js, index.html,
styles.css, tests/offline.test.js, tests/continuity-browser.mjs, workflow/test servers.
**Interfaces:** offlineRecipes(saved,filters); controller from Task 2; /api/sync.
- [x] Write/run failing offline filtering/cache-boundary and browser scenarios.
- [x] Add safe shell caching/update controls and offline saved-recipe recovery.
- [x] Add sync consent/status/conflict/removal controls and preserve local drafts.
- [x] Improve phone targets, inputs and safe-area layout; run Node/browser checks.

## Task 4: Worker packaging, independent review and publication
**Files:** scripts/build-site.mjs, server/worker.js, README.md, docs/ACCEPTANCE.md,
existing Site source manifest and generated package.
**Interfaces:** verified GitHub feature SHA, private Site identity and D1 binding DB.
- [x] Bundle all app assets and API into a Worker; include generated migrations.
- [x] Run the full five-suite browser matrix and one independent stage review.
- [x] Fix material findings with regressions; publish the verified private version.
- [x] Record source parity, native deployment result and remaining authenticated/device limits.

Completed 24 October 2026. See docs/ACCEPTANCE.md for CI, exact-source publication and remaining hosted/device acceptance.
