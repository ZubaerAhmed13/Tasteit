# Personal Discovery Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans, continuing native implementation and one final independent review.

**Goal:** Make discovery respond to explicit personal tastes and user-curated collections, then publish a tested preview.
**Architecture:** Pure taste/ranking helpers prepare recommendations; the existing app owns forms and atomic local persistence. Optional version-1 profile data.
**Tech Stack:** JavaScript modules, Node tests, existing Playwright matrix, static preview hosting.
**Spec:** docs/superpowers/specs/2026-10-24-personal-discovery-design.md

## Global Constraints
- Keep PR #1 draft and unmerged; publish only the requested testing preview.
- No new product dependencies, backend, copied photographs, API purchases or changed record IDs.
- Preserve all existing records and version-1 backup compatibility.
- Taste preferences are not allergy filters, source tags are not authenticity certificates.

## Review Focus
- Failed preference writes and async catalogue refreshes preserve typed drafts and existing data.
- Skipped ingredients and unknown source summaries cannot produce false recommendation matches.
- Duplicate IDs prefer detailed recipe data and retain original source fields.
- Old backup import and cross-tab updates replace the profile consistently.
- Published files come from the tested feature commit and contain no browser-private data.

## Task 1: Validated profile and transparent recommendations
**Files:** src/personalisation.js, src/model.js, tests/personalisation.test.js.
**Interfaces:** emptyTasteProfile(), validTasteProfile(profile), createTasteProfile(input),
recommendRecipes(candidates,saved,pantry,profile,limit=4,now=new Date()) -> [{meal,reasons}].
- [x] Write/run failing tests for bounded lists, aliases, ingredient exclusions,
  detailed ID deduplication, hidden IDs, relevant reasons and past-dated stock.
- [x] Implement the pure helpers; extend empty/load/export/parse with optional tasteProfile.
- [x] Verify old/new backup round trips, invalid profiles and non-mutation; run Node suite and commit.

## Task 2: Taste form, suggestions and collection shortcuts
**Files:** src/app.js, styles.css, tests/app-state.test.js, tests/personalisation-browser.mjs,
tests/browser-smoke.mjs, package.json, .github/workflows/verify.yml.
**Interfaces:** Task 1 functions; existing collectionTags/filterCookbook and persistStore.
- [x] Add failing event-owner and browser scenarios for saves, blocked storage,
  preserved drafts, reload, Not for me / restoration and labelled collections.
- [x] Add a collapsible taste form and explained recommendation section on unfiltered
  Discover; add user-label shortcuts, without duplicating recommended cards below.
- [x] Integrate profile changes into backup import and cross-tab state; preserve focus/drafts.
- [x] Verify Node checks and all four browser scripts in the three-engine matrix; commit.

## Task 3: Review, preview publication and acceptance
**Files:** directly affected fixes, hosting configuration, README.md, docs/ACCEPTANCE.md.
**Interfaces:** Tested remote feature SHA, static asset deployment and returned URL.
- [x] Independently review the stage diff and fix material findings with regressions.
- [x] Add no-index preview configuration and document personalisation/preview boundaries.
- [x] Publish the tested source to preview hosting, check actual assets and interactions,
  and update PR #1 with the URL and accurate verification evidence.

## Completed verification

131 Node tests and all four browser suites pass in Chromium, Firefox and WebKit
on `4df3b65091b56266b1fa4cc81b54ede3b5dce08f`
([run 40079171262](https://github.com/ZubaerAhmed13/Tasteit/actions/runs/40079171262)).
Independent review found a displayed-recipe/action mismatch and asynchronous
keyboard focus loss; both were reproduced before their fixes and are covered.

The exact static files were copied from that GitHub commit into the private Site
source and published successfully. URL: https://tasteit-kitchen-preview.bhuyainria.chatgpt.site.
The hosted owner sign-in gate was confirmed. Actual source requests, photos and
taste-form interactions were checked in the matching internal preview. The signed-in
hosted walkthrough and physical-device checks remain documented acceptance limits.
