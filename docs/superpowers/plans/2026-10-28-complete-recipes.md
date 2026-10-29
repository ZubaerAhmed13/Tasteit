# Complete recipe release plan
Spec: docs/superpowers/specs/2026-10-28-complete-recipes-design.md. Native execution, current feature checkout, original collection unchanged.

## Review Focus
- A method on an unapproved source, forged revision URL or malformed step cannot become a licensed full recipe.
- Logical multi-sentence/nested source steps, notes and dependent components remain complete and in order.
- Licensed-load failure retains every legacy/saved recipe and displays a retryable warning.
- Saved full recipe opens/cooks offline with attribution, progress, timers and backup roundtrip.
- Existing publisher IDs, source ratings, usual/wanted flags, planning, recovery and account isolation remain unchanged.

### Task 1: Licensed ingestion and content
Files: scripts/collect-complete-recipes.py, data/complete-recipes.json, docs/recipes/complete-recipes-license.md, tests/complete-recipes.test.js, src/selected-sources.js, src/selected-kitchen.js, src/cooking.js.
Interfaces: completeMethod(record)->validated method|null; collectedMeal maps valid steps; recipeSteps returns exact ordered source steps. Snapshot {version:1,source:'wikibooks',recipes:[50records]}.
- [ ] Add RED validator/step/backup/preservation tests; run and observe failures.
- [ ] Collect50 actual main recipes from MediaWiki API with pinned revision HTML and licence evidence; inspect each for complete ingredients/method/notes, reject incomplete pages; implement validation and source normalization. No new runtime dependencies.
- [ ] Run focused/full tests, confirm legacy file hash; commit. Expected all pass.

### Task 2: In-app complete recipe journeys
Files: src/recipe-discovery.js, src/app.js, styles.css, tests/complete-recipes-browser.mjs, tests/app-state.test.js, tests/recipe-discovery.test.js, tests/browser-smoke.mjs.
Interfaces: loader merges original+licensed snapshot, exposes completeError; existing IDs/shape retained. Home action filters source wikibooks; collectedMethod distinguishes full steps vs preparation-only.
- [ ] RED actual controller/loader tests for licence display, numbered steps, snapshot failure and retained records; RED browser full recipe journey.
- [ ] Implement home discovery, availability labels, licence/cooking UI, offline-save explanation and failure warning; retain legacy preparation behavior.
- [ ] Run full Node and all3 browser jobs including actual offline connection refusal, persisted progress and backup licence; commit. Expected all pass.

### Task 3: Verify and publish
Files: .github/workflows/verify.yml, docs/releases/2026-10-28-complete-recipes.md, docs/ACCEPTANCE.md.
- [ ] Both builds, full suite/3-engine CI, one fresh final reviewer and one RED→GREEN Critical/Important fix pass; no re-review.
- [ ] Push exact tested source, keep PR draft/unmerged, deploy privately to the existing Vercel project, verify protection and every live asset/provenance; document exact count/coverage and limits. Revoke temporary access after verification.
