# Tasteit v0.1 — acceptance boundaries

## Purpose

The current release is a GitHub-only development prototype. There is no public deployment.

## Automated acceptance

GitHub Actions runs unit, API and Playwright browser checks against deterministic API fixtures.

- [x] Browse, search, open recipe, check ingredients and guided instructions
- [x] Save recipes, create and edit a personal family recipe, refresh and verify persistence
- [x] Add pantry records and exclude expired or zero-quantity records from matches
- [x] Build a weekly meal plan and missing-ingredient shopping list
- [x] Export local data to JSON and restore from a backup
- [x] Navigate on a 375px mobile viewport with no horizontal overflow
- [x] Dialog Escape handling and restored focus after collection changes
- [x] Dynamic cuisine list and initial recipe diversity via API fixtures

## Human / real-device gates not yet verified

- [ ] Test live TheMealDB browsing and photographs in an ordinary browser
- [ ] Inspect mobile portrait and landscape on physical devices
- [ ] Test Safari and Firefox, including accessible keyboard navigation
- [ ] Exercise browser storage denial, quota exhaustion and backup cancellation
- [ ] Verify ingredient-name variants, quantities and safe food substitutions
- [ ] Check factual recipe authenticity and photography reuse rights before public release

## Honest constraints

* TheMealDB is not a complete collection of every cuisine. The provider's strArea value is a classification, not guaranteed proof of traditional origin.
* Community photos are provided by TheMealDB and must not be passed off as Tasteit originals. See https://www.themealdb.com/terms_of_use.php ; check third-party permissions before public distribution.
* Ingredient overlap is presence-only, **not** proof that enough food or a safe amount is available. Expired and zero-quantity items are excluded, but recipe preparation, safety and allergens are not verified.
* Personal recipes, pantry items, saved collections and plans are stored in browser localStorage. JSON backups are local, unencrypted files; safeguard them accordingly.
* Developer API key 1 is for testing and personal development. Arrange appropriate service terms/key before public release. Never commit private API keys to client-side JavaScript.
* No hosting or deployment has been performed.

## Next priorities

1. Manual live-browser review and defect remediation.
2. Recipe cooking notes, last-cooked history and personal organisation.
3. Quantity-aware shopping and better ingredient names.
4. Multi-source discovery with regional provenance and authorised photos.
5. Optional authenticated sync after local flows are trustworthy.
