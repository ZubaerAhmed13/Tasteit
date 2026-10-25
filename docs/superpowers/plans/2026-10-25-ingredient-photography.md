# Ingredient Photography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Root implements; two disjoint research streams supply candidates only.

**Goal:** Replace confidently identifiable photo gaps with visually verified, credited real ingredient references.

**Architecture:** Extend the existing ingredient registry and conservative matching contract. Research artifacts stay outside the app; only reviewed metadata and useful regression cases enter the repository.

**Tech Stack:** Existing JSON registry, dependency-free JavaScript, Node tests and three-engine browser acceptance.

**Spec:** docs/superpowers/specs/2026-10-25-ingredient-photography-design.md

## Global Constraints

- Real photographs with original-file creator/licence evidence and visual review.
- No guessed facts, generated images, preparation/variety substitutions or loosened ambiguity guards.
- Audit every new or changed source-row match; preserve explicit unknown/alternative gaps.
- Respect source throttling and access restrictions; coordinate shared metadata requests.
- Same owner-private Site and existing IDs/data schema; PR1 stays draft and unmerged.

## Review Focus

- A specific variety, plant part or preparation receives a misleading generic photograph.
- A longer new alias competes with a prior match or reveals an incorrect component fallback.
- Attribution or licence is inferred instead of supported by the actual original file.
- A photograph depicts a finished dish, package or illustration while claiming an ingredient form.
- Reported coverage counts metadata matches as successful network delivery or claims all ingredients are covered.

### Task 1: Research and integrate references

**Files:** data/ingredient-photos.json; tests/ingredient-photos.test.js only for meaningful uncovered matching contracts.

**Interfaces:** Consumes ingredientPhoto(input, registry), the 136-record catalogue and existing registry; produces reviewed registry metadata plus a complete match-delta audit.

- [x] Record a clean baseline and the 989 current gaps; reuse retained source evidence.
- [x] Collect original-file metadata for distinct food groups and visually inspect candidates, preserving held/rejected targets and respecting shared API limits.
- [x] Before any required matcher change, add an exact source-line failing regression and observe RED. Data-only additions use existing provenance/alias tests plus the complete delta audit.
- [x] Integrate only verified references and conservative aliases; inspect all newly matched or changed rows.
- [x] Run node --test tests/ingredient-photos.test.js tests/selected-sources.test.js tests/world-favourites.test.js. Expected: every test passes; unrelated mixture/alternative cases remain gaps.
- [x] Run npm run verify and npm run build:site. Expected: zero failures and a valid Worker. Commit reviewed references.

### Task 2: Verify and publish

**Files:** README.md, docs/ACCEPTANCE.md and this plan; native Site Worker package.

**Interfaces:** Consumes the exact committed registry and match-delta audit; produces browser evidence, a reviewed native package and measured live coverage.

- [ ] Independent final source/photo contract review; reproduce and fix any Important/Critical issue RED→GREEN once, then run the full suite.
- [ ] Push the candidate to PR1 and inspect detailed CI logs. Expected: all Node tests, six suites each in Chromium/Firefox/WebKit and three Firefox continuity executions pass; all20 browser PASS results present.
- [ ] Build the exact tested source, compare all source assets and migrations with the native package and publish to the same owner-private Site.
- [ ] Verify live changed paths, source provenance and unchanged audience. Update counts, rejected-target limits, PR1 and release evidence; do not merge.
