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

## Selected recipe websites — 24 October 2026

- [x] New recipe collection restricted to the 16 websites named in the shared list; exact HTTPS hosts, redirects, all canonical links and structured original-source references checked
- [x] Main recipe/root/main-entity evidence required; related recipes, app/dish ratings and review-versus-vote counts kept separate
- [x] Initial batch: 23 recipes from 11 selected sites; 17 published recipe ratings. Allrecipes, Serious Eats, NYT Cooking, TasteAtlas and SuperCook have explicit gaps in this pass
- [x] Original methods remain on publisher pages. Recipe metadata and ingredient facts collected; no instructions or user reviews copied
- [x] 44 visually reviewed real ingredient references, with original file, creator and licence evidence. 184 of 339 ingredient rows match; 155 remain visibly unresolved
- [x] Parenthetical alternatives, mixed ingredients and conflicting preparation forms cannot receive guessed references; actual grated-turmeric, fried-onion and salt/pepper regressions pass
- [x] Filter/search/rating/count display, absent/broken photos and phone layout have browser acceptance coverage; collection remains usable if the photo registry fails
- [x] One independent final review completed; all material findings reproduced and fixed. Additional sync-button interruption reproduced at the actual event owner and fixed
- [x] All 178 Node tests, syntax and Worker build checks pass
- [x] Final six-suite Chromium/Firefox/WebKit matrix and three fresh Firefox continuity sessions
- [x] Publish exact tested package, verify live page/data/script hashes and preserve owner-only access
- [ ] Physical phone, assistive technology and owner-signed-in hosted walkthrough

Verified application source: `f4126db171ee0399a1ad4f943b25968ce9549709`.
[CI run 40104650998](https://github.com/ZubaerAhmed13/Tasteit/actions/runs/40104650998)
passes all 178 Node tests, syntax/build checks and six browser suites in all three
engines. Firefox’s three independent continuity sessions pass, including focus
and unrelated offline announcements before sync opt-in.

Private preview version 4 was published from Site source
`f46cb8a71697b76b9a0cb1d256b9368c130e2864`. All 45 source assets and the source
provenance endpoint match the tested application. Live collection HTML, dedicated CSS, three modules and both data registries match their hashes; the live provenance endpoint names that tested commit. Owner-only access is unchanged.

The new collection is separate from the historical provider catalogue and existing
saved kitchen data. It is an initial collection, not worldwide completion or
complete ingredient-photo coverage. Ingredient reference photos come from
Wikimedia Commons independently of the recipe publisher allowlist. Their identity,
file provenance and stated licence have been reviewed for this private preview;
public-release rights clearance remains separate.

## Selected-source expansion — 24 October 2026

- [x] Four original TasteAtlas Recipe records added with recipe-specific published ratings, raw ingredient facts and source links; no dish scores substituted
- [x] Collection now has 27 recipes across 12 selected publishers, including 21 rated recipes. New Allrecipes and Serious Eats probes returned HTTP 402; new NYT probes had no unambiguous main Recipe metadata. The four remaining source gaps stay explicit
- [x] 33 additional ingredient references visually reviewed against original Commons file metadata, authors and licences, bringing the registry to 77 photographs
- [x] 249 of 378 ingredient rows match; 129 remain visibly unresolved. 182 previously correct matches retain the same photo; two pre-existing canned-tomato rows now show a gap rather than a fresh-tomato reference. 51 other gaps in the original 23 recipes are now covered
- [x] Regressions distinguish garlic clove units from the clove spice, allow a matching roasted-and-shredded reference and single chilled-and-cubed food, preserve actual alternatives, and reject sliced/cubed roots against powdered references
- [x] All 186 Node tests, syntax and Worker build checks pass locally
- [x] One independent data/contract review; candied citrus peel and mixed seasoning defects reproduced before correction. A related pre-existing canned-tomato mismatch also corrected; canned coconut milk retains its verified reference
- [x] Six-suite Chromium/Firefox/WebKit matrix and three fresh Firefox continuity sessions
- [x] Publish the exact tested source, check live hashes/provenance and preserve owner-only access

Verified application source: `61f30e5157891c9755fded38ae958f4fc3ec98b6`.
[CI run 40107515083](https://github.com/ZubaerAhmed13/Tasteit/actions/runs/40107515083)
passes all 186 Node tests, syntax/build checks and six browser suites in Chromium,
Firefox and WebKit, including all three fresh Firefox continuity sessions.

Private preview **version 5** was published successfully from Site source
`c89064c576af39854041706e752af03300c4522b`. All 45 source assets and the provenance
endpoint match the prepared Worker. The package preserves the Site identity, DB
binding and all three generated migration files. Live collection HTML, dedicated
CSS, three modules and both JSON registries match their SHA-256 hashes; live
provenance identifies the tested application commit. Native access remains one
owner and zero groups.

Collection and photo coverage remain incomplete. Specific forms, mixed foods,
unknown names and alternatives stay unresolved when an exact reference is absent.
Owner-signed-in hosted, physical-phone and assistive-technology checks remain open.

## Third selected-source curation pass — 24 October 2026

- [x] Nine source-linked recipes added from BBC Good Food, Maangchi and 196 Flavors; now 36 recipes across 12 of the selected 16 sites
- [x] 28 collected recipe ratings: explicit same-page AggregateRating references are resolved; conflicting, unrelated or unlinked graph nodes remain excluded. Maangchi’s earlier kimchi recipe was refreshed from its original page
- [x] Maangchi’s complete ingredient sections replace truncated structured ingredient lists, bounded before the next main section. Ingredients and ratings reproduce from eleven saved original pages; instructions are excluded
- [x] Missing rating copy says “not collected”, since a publisher may have a score that could not be safely collected. BBC’s conflicting rating evidence stays uncollected
- [x] 32 additional real Commons references visually inspected with original-file, creator and licence evidence; registry now 109. 340 of 489 ingredient rows match and 149 remain unresolved
- [x] Original 27 recipes gain 18 new supported row matches. Two unsupported toasted-sesame-oil references are now gaps; roasted sesame seeds use a separately reviewed toasted-seed photograph. All other old matches retain their photograph
- [x] Explicit ImageObject graph references now supply the original recipe thumbnails; unrelated author images and ambiguous definitions stay excluded
- [x] New regressions cover graph-linked ratings and images, complete source ingredients and numeric entities, plant versus base milk, plural cans, reviewed heated forms, comma preparation clauses and wine adjectives
- [x] All 199 Node tests and syntax checks pass locally
- [x] One independent data/contract review approved the candidate, with no Critical/Important findings. Its Minor equipment finding was corrected: explicitly labelled equipment groups are excluded, including Food processor in falafel and Blender in korma, with a regression
- [x] Worker build, six browser suites per Chromium/Firefox/WebKit and three fresh Firefox continuity runs
- [x] Publish the exact tested source, verify live hashes/provenance and preserve owner-only access

Verified application source: `73ff15d27274bda8ce9ad4593464c0478542fbf3`.
[CI run 40128040157](https://github.com/ZubaerAhmed13/Tasteit/actions/runs/40128040157)
passes all 199 Node tests, syntax/build checks, six browser suites in Chromium,
Firefox and WebKit, and all three fresh Firefox continuity executions.

Private preview **version 6** was published successfully from Site source
`caea373296653951e960fc763650115d3a075beb`. All 45 source assets and the provenance
endpoint match the prepared Worker. The package retains the Site identity, DB
binding and three unchanged migration files. Live collection HTML, dedicated CSS,
three modules and both JSON registries match their SHA-256 hashes; live provenance
identifies the tested application commit. Native access remains one owner and zero
groups. No user identity was forged and no private browser records were uploaded.

New Allrecipes retrieval still returned HTTP 402; Firecrawl reports that its scrape
service does not support that publisher. Search snippets are discovery leads only.
Allrecipes, Serious Eats, NYT Cooking and SuperCook remain collection gaps. No access
restrictions were bypassed. Photo searches that returned rate limits were left
unresolved. Public rights clearance, physical-device/accessibility checks and the
owner-signed-in hosted walkthrough remain open.

## 100 world favourites — 24 October 2026

- [x] Exactly 100 new, distinct recipe records added; all original 36 records/IDs unchanged. Total136 recipes,128 rated, from12 of the selected16 publishers
- [x] Every addition reproduces exactly from its permitted original source HTML, with factual ingredients, source photo URL and published4.1–5/5 rating plus positive count; no methods/reviews copied
- [x] Final selection:20 Europe,15 Americas,4 Oceania,5 Africa,5 Middle East,14 South Asia,37 East/Southeast Asia. These are editorial browsing groups, not certified origins or a worldwide ranking
- [x] Dedicated100-ID registry, Collection selector and direct query link; existing query/source/rated/sort filters compose. Invalid/unavailable collection metadata preserves ordinary browsing
- [x] All830 initial non-null new ingredient matches audited. Explicit photo exclusions prevent known wrong foods/parts/forms and retain blocked competing candidates so a compound cannot fall back to another wrong component
- [x] Existing109 reviewed ingredient references now cover1125 of2111 rows;986 remain gaps. Two earlier unsupported yogurt/thigh matches also become gaps; ingredient photography is incomplete
- [x] Bounded collector accepts144 seeds with hard cap250 and exact publisher validation; no new source/DB dependency
- [x] All206 Node tests, syntax and Worker build pass locally
- [ ] Final six-suite Chromium/Firefox/WebKit acceptance, including100-card direct collection, composed filters, registry failure and mobile layout; three fresh Firefox continuity executions
- [ ] One independent final review and any material fixes
- [ ] Publish exact tested source, verify live hashes/provenance and retain owner-only access

New source retrieval respects published access rules:196 Flavors disallows general
crawlers and was excluded from this100; Budget Bytes robots returned403 and no
recipe was fetched. Existing records from earlier batches remain unchanged. Wellington
and harira video landing pages, two incomplete Maangchi layouts and other unused
candidates were held out. Small source voting samples remain visible; the minimum
among these100 is4 votes. Public-release rights, owner-signed-in hosted walkthrough
and physical-device/accessibility acceptance remain open.

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
