# Trust and Continuity Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline; one fresh final review.

**Goal:** Deliver and privately publish approved release 1 of the Tasteit reliability audit.
**Architecture:** Extend the existing validated local-store boundary and actual page
controllers. Add focused collection request/navigation helpers, keeping data shapes
and personal kitchen behavior compatible.
**Tech Stack:** Existing vanilla JavaScript, Node and three-engine CI.
**Spec:** docs/superpowers/specs/2026-10-26-trust-continuity-design.md

## Global Constraints

Preserve all 1,108 recipes, IDs, source restrictions, v1 backups and private opt-in
sync. No runtime dependency/database migration. Same owner-private Site; PR1 draft
and unmerged. First-release scope only. Request/body deadline 12 seconds; normal
text contrast >=4.5:1.

## Review Focus

Damaged or changed local bytes overwritten by restore; failed primary writes
reported saved; late photos reset a draft/focus; world100 requests silently broaden
before metadata; Back/reload/saving changes committed filter or page identity.
Each has a focused storage/controller regression and actual browser acceptance.

### Task 1: Guard and recover local records

**Files:** src/model.js, src/app.js, src/selected-recipes-app.js;
tests/storage-recovery.test.js and browser acceptance.
**Interfaces:** `localStoreStatus(storage?)` returns status/raw/lastGood;
`restoreLocalStore(next, expectedRaw, storage?)` preserves reviewed damaged bytes
before replacing. Ordinary `persistStore` refuses damaged existing data.

- [x] Observe failures for ordinary overwrite of damaged records, last-good
  preservation, explicit/stale/failed recovery and denied/quota storage.
- [x] Implement validated write guard/checkpoint/recovery and main recovery UI,
  raw/preserved download, existing backup import integration and cross-tab refresh.
- [x] Run focused/full tests; commit.

### Task 2: Loading, offline discovery and route continuity

**Files:** src/collection-request.js, src/selected-navigation.js,
src/selected-recipes-app.js, src/offline.js, sw.js;
tests/collection-request.test.js, tests/selected-navigation.test.js,
tests/selected-page-state.test.js, tests/offline.test.js.
**Interfaces:** bounded JSON request with body deadline; pure selected-route
read/write helpers; existing actual page owns committed state and rendering.

- [x] Observe RED for pending optional data, request/body deadline, collected
  offline metadata, full route round-trip and actual page reload/Back/draft handling.
- [x] Render catalogue first, update optional cells/curation independently with
  retries; restore validated route/history/page/focus without losing drafts.
- [x] Add offline eligibility, complete shell imports; run full tests/build; commit.

### Task 3: Contrast, final acceptance and private release

**Files:** styles.css, selected-recipes.css, browser suites, release documentation;
native Site Worker package.
**Interfaces:** existing branded components; exact tested source -> native archive
-> owner-private deployment with checked live asset/provenance parity.

- [x] Observe failing real CSS colour-pair checks; correct normal text/backgrounds.
- [x] Extend real browser acceptance for recovery/raw preservation/import, stalled
  optional loads, offline collected discovery and route/Back/reload/draft continuity.
- [x] Run full tests/build; fresh final review, one Important/Critical fix pass;
  inspect detailed Node/all three-engine logs and source equivalence.
- [x] Package exact tested source with unchanged Site bindings/migration files,
  publish private and verify live assets/provenance/audience; update docs/PR unmerged.
