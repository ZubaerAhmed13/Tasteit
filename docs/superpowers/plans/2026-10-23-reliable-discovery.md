# Reliable Discovery Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task by task.

**Goal:** Reliable local saves and a compact, navigable discovery journey.
**Architecture:** Keep vanilla modules; add transactional store updates and pure
route/filter helpers. Use explicit API reports and integrate them at their owners.
**Tech Stack:** JavaScript modules, Node tests, Playwright fixture acceptance.
**Spec:** docs/superpowers/specs/2026-10-23-reliable-discovery-design.md

## Global Constraints
- No merge or deployment; update the existing draft PR.
- No product dependencies, copied photos, backend, or record/backup migration.
- Preserve source attribution and existing kitchen/cooking/research features.

## Review Focus
- Failed storage must not leak nested mutations into memory or remove planned meals.
- All-failed and partially failed ingredient searches must retain offline local matches.
- Sparse filter summaries need ID intersections, not absent-field guessing.
- Slow requests must respect navigation, cancellation and the latest recipe intent.
- Direct recipe URLs and modal Back must work on a static subdirectory host.

## Task 1: Atomic saves and truthful service results
**Files:** src/model.js, src/api.js, src/app.js, tests/model.test.js,
tests/api-reliability.test.js, tests/app-state.test.js.
**Interfaces:** commitStorePatch(store, patch, persist?) returns boolean;
pantryCandidateReport(ingredients, signal) and discoverMeals(filters, signal)
return {meals, partial}; existing API wrappers remain compatible.
- [x] Write and run failing regressions for storage failure, empty/all-failed/partial
  requests, cancellation and combined source-ID filtering.
- [x] Implement bounded requests and transactional recipe flags/labels/cache updates.
- [x] Run npm run verify; commit the independently testable reliability changes.

## Task 2: Compact filters and browser navigation
**Files:** src/navigation.js, src/app.js, styles.css, tests/navigation.test.js,
tests/browser-smoke.mjs, package.json.
**Interfaces:** readRoute(url), routeUrl(route, base), normaliseFilters(input),
filterSummary(filters); route contains view, query, area, category, letter,
kitchen and recipe. Task 1's API accepts the same discovery fields.
- [x] Write/run failing route and UI regressions for composed filters, reload,
  Back/Forward, direct recipes, stale requests and narrow mobile layouts.
- [x] Replace filter rails with a compact form; preserve current-filter recovery.
- [x] Integrate URL state and cancellable recipe opening without changing data IDs.
- [x] Run Node and browser acceptance; update README and acceptance notes; commit.

## Task 3: Review and draft PR verification
**Files:** directly affected fixes and docs only.
- [x] Run the full Node suite and browser matrix when available.
- [x] Request one independent review of this stage's diff; fix material findings
  with regressions and rerun affected checks.
- [x] Push to the existing branch, verify GitHub CI, and report remaining limits.

## Completed verification

The existing persist-before-assignment pattern was kept at each event owner; no
new store-action abstraction was needed. Independent review found no remaining
material issues after draft preservation and deterministic date fixes.

All 115 Node tests and Chromium, Firefox and WebKit acceptance passed on
`c8966d71fe51067fbeee2c54a20952fc8f7b09ce` in
[CI run 40038698323](https://github.com/ZubaerAhmed13/Tasteit/actions/runs/40038698323).
Physical-device and live-service release checks remain open.
