# Tasteit v0.1 — acceptance boundaries

## Purpose

The current release is a GitHub-only development prototype. There is no public deployment.

## Automated acceptance

GitHub Actions runs unit and API tests plus Playwright browser acceptance in headless Chromium, Firefox and WebKit using deterministic API fixtures. These engines are **not** a substitute for physical iOS Safari/Android device testing.

- [x] Browse, search, open recipe, check ingredients and guided instructions
- [x] Build world country/category directory, source scan, deduplication, a 30-candidate target and visible shortfall, without inventing reviews or rehosting recipe text
- [x] Produce country/category coverage snapshots with source IDs and titles, and export CSV gaps in GitHub Actions (feature branch only)
- [x] Gather and preserve 3,799 source-linked Wikibooks research titles, searchable in Tasteit but not classified into countries, courses or top-ranked dishes without editorial evidence
- [x] Offer source-tag searches, private evidence-backed shortlist notes, explicit country/category research assignments, exportable CSV and backup restore; never promote these to verified best-30 without independent editorial review
- [x] Prioritise Wikibooks research by exact original source-category tags for the selected country and course, exclude ambiguous shared demonyms, test adversarial tags and keep suggested-source counts separate from verified dishes
- [x] Save recipes, create and edit a personal family recipe, refresh and verify persistence
- [x] Record a cooking experience with optional rating and notes, then verify its backup restoration
- [x] Add recipe labels, search and filter private collections, and verify label preservation in JSON backup
- [x] Add pantry records, distinguish separately dated batches of the same ingredient, and exclude past-dated or zero-quantity records from automatic matches
- [x] Build a weekly meal plan and a shopping list with conservative unit-aware shortfalls
- [x] Tick off shopping requirements, add/remove personal shopping essentials, copy remaining items, restore progress after refresh/backup and invalidate previous checks when recipe amounts change
- [x] Confirm a recipe's original servings, adjust target portions per recipe and per planned day, and verify scaled shopping amounts and backup migration
- [x] Preserve sparse ingredient positions and flag unsupported measures/fractional whole items rather than silently scaling them
- [x] Restore a cooking step after modal closing or page refresh; show a manual clock-based timer, pause/reset/presets and keyboard step navigation
- [x] Save cooking timer/progress into JSON backup while retaining compatibility with older backup formats and rejecting invalid sessions
- [x] Finish a cooking journal entry and clear its saved in-progress cooking session without losing progress on a failed storage write
- [x] Export local data to JSON and restore from a backup
- [x] Navigate on a 375px mobile viewport with no horizontal overflow
- [x] Dialog Escape handling and restored focus after collection changes
- [x] Dynamic cuisine and category lists, provider-category browsing, full provider A–Z browsing and random discovery with no cached surprise results
- [x] Manual recipe publisher URL validation, preserved original link in backups and no automatic copying of third-party photographs
- [x] Graceful photo-unavailable fallback on cards and recipe details rather than unrelated stock photos
- [x] Bulk pantry paste/preview/confirm, duplicate protection, ambiguous quantity rejection, invalid-date checks and stale-preview invalidation
- [x] Preserve separate ingredient quantities/dates through JSON backup; show due-soon batches and test recommendation ordering
- [x] Test conservative ingredient regional names without conflating allergen- or product-specific variants
- [x] Select/reconcile up to four usable pantry names, explain matching/missing amounts, include saved-recipe suggestions, and filter by name presence or comparable quantity sufficiency
- [x] Verify mobile ingredient selector, explicit refresh, filter-empty-state recovery and no fabricated cookability status

## Collection audit — 23 October 2026

- 195 countries and 14 provider categories listed
- 790 recipe candidates obtained via the 26 first-letter API queries
- 334 country/category combinations nonempty out of 2,730 possible
- **0** country/category combinations reached 30 provider recipes
- **0** recipes independently certified or ranked as among the best
- 3,799 additional Wikibooks page titles and attributed links collected separately; country/category assignments remain unknown
- 3,799 source-page category label records collected from Wikimedia with zero failed batches, displayed as hints only; not counted in reviewed recipe totals
- [x] Paginated Wikibooks source-link search and optional original category hints, keeping country/course certification unverified
- The complete index and gap report are research inputs, not ready-to-publish editorial rankings.
- Additional verified sources, cultural research and per-image permission checks are substantial open tasks.

## Human / real-device gates not yet verified

- [ ] Test live TheMealDB browsing and photographs in an ordinary browser
- [ ] Inspect mobile portrait and landscape on physical devices
- [ ] Test physical Safari and Firefox, including guided-step focus, accessible keyboard navigation, cooking-timer refresh/sleep/pause behaviour and small-screen controls. Automated WebKit/Firefox headless runs do not count as physical-device acceptance
- [ ] Exercise browser storage denial, quota exhaustion and backup cancellation
- [ ] Verify ingredient-name variants, quantities and safe food substitutions
- [ ] Check factual recipe authenticity and photography reuse rights before public release

## Honest constraints

* The worldwide catalogue currently contains source-linked candidates only; provider country and category values are **not** cultural authenticity or popularity evidence. Documentation scores are not user ratings. A missing combination is only a source coverage gap. TheMealDB is not a complete collection of every cuisine. Its cuisine and category fields are not guarantees of authentic regional origin, vegetarian certification or allergen safety. Source photographs/videos are linked and credited when supplied.
* A–Z browsing is limited to TheMealDB's available catalogue; manually linked external sources are not automatically parsed or rehosted. Community photos are provided by TheMealDB and must not be passed off as Tasteit originals. See https://www.themealdb.com/terms_of_use.php ; check third-party permissions before public distribution.
* Pantry recipe discovery is a shortlist from separately queried single ingredients and saved dishes, **not** a complete search of every possible compatible recipe. Selected search names are different from full-stock matching; no nutrition, allergy or cooking-safety certification is inferred. Recipe serving counts are user-confirmed, not inferred from the provider. Supported measurements can be scaled for each planned day; instructions, seasonings, unknown measures, density conversions and fractional whole-item decisions still require manual judgement. Stock availability is checked against currently recorded stock, not projected stock on the future cooking day. Past best-before dates are excluded from matching conservatively, but neither past dates nor future dates prove whether food is safe. Users must check storage and freshness. Tag labels and cuisine text are user/source labels, **not** validated dietary or allergy certifications. Ingredient discovery starts with name presence. The separate measurement engine estimates shortfalls only for confidently parsed, compatible units; ambiguous and mixed units are flagged for review rather than guessed. These estimates are **not** food-safety, allergy, substitution or adequate-portion clearance.
* Checking a shopping item indicates it was picked up; the app does not silently alter pantry stock, receipt history or quantities. Completed items are reversible and original recipe requirements changing invalidate old checkmarks. The cooking countdown is calculated from wall-clock time, but no background notification/alarm is guaranteed; users must not depend on it for unattended cooking or food safety. Personal recipes, pantry items, saved collections and plans are stored in browser localStorage. JSON backups are local, unencrypted files; safeguard them accordingly.
* Developer API key 1 is for testing and personal development. Arrange appropriate service terms/key before public release. Never commit private API keys to client-side JavaScript.
* No hosting or deployment has been performed.

## Next priorities

1. Source-by-source editorial curation and licensing review, especially for the many underrepresented country/category pairs. See docs/CURATION.md.
2. Manual live-browser review and defect remediation.
2. More personal search, editable cooking notes, optional dietary preference warnings (never allergy guarantees) and photo uploads with clear rights.
3. Better stock consumption, portion-aware future expiry forecasting, richer quantity conversions, quicker food capture and regional recipe source verification.
4. Multi-source discovery with regional provenance and authorised photos.
5. Optional authenticated sync after local flows are trustworthy.
