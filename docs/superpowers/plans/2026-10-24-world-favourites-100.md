# World Favourites 100 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Research-only agents have separate publisher scopes; root owns product changes and publication.

**Goal:** Add 100 new rated world-favourite recipes and make them directly browsable.

**Architecture:** Preserve the existing selected-source catalogue and read-only recipe UI. A separate 100-ID registry composes with existing filters; source collection retains strict main-recipe ownership and bounded, permitted original retrieval.

**Tech Stack:** Existing dependency-free browser JavaScript, Node tests, Worker/Sites build and browser acceptance matrix.

**Spec:** docs/superpowers/specs/2026-10-24-world-favourites-100-design.md

## Global Constraints

- Exactly 100 new distinct IDs; retain all existing 36 and personal kitchen IDs.
- Only the selected 16 publisher hosts; no invented score/photo/ingredient facts or copied methods/reviews.
- All new records have published ratings >=4/5, positive original counts and an original source photo URL; sample sizes visible, editorial curation not global ranking.
- No source-access/robots bypass; owner-private Site, PR1 stays draft and unmerged.

## Review Focus

- Duplicate dishes/IDs or old records accidentally counted toward the 100: dataset assertions and manual curation manifest.
- Publisher graph/ingredient ambiguity: original-page reproduction and existing fail-closed extraction regressions.
- Collection filters conflict with source/search/rated state: unit composition and real-browser checks.
- Curation registry missing/malformed: ordinary collection remains usable in browser acceptance.
- Unknown/prepared ingredients receive a misleading reference: full new-row match audit and targeted regression fixes, unresolved gaps retained.

### Task 1: Verify and curate the data

Files: data/selected-recipes.json, data/selected-recipe-seeds.json, data/world-favourites-100.json, scripts/collect-selected-recipes.mjs, tests/selected-sources.test.js.

- [x] Discover permitted original pages in separate publisher research scopes; extract and retain original HTML evidence in scratch.
- [x] Select 100 new distinct recipes with rating/count/photo evidence and regional/dish-type breadth; preserve old records and update source counts/attempts.
- [x] Add a meaningful failing test for bounded seed validation above 100 then raise the cap to 250, retaining exact allowlist checks.
- [x] Add dataset assertions for exactly100 valid curated IDs, all new, unique and rated with source photos; audit all new ingredient matches and fix proven defects RED→GREEN.

### Task 2: Expose the collection

Files: src/selected-sources.js, src/selected-recipes-app.js, selected-recipes.html, selected-recipes.css, tests/selected-sources.test.js, tests/selected-sources-browser.mjs.

- [x] Add failing unit tests for collection metadata validation, empty/unknown ID filters and filter composition; implement validation and optional ID filtering.
- [x] Add the existing-form collection selector and ?collection=world-favourites-100 initial state; clearly identify editorial curation and preserve original scores/counts.
- [x] Extend browser acceptance for 100-card collection, composed filters/reset, direct link, registry failure and phone layout.

### Task 3: Verify and publish

Files: README.md, docs/ACCEPTANCE.md and this plan.

- [ ] Run syntax, full Node tests/build, six-suite Chromium/Firefox/WebKit matrix and three Firefox continuity executions.
- [x] One independent final data/contract review; no Critical/Important findings. Two Minor photo issues fixed with RED→GREEN regressions; all208 Node tests pass after stabilizing an existing date-sensitive fixture.
- [ ] Publish the exact tested package to the same owner-private Site. Verify all source assets, live collection/data/style/module hashes, provenance and audience. Update PR1/docs; do not merge.
