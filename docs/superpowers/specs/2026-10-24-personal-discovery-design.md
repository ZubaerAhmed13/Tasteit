# Personal taste and curated discovery

The user requested the next audit stage and publication for testing afterwards.
Stage 3 improves personalisation and curated discovery, following reliable
discovery and the connected kitchen. Work in the existing dedicated feature clone.
Keep PR #1 draft and unmerged. The new instruction authorises a testing deployment;
it supersedes the earlier deployment hold for that preview only.

## Approach

Extend the dependency-free local app with explicit taste preferences and a small,
explainable recommendation module. Reuse existing recipe labels as user-curated
collections. A backend or opaque AI recommender adds credentials, costs and data
migration without improving this first personalisation flow. An editorial claim
that recipes are verified best/authentic is not supported by the collected data.
The implementation approach is the assistant's choice within the next-stage request.

## Behavior

- A collapsible Your taste form accepts up to 8 cuisines (80 characters each) and
  20 ingredients to skip (80 characters each), separated by commas or newlines.
  Deduplicate case-insensitively; match ingredient names conservatively through
  existing normalisation. These are taste preferences, not allergy filters.
- An optional version-1 tasteProfile stores cuisines, avoidIngredients and up to
  300 hiddenRecipeIds. Missing old fields default to empty; malformed imports fail.
  Preserve every existing recipe, stock, journal, plan and backup record.
- The unfiltered Discover page replaces Next on your menu with For your table.
  Combine current source candidates and saved detailed recipes, deduplicate IDs,
  and suggest up to four with actual signals: wanted/favourite/usual, preferred
  cuisine, recorded ingredient-name overlap and use-soon batches. Explain each
  suggestion. Do not guess complete ingredients from source summaries, densities,
  allergies, authenticity or ratings. With skipped ingredients set, only detailed
  recipes with ingredient lists can be suggested. Ordinary search is unaffected.
- Not for me hides a suggestion without deleting saved records. Show skipped
  recipes reverses these exclusions. Both actions persist before assigning state.
  A failed save retains the previous taste profile and typed form values.
- Existing labels become compact collection shortcuts showing their actual recipe
  counts. Opening one goes to My recipes with the chosen label and cleared search.
  Display user-curated collections distinctly from source/editorial certification.
- Preserve preference drafts, disclosure state and focus during async renders.
  Explicit reset/import adopts the new stored profile. Keep mobile widths readable.

## Publication and acceptance

Node tests cover strict profile validation, ID deduplication, conservative skipped
ingredients, understandable ranking, no invented signals, stale/past stock,
hidden/restored suggestions, non-mutation and old/new backup compatibility.
Actual event-owner tests cover failed taste writes. Browser tests cover save,
reload, skips/reset, collection opening, blocked storage and 375px layout.
Run the existing suites in Chromium, Firefox and WebKit and one independent review.

Publish the tested feature commit as a preview, with no search indexing, merge,
custom domain, backend, credentials or production API purchases. Verify the actual
URL, static module/data assets, source requests and basic interactions. No private
browser records are included in deployment. Physical-phone and public-production
rights checks remain separate limits.
