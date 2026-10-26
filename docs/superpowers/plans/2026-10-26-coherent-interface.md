# Coherent interface Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline, one fresh final review.

**Goal:** Ship and privately publish Release 2's unified search and coherent cooking interface.
**Architecture:** Extend main controller routes/discovery using a bounded catalogue loader and pure merge/filter helper. Reuse publisher presentation, existing detail and persisted kitchen models.
**Tech Stack:** Existing vanilla JavaScript, Node, Worker and three-engine browser acceptance.
**Spec:** docs/superpowers/specs/2026-10-26-coherent-interface-design.md

## Global Constraints

Preserve all 1,108 recipes/IDs, source limits, v1 backups, recovery and opt-in sync.
No runtime dependency/database migration/new recipe collection. Same owner-private
Site, PR1 draft/unmerged. Catalogue fetch/body deadline12seconds. Page size24.

## Review Focus

- Catalogue failure or stale navigation must retain usable saved recipes without overwriting records.
- Source/course/rating/sort/page identity must survive overlay/save/reload/Back.
- Saved publisher versus catalogue duplicate IDs must not produce duplicate cards or lose personal flags.
- Late catalogue/filter-option arrivals must not reset typed drafts or recipe editors.
- Empty/large cookbooks, 375px and zoomed layouts must keep search, filters, captions and navigation usable.

### Task 1: Unified discovery boundary and routes

**Files:** src/discovery-options.js, src/recipe-discovery.js, src/navigation.js, sw.js; tests/recipe-discovery.test.js, tests/navigation.test.js.
**Interfaces:** discoveryOptions(input)->validated scope/source/course/sort/ratedOnly/page; searchRecipeCollection(records,saved,filters)->unique meals; createRecipeCollectionLoader(request?)->{load({retry?})}.
- [ ] Write tests for real collected breakfast/ingredient search, personal/saved merge and flags, filters/page URL, invalid values, failed/retry/shared loader.
- [ ] Observe RED; implement validated pure helpers and bounded catalogue loading, preserve existing route fields and shell imports.
- [ ] Run focused and full Node tests/build; commit.

### Task 2: Main app integration and coherent presentation

**Files:** src/app.js, src/recipe-presentation.js, src/selected-recipes-app.js, index.html, selected-recipes.html, styles.css, selected-recipes.css; controller/presentation tests.
**Interfaces:** existing collectedMeal/details/persistence; Task1 route/search/loader; shared publisher identity/rating HTML.
- [ ] Add failing controller/presentation checks for search/paging/identity, real ratings and compact consistent action semantics.
- [ ] Integrate default collection+saved search, explicit provider scope, catalogue failure fallback, URL paging and direct selected detail lookup.
- [ ] Search-first home, shortcuts/personal shelves, four-item shared nav and More tools research, native mobile filter disclosure, readable credited photos and stable failed images.
- [ ] Preserve drafts/focus, old links and recovery; run full Node/build; commit.

### Task 3: Actual acceptance and private release

**Files:** tests/coherent-interface-browser.mjs, existing browser fixture scopes, .github/workflows/verify.yml, docs/releases and docs/ACCEPTANCE.md; native Worker.
**Interfaces:** unchanged real application and Worker; source helper exact-source archive.
- [ ] Add actual complete collected breakfast search/save/home/open/Back/plan tests, filters/page/reload, failures/offline, keyboard/375px/zoom/empty/large cookbook. Existing provider suites explicitly select provider scope, keeping their assertions.
- [ ] Full Node/build; one fresh final reviewer, one Important/Critical TDD fix pass. Inspect detailed three-engine logs and source-tree equivalence.
- [ ] Package exact verified source, preserve bindings/migrations/audience, publish private and check live files/provenance; record evidence/PR draft unmerged.
