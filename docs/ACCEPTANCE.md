# Tasteit v0.1 — acceptance boundaries

## Purpose

The current release is a GitHub-only development prototype. There is no public deployment.

## Automated acceptance

GitHub Actions runs unit, API and Playwright browser checks against deterministic API fixtures.

- [x] Browse, search, open recipe, check ingredients and guided instructions
- [x] Save recipes, create and edit a personal family recipe, refresh and verify persistence
- [x] Record a cooking experience with optional rating and notes, then verify its backup restoration
- [x] Add recipe labels, search and filter private collections, and verify label preservation in JSON backup
- [x] Add pantry records, distinguish separately dated batches of the same ingredient, and exclude past-dated or zero-quantity records from automatic matches
- [x] Build a weekly meal plan and a shopping list with conservative unit-aware shortfalls
- [x] Confirm a recipe's original servings, adjust target portions per recipe and per planned day, and verify scaled shopping amounts and backup migration
- [x] Preserve sparse ingredient positions and flag unsupported measures/fractional whole items rather than silently scaling them
- [x] Export local data to JSON and restore from a backup
- [x] Navigate on a 375px mobile viewport with no horizontal overflow
- [x] Dialog Escape handling and restored focus after collection changes
- [x] Dynamic cuisine and category lists, provider-category browsing, full provider A–Z browsing and random discovery with no cached surprise results
- [x] Manual recipe publisher URL validation, preserved original link in backups and no automatic copying of third-party photographs
- [x] Graceful photo-unavailable fallback on cards and recipe details rather than unrelated stock photos
- [x] Bulk pantry paste/preview/confirm, duplicate protection, ambiguous quantity rejection, invalid-date checks and stale-preview invalidation
- [x] Preserve separate ingredient quantities/dates through JSON backup; show due-soon batches and test recommendation ordering
- [x] Test conservative ingredient regional names without conflating allergen- or product-specific variants

## Human / real-device gates not yet verified

- [ ] Test live TheMealDB browsing and photographs in an ordinary browser
- [ ] Inspect mobile portrait and landscape on physical devices
- [ ] Test Safari and Firefox, including accessible keyboard navigation
- [ ] Exercise browser storage denial, quota exhaustion and backup cancellation
- [ ] Verify ingredient-name variants, quantities and safe food substitutions
- [ ] Check factual recipe authenticity and photography reuse rights before public release

## Honest constraints

* TheMealDB is not a complete collection of every cuisine. Its cuisine and category fields are not guarantees of authentic regional origin, vegetarian certification or allergen safety. Source photographs/videos are linked and credited when supplied.
* A–Z browsing is limited to TheMealDB's available catalogue; manually linked external sources are not automatically parsed or rehosted. Community photos are provided by TheMealDB and must not be passed off as Tasteit originals. See https://www.themealdb.com/terms_of_use.php ; check third-party permissions before public distribution.
* Recipe serving counts are user-confirmed, not inferred from the provider. Supported measurements can be scaled for each planned day; instructions, seasonings, unknown measures, density conversions and fractional whole-item decisions still require manual judgement. Stock availability is checked against currently recorded stock, not projected stock on the future cooking day. Past best-before dates are excluded from matching conservatively, but neither past dates nor future dates prove whether food is safe. Users must check storage and freshness. Tag labels and cuisine text are user/source labels, **not** validated dietary or allergy certifications. Ingredient discovery starts with name presence. The separate measurement engine estimates shortfalls only for confidently parsed, compatible units; ambiguous and mixed units are flagged for review rather than guessed. These estimates are **not** food-safety, allergy, substitution or adequate-portion clearance.
* Personal recipes, pantry items, saved collections and plans are stored in browser localStorage. JSON backups are local, unencrypted files; safeguard them accordingly.
* Developer API key 1 is for testing and personal development. Arrange appropriate service terms/key before public release. Never commit private API keys to client-side JavaScript.
* No hosting or deployment has been performed.

## Next priorities

1. Manual live-browser review and defect remediation.
2. More personal search, editable cooking notes, optional dietary preference warnings (never allergy guarantees) and photo uploads with clear rights.
3. Better stock consumption, portion-aware future expiry forecasting, richer quantity conversions, quicker food capture and regional recipe source verification.
4. Multi-source discovery with regional provenance and authorised photos.
5. Optional authenticated sync after local flows are trustworthy.
