# TasteIt recipe/photo release verification

Updated: 2026-10-31. Scope: draft PR #1 on `feat/recipe-kitchen-foundation` (not the published website).

## What the draft currently contains
- **150** complete, revision-pinned Wikibooks Cookbook recipes, with original ingredients, ordered cooking directions, attribution and per-recipe licensing. The original first 50 were preserved, followed by two append-only releases of 50.
- **1,108** original publisher references, maintained without copying cooking directions that were not licensed for redistribution.
- **186** reviewed Commons ingredient-photo references. Photo tiles show no caption, source text or attribution beneath the image. Licence/creator details live at `photo-credits.html`.
- For source-linked publisher recipes, users can write **their own** cooking steps, store them with their saved recipe, back them up and follow them offline. These are personal user-authored notes, not publisher content.
- The offline application shell keeps the photo-credit index; up to 160 previously viewed Wikimedia Commons ingredient thumbnails are kept for use without a connection. Missing images remain missing rather than being replaced with unrelated stock photos.

## Explicit coverage limits
- **Publisher instructions:** not all 1,108 original publisher records have an independently licensed, in-app method. Do not present them as complete. They retain their author link unless the user supplies their own method.
- **Ingredient pictures:** 186 references cannot cover every preparation or compound ingredient. The read-only `node scripts/audit-ingredient-photos.mjs` command measures exact matches without inflating coverage or swapping in a misleading substitute.
- **Dish pictures:** do not fabricate food photography for recipes whose source has no reusable photo.
- **Licensing:** every copied Wikibooks recipe retains its revision and CC BY-SA attribution; Commons photo credits remain accessible away from the photographs.
- **Readiness:** neither this document nor a passing test authorizes merging or deployment. The production branch remains untouched pending an explicit merge instruction.

## Release gates
1. Run `npm ci && npm run verify && node scripts/audit-ingredient-photos.mjs && npm run build:site && npm run build:vercel`.
2. Pass Chromium, Firefox and WebKit browser acceptance, including the complete-recipe cooking and offline-resume flow.
3. Check the GitHub draft PR HEAD after any data-collector bot commit. If GitHub marks its workflow `action_required`, the current HEAD has **not** been fully verified: obtain a fresh, runnable check before merging.
4. Preserve existing saved recipes, personal methods, favourites, cooking progress, backups and pantry data in regression tests. No production deployment until the user approves the merge.
