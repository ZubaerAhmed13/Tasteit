# Tasteit v0.1 — acceptance boundaries

## Purpose

The current release is a private testing preview. PR #1 remains draft and unmerged; there is no public release.

## Automated acceptance

GitHub Actions runs unit and API tests plus Playwright browser acceptance in headless Chromium, Firefox and WebKit using deterministic API fixtures. These engines are **not** a substitute for physical iOS Safari/Android device testing.

- [x] Browse, search, open recipe, check ingredients and guided instructions
- [x] Build world country/category directory, source scan, deduplication, a 30-candidate target and visible shortfall, without inventing reviews or rehosting recipe text
- [x] Produce country/category coverage snapshots with source IDs and titles, and export CSV gaps in GitHub Actions (feature branch only)
- [x] Gather and preserve 3,799 source-linked Wikibooks research titles, searchable in Tasteit but not classified into countries, courses or top-ranked dishes without editorial evidence
- [x] Offer source-tag searches, private evidence-backed shortlist notes, explicit country/category research assignments, exportable CSV and backup restore; never promote these to verified best-30 without independent editorial review
- [x] Capture separate text and photo reuse evidence in research notes with strict HTTPS, file/creator/licence/attribution checks, legacy backup support and CSV export; do not auto-approve reuse or rehost media
- [x] Inspect Wikibooks file titles and selected Commons file metadata only on user request; preserve editor inputs, escape third-party metadata and never download images or equate machine tags to legal clearance
- [x] Compare source recipe titles conservatively across TheMealDB and Wikibooks; flag 38 possible overlaps in source-linked review cards and export a reproducible CSV without merging culturally distinct dishes
- [x] Prioritise Wikibooks research by exact original source-category tags for the selected country and course, exclude ambiguous shared demonyms, test adversarial tags and keep suggested-source counts separate from verified dishes
- [x] Produce an offline, reproducible 2,730-row country/category research-gap audit and show unverified source-tag leads for the selected pair without modifying its actual sourced-recipe count
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

## First audit stage — reliable saves and simpler discovery

- [x] Persist recipe flag and label edits before modifying memory; a failed write
  keeps the old state, and removing the final flag keeps scheduled meals/portions
- [x] Distinguish empty, failed and partially failed source searches; retain matching
  local recipes during remote ingredient-search failure and offer explicit retry
- [x] Bound each recipe-service request to 12 seconds, including response parsing;
  cancel outdated discovery/details requests and reject stale completions
- [x] Intersect complete source ID lists for combined cuisine/category filters;
  combine recipe-name and initial filters without guessing missing summary fields
- [x] Replace the three browse rails with a compact form and individually removable
  current filters; test a real-size 195-place directory, not only two cuisines
- [x] Restore view/filters across refresh and Back/Forward, support direct recipe
  links, and prevent a closed/delayed recipe request from reopening the dialog
- [x] Verify 375px filter-label width, horizontal layout and bottom navigation
- [ ] Confirm native cuisine suggestions and screen-reader announcements on real
  Android/iOS devices; headless engines do not establish physical-device usability
- [ ] Verify actual provider requests, photographs and production source terms
  before approving any public release (existing release hold remains in force)

## Second audit stage — connected kitchen

- [x] Pure tests for reviewed purchase batches, duplicate/stale shopping rows,
  negative/unknown purchase amounts and invalid units/dates
- [x] Pure tests for serving-aware compatible usage suggestions, unknown measures,
  per-batch deductions, overdraw and stale quantity/date rejection
- [x] Event-owner tests confirm failed storage preserves inventory, journal,
  leftovers and cooking progress; repeat submissions do not apply twice
- [x] Version-1 backups round-trip optional purchase fingerprints and leftovers;
  older backups remain supported and malformed new records are rejected
- [x] Browser matrix: reviewed purchases, atomic cooking/stock/leftovers, reload
  and 375px controls, including draft ownership and manual package deductions
  (`tests/kitchen-browser.mjs`; Chromium, Firefox and WebKit passed in
  [CI run 40038698323](https://github.com/ZubaerAhmed13/Tasteit/actions/runs/40038698323))
- [ ] Real Android/iOS quantity entry, keyboard and leftover controls

## Third audit stage — personal discovery and testing preview

- [x] Taste profile validation and old/new version-1 backup compatibility
- [x] Explained ranking, detailed source-ID deduplication, conservative ingredient
  skips, hidden/restored suggestions and unchanged saved recipes
- [x] Actual event-owner tests for failed profile and suggestion-skip writes
- [x] Four browser suites in Chromium, Firefox and WebKit, including preference
  save/reload, draft preservation, labelled collections and 375px controls
- [x] Independent review findings resolved
- [x] Private preview published from tested source; archive parity and internal
  live-source interactions checked; hosted owner sign-in gate confirmed
- [ ] Authenticated walkthrough on the hosted preview after owner sign-in
- [ ] Physical Android/iOS and assistive-technology testing

Verified source: `4df3b65091b56266b1fa4cc81b54ede3b5dce08f`. All 131 Node tests
and four browser suites per engine passed in
[CI run 40079171262](https://github.com/ZubaerAhmed13/Tasteit/actions/runs/40079171262).
Private URL: [https://tasteit-kitchen-preview.bhuyainria.chatgpt.site](https://tasteit-kitchen-preview.bhuyainria.chatgpt.site).

The user authorised a testing preview on 24 October 2026. PR #1 stays draft and
unmerged. Preview access is separate from approval for a public production release.

## Fourth audit stage — offline, optional sync and mobile continuity

- [x] Real SQLite API tests: account isolation, same-origin writes, bounded/schema-validated snapshots, atomic revision conflicts and deletion tombstones
- [x] Consent off by default; bind the first observed account even before conflict review, assert account on every mutation, and preserve cross-tab opt-out through delayed acknowledgements
- [x] Strict browser reads pause sync on storage errors/corruption instead of sending an empty replacement
- [x] Offline edits retry on reconnect; edits during an upload queue a follow-up; conflicting copies remain intact until an explicit choice
- [x] Offline readiness checks every required shell asset; reachable sign-in/denial invalidates active, waiting and in-progress cache generations; returning after sign-in rebuilds all assets
- [x] Touch controls at least 44px, phone form text at least 16px, safe-area spacing and visible offline/update status
- [x] Independent review findings fixed with regression tests; all 157 Node tests and Worker build pass locally
- [x] Final five-suite browser matrix, including offline reload/edit, two devices, conflict selection, separate accounts and cloud removal
- [x] Publish exact tested Worker and apply generated D1 migration; verify archive parity and hosted identity rejection
- [ ] Hosted walkthrough with the owner signed in; physical Android/iOS offline use and accessibility

Verified application source: `bc4565abf6b7cd51295eef383fe0e27b762c59e0`.
[CI run 40082991498](https://github.com/ZubaerAhmed13/Tasteit/actions/runs/40082991498)
passed all 157 Node tests, syntax/build checks and five browser suites in Chromium,
Firefox and WebKit; all three fresh Firefox continuity sessions passed. The
focus regression verifies that a disabled sync control survives window focus.
Offline reload uses an actual stopped origin, with a connection-refusal negative check.

Private preview **version 3** was published successfully on 24 October 2026 from
Site source `313fb662653fa580f1e3f9fc8e51d1b7ceaf19da`. All 38 packaged assets
match the application source; live HTML, app/sync scripts, styles and service worker
match their hashes, and `/tasteit-source.json` identifies that tested commit.
The managed `DB` binding contains `tasteit_sync` after applying the generated
migration. Read-only service access without a signed-in user identity receives
401 from `/api/sync`. Owner-only access is unchanged. No user identity was forged
and no private browser snapshot was uploaded during these checks. This verifies
publication and the missing-identity boundary; it does not establish the
signed-in hosted account walkthrough listed above.

## Collection audit — 23 October 2026

- 195 countries and 14 provider categories listed
- 790 recipe candidates obtained via the 26 first-letter API queries
- 334 country/category combinations nonempty out of 2,730 possible
- **0** country/category combinations reached 30 provider recipes
- **0** recipes independently certified or ranked as among the best
- 3,799 additional Wikibooks page titles and attributed links collected separately; country/category assignments remain unknown
- 3,799 source-page category label records collected from Wikimedia with zero failed batches, displayed as hints only; not counted in reviewed recipe totals
- 116 country/category combinations have joint country-and-course source-tag clues from Wikibooks; these are **not** validated recipes and do not alter the 790 sourced-record count. Audit artifacts: `data/world-research-gaps.csv` and `.json`.
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
* An owner-private testing preview is published. Hosted account walkthrough and physical-device acceptance remain separate checks.

## Next priorities

1. Source-by-source editorial curation and licensing review, especially for the many underrepresented country/category pairs. See docs/CURATION.md.
2. Manual live-browser review and defect remediation.
2. More personal search, editable cooking notes, optional dietary preference warnings (never allergy guarantees) and photo uploads with clear rights.
3. Better stock consumption, portion-aware future expiry forecasting, richer quantity conversions, quicker food capture and regional recipe source verification.
4. Multi-source discovery with regional provenance and authorised photos.
5. Authenticated hosted sync walkthrough, physical-device offline/reconnect testing and accessibility checks.
