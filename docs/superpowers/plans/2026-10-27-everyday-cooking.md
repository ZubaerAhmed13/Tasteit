# Everyday Cooking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Plan multiple daily meals and assist everyday cooking without losing old data or inventing source facts.
**Architecture:** Additive flat plan keys and v2 backup envelope with v1 support; shared pure planning helpers. Extend existing recipe/controller UI and ingredient reference resolver.
**Tech Stack:** Vanilla JS, Node tests, Worker, existing Playwright CI.
**Spec:** docs/superpowers/specs/2026-10-27-everyday-cooking-design.md

## Global Constraints

- Same owner-private Site, PR1 draft and unmerged; no schema/database/dependency migration.
- Preserve IDs, genuine ratings, exact ingredient lines, photo rights and all existing recovery/sync guards.
- Dinner retains date key; other keys date:breakfast, date:lunch, date:snack. Four slots, no duplicates.
- Backup v2 exports, v1 imports; unknown quantities remain unknown.

## Review Focus

- Old browser/cloud payloads and last-good snapshots must remain readable without plan loss (Task1).
- Duplicate recipes in two slots must double requirements without duplicate purchase application (Task1).
- Previous/future week navigation must retain plans and keep shopping's coming-week scope explicit (Task2).
- Publisher preparation assistance must resume checked ingredients/timer and expose original method, without inventing steps (Task3).
- Cache must preserve exact food/form matching, genuine credits and missing-image layout (Task4).

### Task 1: Meal slot storage and shopping
**Files:** src/meal-plan.js (new), src/model.js, src/recipe-planning.js, src/kitchen-flow.js, server/sync-api.js, tests/meal-plan.test.js.
**Interfaces:** planKey(day,slot='dinner')->key; planForDates(plan,dates)->plan subset. planRecipe(store,meal,day,slot='dinner')->validated store; v2 export/parser accepts slot keys.
- [x] Add behavioral tests: breakfast+dinner coexist, independent servings, repeated shopping sum, v1 roundtrip, v2 strict/recovery/sync handling, invalid calendar dates/slots and purchase review.
- [x] Run `node --test tests/meal-plan.test.js`; expected new behavior failures.
- [x] Implement pure helpers, shared backup validation and all consumer shopping scope changes.
- [x] Run `npm run verify`; expected all pass. Commit.

### Task 2: Daily meal planning interface
**Files:** src/app.js, styles.css, tests/everyday-cooking-browser.mjs, .github/workflows/verify.yml.
**Interfaces:** consumes Task1 planKey and planForDates; four labelled per-day controls and independent servings, previous/next/reset week and direct recipe open; detail day+slot selection.
- [x] Add browser journey: plan breakfast/dinner, reload, edit independent servings, browse next week and return, shopping includes both; 320px reflow. Keep existing browser contracts aligned to Dinner explicitly.
- [x] Run new journey in CI; expected missing slot controls.
- [x] Implement UI and migrate coming-week shopping call sites. Keep storage changes atomic.
- [x] Run `npm run verify` and browser CI; expected all pass. Commit.

### Task 3: Source metadata and preparation assistance
**Files:** src/cooking.js, src/app.js, src/recipe-metadata.js (new), data/recipe-planning-metadata.json (new), tests/cooking.test.js, tests/recipe-metadata.test.js, tests/everyday-cooking-browser.mjs.
**Interfaces:** cooking session optional checkedIngredients:number[]; setIngredientChecked(session,index,count)->session; recipePlanningMetadata(meal,registry)->verified metadata|null. Preserve current timer signatures and old session shape.
- [x] Add tests for checked ingredient persistence, limits, old sessions; source identity/invalid metadata and unknown quantities; browser prep/timer close+reopen and source method link.
- [x] Run targeted Node/browser tests; expected missing behavior.
- [x] Implement bounded source metadata, preparation UI and timer access for linked recipes; keep user serving confirmation separate.
- [x] Run `npm run verify` and browser CI; expected all pass. Commit.

### Task 4: Photo matching performance and release
**Files:** src/ingredient-reference.js, src/ingredient-photos.js, src/app.js, tests/ingredient-photos.test.js, scripts/profile-ingredient-matching.mjs (new), docs/releases/2026-10-27-everyday-cooking.md (new).
**Interfaces:** shared immutable-registry cached resolver preserves ingredientPhoto semantics. Home use-soon links reuse committed discovery ingredient query.
- [x] Profile baseline on full catalogue. Add failures for safe descriptor matches and reject alternatives/changed form. Verify cached and uncached outputs identical across all source lines; add use-soon browser journey.
- [x] Run targeted tests; expected safe match gaps.
- [x] Implement measured optimization and safe descriptor coverage plus Home use-soon links.
- [x] Run `npm run verify`, build, full three-engine CI. Expected all pass; inspect all job logs.
- [x] One fresh final review, Critical/Important fixes RED→GREEN in one continuing pass, full suite green.
- [x] Package exact tested source with native helper, privately deploy, check live provenance/assets, record evidence/limitations and rulings, keep PR draft/unmerged. Commit docs; clean only this plan workspace.
