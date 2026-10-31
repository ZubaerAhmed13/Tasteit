# Rated Thousand and Personal Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans task-by-task. Root implements inline; two disjoint research agents collect original metadata only.

**Goal:** At least 1,000 rated approved-source recipes, useful personal home shelves,
and credited ingredient photos in the main dialog.

**Architecture:** Shared photo renderer and a validated collected-recipe adapter
join the existing catalogue to the existing version-1 cookbook. Keep source
methods external. Source-backed course filters and pagination bound rendering.

**Tech Stack:** Existing JSON, vanilla JavaScript, Node and three-engine CI.

**Spec:** docs/superpowers/specs/2026-10-25-rated-thousand-home-design.md

## Global Constraints

- Existing 16-host recipe allowlist; no fabricated score, count, photo or method.
- New score/best >=0.8, original count >=4, HTTPS photograph and usable ingredients.
- Preserve original136, world100 IDs and existing personal data/backups/sync.
- Respect robots/access restrictions and Retry-After; raw research stays outside app.
- Same owner-private Site; PR1 stays draft and unmerged; no new runtime dependency.

## Review Focus

- An unsaved selected recipe is wrongly fetched from TheMealDB or loses >20 rows.
- Async photo loading erases a form draft, moves focus or drops extra credits.
- Separate-page writes overwrite newer saved state or imply a failed save worked.
- Pagination/category changes hide the true total or leak the wrong collection.
- A source list/dish score is mistaken for a main recipe rating during expansion.

### Task 1: Visible ingredient photos and personal home

**Files:** src/ingredient-reference.js, src/selected-kitchen.js, src/app.js,
src/model.js, src/servings.js, src/navigation.js, styles.css, sw.js;
tests/app-state.test.js, tests/selected-kitchen.test.js, browser suites.

**Interfaces:** `ingredientReference(line, registry)` returns escaped credited
markup. `collectedMeal(record)` returns a namespaced existing-meal envelope;
`collectedRecipe(meal)` validates/retrieves its original record. Original rows
remain unparsed ingredient names with unknown measurements.

- [x] Add adapter/backup, >20-row, safe photo rendering and actual home-shelf
  regressions; observe failures before implementation.
- [x] Share photo rendering between pages; connect optional registry to the main
  dialog without whole-dialog redraw; handle broken images visibly.
- [x] Implement adapter, main open/save source distinction and home shelves;
  preserve atomic writes and offline shell imports. Run focused tests; commit.

### Task 2: Rated expansion and browse/save controls

**Files:** data/selected-recipes.json, src/selected-sources.js,
src/selected-recipes-app.js, selected-recipes.html, selected-recipes.css,
tests/selected-sources.test.js, tests/world-favourites.test.js,
tests/fixtures/selected-source-preserved-136.json.

**Interfaces:** Existing validated records; `recipeCourses(record)` derives coarse
filters solely from publisher categories; `filterRecipes` gains `course`.
Fresh `loadStore` then persist-before-render owns each collection flag mutation.

- [x] Add failing course and >24-result navigation/saving acceptance cases.
- [x] Merge original evidence without replacing existing136; select enough new
  eligible records for >=1000 rated, including mains, desserts and appetisers.
  Audit source/rating/photo/ingredient facts and preserve baseline hashes.
- [x] Add 24-card pagination and course control; compose with all filters;
  add wanted/usual buttons and main detail link using the shared adapter.
- [x] Run full verify/build and source/data audits; commit candidate.

### Task 3: Review, three-engine acceptance and private release

**Files:** browser acceptance and release documentation; native Site package.

**Interfaces:** Exact committed app source -> verified native Worker archive ->
same Site with unchanged owner access and measured live asset/provenance parity.

- [x] Fresh final review; reproduce any Important/Critical issue RED→GREEN in
  one fix pass; run full suite. Inspect all Node and browser job logs.
- [x] Build final tested source; package exact Worker, Site manifest and existing
  migrations; publish owner-private and verify live changed paths/provenance.
- [x] Update counts, limitations, acceptance evidence and PR1 without merging.

Release evidence is retained in `docs/ACCEPTANCE.md` and the original-source
manifest at `docs/research/2026-10-25-rated-thousand-evidence.json`. Application
source `4ce206ee9df4f47f85543c9a450a746a2dbd7028` is the tested and published
product; subsequent documentation-only commits do not require another deployment.
