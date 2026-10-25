# Rated recipe collection and personal home

The user requests 1,000 rated recipes from the approved websites, including main
dishes, sweets and appetisers; their Usual dishes and Want to try on home; and
ingredient photographs in the main recipe dialog shown in their screenshot.
They explicitly confirmed Usual dishes plus Want to try. Existing execution and
private publication are authorised; PR1 stays draft and unmerged.

## Approach

Extend the existing dependency-free app and original-source metadata catalogue.
A separate new app would split saved data again; copying publisher methods or
inventing scores would violate existing source constraints. Use the existing
16-host allowlist and extractor. Retain all 136 records byte-for-byte in meaning,
their IDs, the original 100 collection, kitchen data, backups and opt-in sync.

At least 1,000 records must have original recipe ratings and positive counts.
New additions require a normalised score of at least 0.8, count at least four,
HTTPS publisher photograph, and complete main-recipe ingredient metadata.
The eight existing unrated entries remain separately browsable. Preserve source
score scales, votes versus reviews, original category/cuisine and checked dates.
Use permitted original sitemaps/pages with checkpoints and gentle per-host pacing;
hold blocked/disallowed sources and ambiguous facts. This is a curated selection,
not an objective worldwide ranking. No instructions or review text copied.

## Experience and contracts

- Home shows distinct Usual dishes and Want to try shelves from existing saved
  flags, even when discovery is unavailable; each links to the matching cookbook
  list. Show up to four cards per shelf and the real full count. Removing or
  changing flags updates shelves; do not invent personal preferences.
- Approved-source cards save either flag with atomic fresh-store writes. A
  namespaced adapter retains the full original record in the existing saved-meal
  envelope. The main app opens these without calling TheMealDB, shows publisher
  ratings/provenance and links to the original cooking method. All ingredients,
  including rows beyond 20, remain available; unparsed source amounts are not
  silently converted or treated as measured stock.
- Main-dialog and selected-collection ingredient rows use one shared real-photo
  renderer and the existing strict matching/credit validation. Optional registry
  failure and image failure leave explicit gaps. Loading photos must not replace
  unsaved forms or move focus. No guessed new photographs or changed matching.
- Selected collection has source-backed meal-type filters and 24-card pages with
  full-result counts and previous/next controls. Filters reset to page one; direct
  world-favourites links still identify the original 100 records.
- Keep the offline shell complete when modules are added. Recipe/photo registries
  and external photographs remain optional online resources; saved metadata works
  offline. Preserve identity, consent and cloud isolation boundaries.

## Acceptance

Regression tests cover adapter/backup integrity, ingredients beyond 20, unavailable
photos, atomic saves, real home shelves, category filters and page boundaries.
Three-engine acceptance covers a selected-source save followed by home, reload,
main-dialog photos and credit links, failure fallbacks and 375px layout. Verify
the exact built assets and live provenance before reporting private publication.


Implementation decisions: Good Food split-node ratings receive a publisher-specific
adapter requiring exact main Recipe @id plus an explicit same-page mainEntityOfPage;
conflicting/unrelated metadata cannot provide a score. Four publisher quotas and
within-publisher count ordering retain broad course coverage; 872 additions yield
exactly 1,000 rated recipes and 1,008 total. Unparsed collected lines are held from
automated suggestions when any ingredient-skip preference is set; manually saved
home lists remain visible. Both decisions preserve source facts and avoid guesses.
