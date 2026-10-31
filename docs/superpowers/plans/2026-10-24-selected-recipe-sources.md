# Selected recipe sources implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Native implementation; one independent final review.

**Goal:** Collect verifiable recipe/rating metadata from the user's 16 websites and show real ingredient reference photos with clear gaps.
**Architecture:** Allowlisted, bounded source collector; immutable checked metadata; focused collection page linked from Tasteit; separately credited ingredient-photo registry.
**Tech Stack:** Existing ESM/HTML/CSS, Node 22+, Python standard library for one-time source checks, Sites Worker.
**Spec:** docs/superpowers/specs/2026-10-24-selected-recipe-sources-design.md

## Global Constraints
- Only the 16 selected recipe publishers; exact HTTPS host checking, including final/canonical URLs.
- Keep local records, IDs and backups intact. Do not copy publisher methods or reviews, bypass access controls, invent ratings/photos, or assert cultural authenticity.
- Photo identity and reuse evidence remain separate from recipe sources. Unknown photos have visible gaps.
- Private publication authorised; owner-only audience and unmerged PR #1 preserved.

## Review Focus
- Related-recipe, dish or app rating must not become the main recipe's rating.
- Redirects, credential URLs and lookalike hosts cannot bypass the source allowlist.
- Count semantics remain explicit: rating votes versus reviews versus absent counts.
- Mixed/alternative/prepared ingredients must not acquire a misleading photograph.
- Broken images, empty/failed source batches and mobile filter focus must remain usable.

## Task 1: Source registry, exact metadata parsing and initial collection
**Files:** src/selected-sources.js, scripts/collect-selected-recipes.mjs, data/selected-recipes.json, tests/selected-sources.test.js.
**Interfaces:** approvedSource(url), extractRecipe(html,url), validateRecipe(record), filterRecipes(records,filters).
- [x] Write/run failing host, main-recipe selection, rating/count and malformed-input tests.
- [x] Implement bounded exact JSON-LD parsing/validation; collect original pages and preserve access/status evidence.
- [x] Run module tests and full Node suite; commit verified metadata and gaps.

## Task 2: Ingredient reference photos and source-only collection UI
**Files:** data/ingredient-photos.json, src/ingredient-photos.js, selected-recipes.html, src/selected-recipes-app.js, styles.css, src/app.js, tests/ingredient-photos.test.js.
**Interfaces:** ingredientPhoto(name,registry) returns verified exact match or null; page consumes validated source records and photo records.
- [x] Write/run failing photo identity/licence/URL/ambiguity tests.
- [x] Collect/verify genuine licensed reference photographs for common ingredients; expose exact coverage gaps.
- [x] Implement escaped source/ingredient/rating cards, filters, credit links and broken-image fallbacks. Link the collection from the main app.
- [x] Verify Node tests and 375px browser interactions; commit.

## Task 3: Integration, review and private publication
**Files:** scripts/build-site.mjs, tests/selected-sources-browser.mjs, .github/workflows/verify.yml, README.md, docs/ACCEPTANCE.md.
- [x] Add packaged page/assets and browser source/filter/rating/ingredient-photo acceptance.
- [x] Run complete Node/build and three-engine browser matrix; one independent review; fix material findings with regressions.
- [x] Publish exact tested source to the same private Site; verify live assets/audience and record final recipe/rating/photo counts and gaps.

Completed software/initial collection publication on 24 October 2026. Data completeness remains limited as recorded in docs/ACCEPTANCE.md (23 recipes,17 source ratings,184/339 ingredient photo references).
