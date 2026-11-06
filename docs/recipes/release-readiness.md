# TasteIt recipe/photo release verification

Updated: 2026-11-06. Scope: draft PR #1 on `feat/recipe-kitchen-foundation` (not the published website).

## What the draft currently contains
- **200** complete, revision-pinned Wikibooks Cookbook recipes, with original ingredients, ordered cooking directions, attribution and per-recipe licensing. The original first 50 were preserved, followed by three append-only releases of 50.
- **1,108** original publisher references, maintained without copying cooking directions that were not licensed for redistribution.
- **189** reviewed Commons ingredient-photo references. Photo tiles show no caption, source text or attribution beneath the image. Licence/creator details live at `photo-credits.html`.
- For source-linked publisher recipes, users can write **their own** cooking steps, store them with their saved recipe, back them up and follow them offline. These are personal user-authored notes, not publisher content.
- The offline application shell includes the licensed recipe catalogue, publisher-reference catalogue, and photo-credit index. A per-recipe **Save ingredient photos offline** button prepares up to 40 unique rights-reviewed 250px Commons thumbnails; at most 160 thumbnails are kept in local browser storage. Already-viewed approved thumbnails remain available too. The user must be online to download images not already cached. This does not use Cloudflare server storage or copy publisher-owned dish photos. Missing/unsupported images are never replaced with stock photos.

## Explicit coverage limits
- **Publisher instructions:** not all 1,108 original publisher records have an independently licensed, in-app method. Do not present them as complete. They retain their author link unless the user supplies their own method.
- **Ingredient pictures:** 189 references cannot cover every preparation or compound ingredient. The read-only `node scripts/audit-ingredient-photos.mjs` command measures exact matches without inflating coverage or swapping in a misleading substitute.
- **Dish pictures:** do not fabricate food photography for recipes whose source has no reusable photo.
- **Licensing:** every copied Wikibooks recipe retains its revision and CC BY-SA attribution; Commons photo credits remain accessible away from the photographs.
- **Readiness:** neither this document nor a passing test authorizes merging or deployment. The production branch remains untouched pending an explicit merge instruction.

## Internal cooking implementation (draft)
- **Cook in TasteIt** lists records with complete licensed methods, personal methods, or other existing full instructions. Publisher-only ingredient lists are never presented as full in-app directions.
- Publisher reference cards open TasteIt first. Original publisher links remain in optional **Sources & credits** disclosures.
- Both the complete recipe collection and the publisher-reference collection are pre-cached after **Ready offline**. All collection filters now search locally when offline; only real steps appear in **Cook in TasteIt**, and publisher reference cards instead offer personal-method entry. Chromium and WebKit browser acceptance covers opening an *unsaved* complete recipe and unsaved publisher reference after server shutdown. Firefox acceptance covers both cached catalogues, saved recipe reload and offline guided cooking; opening an unsaved recipe while forcibly offline remains **unverified** in Firefox.
- Ingredient photos are third-party reviewed Commons thumbnails or original publisher references. Reviewed ingredient thumbnails can be prepared in advance per recipe, locally; original publisher photos are never copied into the ingredient cache. Image authenticity and completeness remain unverified.
- These changes remain in the draft feature branch, not production.

## Release gates
1. Run `npm ci && npm run verify && node scripts/audit-ingredient-photos.mjs && npm run build:site && npm run build:vercel`.
2. Pass Chromium, Firefox and WebKit browser acceptance, including the complete-recipe cooking and offline-resume flow.
3. Check the GitHub draft PR HEAD after any data-collector bot commit. If GitHub marks its workflow `action_required`, the current HEAD has **not** been fully verified: obtain a fresh, runnable check before merging.
4. Preserve existing saved recipes, personal methods, favourites, cooking progress, backups and pantry data in regression tests. No production deployment until the user approves the merge.
