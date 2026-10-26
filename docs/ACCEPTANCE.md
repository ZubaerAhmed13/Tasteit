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

## 100 world favourites — published 25 October 2026

- [x] Exactly 100 new, distinct recipe records added; all original 36 records and IDs unchanged. Total: 136 recipes, 128 rated, from 12 of the selected 16 publishers.
- [x] Every addition reproduces exactly from its permitted original source HTML, with factual ingredients, source photo URL and published 4.1–5/5 rating plus a positive count. No methods or reviews copied.
- [x] Editorial selection: 20 Europe, 15 Americas, 4 Oceania, 5 Africa, 5 Middle East, 14 South Asia and 37 East/Southeast Asia. These are browsing groups, not certified origins or a worldwide ranking.
- [x] Dedicated 100-ID registry, Collection selector and direct query link. Existing query, source, rated and sort filters compose. Invalid or unavailable collection metadata preserves ordinary browsing.
- [x] All 830 initial non-null new ingredient matches audited. Explicit photo exclusions prevent known wrong foods, parts and forms, while retaining blocked competing candidates so compounds cannot fall back to another wrong component.
- [x] Existing 109 reviewed ingredient photographs cover 1122 of 2111 rows; 989 remain gaps. Two earlier unsupported yogurt/thigh matches also become gaps. Ingredient photography remains incomplete.
- [x] Bounded collector accepts 144 seeds with a hard cap of 250 and exact publisher validation; no new database or runtime dependency.
- [x] All 209 Node tests, syntax checks and Worker build pass locally and in CI.
- [x] All six browser suites pass in Chromium, Firefox and WebKit, including the 100-card direct collection, composed filters, unavailable registry and mobile layout. Firefox continuity passes in three fresh executions. All 20 browser-suite PASS results checked in detailed logs.
- [x] Independent data/contract review found no Critical or Important issues. Two Minor photo mismatches (green capsicum wording and cilantro stems) were reproduced and fixed with regressions. Focused follow-up approved those fixes and the CI corrections.
- [x] Exact tested source published as private preview version 7. All 46 source assets match the native Worker; eight live collection paths and the provenance endpoint match the package. Audience remains one owner, zero external visitors and zero groups. PR #1 stays draft and unmerged.

Application source: `d2a128a2be04d241a80103f98720dc9fc086bdc2`.
[Final CI run 40165360139](https://github.com/ZubaerAhmed13/Tasteit/actions/runs/40165360139).
Native Site source: `877bb7e46914552b69a0fadf54776956d692438a`.
[Open the 100 world favourites](https://tasteit-kitchen-preview.bhuyainria.chatgpt.site/selected-recipes.html?collection=world-favourites-100).

Detailed checks exposed two pre-existing date-sensitive fixtures and a shell
AND-list failure masked by the subsequent conditional. Non-expiry unit scenarios
now use undated stock; explicit expiry tests retain their fixed date. The browser
fixture covers every daily featured-initial rotation. Each browser command now
stands alone, and a regression executes the real workflow commands with injected
failures in all six suites across all three engine configurations. Earlier green
run 40165136964 is not accepted as browser evidence; the final run above passes
every suite with the corrected gate.

New source retrieval respects published access rules: 196 Flavors disallows general
crawlers and was excluded from these 100; Budget Bytes robots returned 403 and no
recipe was fetched. Earlier records remain unchanged. Wellington and harira video
landing pages, two incomplete Maangchi layouts and other unused candidates were
held out. Small source voting samples remain visible; the minimum among these
100 is four votes. Public-release rights, owner-signed-in hosted walkthrough and
physical-device/accessibility acceptance remain open.

## Ingredient photography continuation — 25 October 2026

- [x] Added 63 visually inspected real photographs. Total: 172 references, covering 1317 of 2111 source ingredient rows; 794 remain explicit gaps.
- [x] 195 newly covered rows and 12 more specific light/dark soy-sauce references. No prior match is lost. All 136 recipe records and collection IDs remain unchanged.
- [x] Every new reference reproduces its creator, licence and image URL from fresh original-file metadata. All 63 inspected for generation markers; none found. Camera/software/date metadata is available for 49. Metadata and visual inspection are evidence, not a forensic authenticity guarantee.
- [x] Explicit named cucumber and chili varieties without compatible evidence remain gaps. Eight otherwise verified references with no eligible current rows stay outside the published registry.
- [x] Comparison references identify the food/form shown: green/red/yellow peppers, rice flours, almond forms, and mustard forms with ground white mustard at upper right. The existing UI displays the entire reference image and links its original file.
- [x] Exact-source regressions fixed known single-food descriptors for plain/all-purpose flour, thawed pastry and bread size notes. Unknown additional foods and alternatives remain unresolved. Explicit capsicum/bell-pepper slash aliases resolve one food without weakening the competing-food guard.
- [x] All 213 Node tests and syntax checks pass locally; Worker build succeeds. No new dependencies, persistence format or database migration.
- [x] Independent final review: no Critical issues; one Important source-credit issue corrected. Three references now render the supplied additional attribution links beside the image. Unsafe or incomplete declared credit links make a reference ineligible. Unit regression verified RED→GREEN; actual link destinations covered in browser acceptance.
- [x] Detailed final CI: all six suites in Chromium/Firefox/WebKit and three Firefox continuity executions; all 20 PASS results checked in the job logs. Required adjacent credit links pass in all three engines.
- [x] Exact-source native package published as private preview version 8. All 46 source assets and the provenance endpoint match the prepared Worker; the archive preserves the Site identity, DB binding and all three migration files. Eight live collection paths and the source-provenance endpoint match the tested package. Audience remains one owner, zero external visitors and zero groups. PR #1 stays draft and unmerged.

Verified application source: `4b417fff89a13936e86b4995bef7410441135e37`.
[Final CI run 40224331929](https://github.com/ZubaerAhmed13/Tasteit/actions/runs/40224331929)
passes all 213 Node tests, syntax/build checks and all 20 browser-suite executions.
Native Site source: `9a434104ffd0659781a431b3b2fa4ac6dcfbda12`.
[Open the updated collection](https://tasteit-kitchen-preview.bhuyainria.chatgpt.site/selected-recipes.html?collection=world-favourites-100).

The corrected credit rendering retains the original Commons and licence links and
adds source-requested links for garlic chives, wonton wrappers and green bell
pepper. These are photograph credits, not additional recipe collection sources.

Source searches paused when rate-limited, then resumed through one coordinated
queue respecting cooldowns. Original-file metadata, visual galleries and every
changed match were audited. Assumed or conflicting creator credits, unclear forms,
finished dishes, unrelated results and a legacy green-pepper image with a source
verification flag were held. A clearly credited CC BY-SA color comparison supplies
the green-pepper reference instead.

The remaining gaps include unspecified oils or spices, alternatives and mixtures,
unsupported named forms/varieties and unavailable suitable evidence. Source-provided
heading/equipment strings also remain unillustrated; upstream ingredient-string
cleanup is a separate editorial task. These counts describe metadata matches;
external image delivery can fail and retains its visible fallback. Public-release
rights, physical-device/accessibility and owner-signed-in hosted acceptance remain
open.

## Rated thousand and personal home — 25 October 2026

- [x] Added 872 recipes from permitted original RecipeTin Eats, BBC Good Food, Just One Cookbook and Swasthi pages. All selected records reproduce exactly from retained original HTML and checked SHA-256 hashes. Minimum new source count: five; minimum normalized score: 4/5.
- [x] Total 1,008 recipes from 12 approved publishers; 1,000 have published recipe ratings and eight preserved entries remain unrated. All original 136 record hashes and world-favourites IDs are unchanged. No methods or review text copied.
- [x] Original publisher category filters identify 476 mains, 190 sweets/desserts and 172 appetisers/snacks; categories overlap. Publisher balance and within-source rating-count evidence guide curation, rather than a claim of objective world ranking.
- [x] Home exposes My usual dishes and Want to try, including while discovery is unavailable. Collection cards save either flag using a fresh strict snapshot and persist-before-render; saved records retain labels, cooking history and plans.
- [x] Namespaced collected recipes open in the main kitchen dialog without a TheMealDB lookup. Full original ingredient lists, including rows beyond 20, survive backups. Source quantities remain unparsed and unscaled; cooking methods link to the original author. Automated suggestions hold unparsed collected recipes when ingredient-skip preferences are set.
- [x] Main-dialog and collection ingredients share one escaped, credited photo renderer. Late registry loading updates only reference cells and preserves forms/focus; exact screenshot regressions select the oil for Sesame Seed Oil and the verified ground form for Minced Beef, while rejecting conflicting forms; broken/unavailable images keep explicit fallbacks. Existing 172 reviewed references match 7,585 of 13,647 rows; 6,062 remain gaps.
- [x] Meal-type filters compose with source/search/rating/collection controls. 24-card pages preserve complete-result counts; filter changes reset the page, and the original 100-record collection remains intact across five pages.
- [x] All 229 Node tests, syntax checks and Worker build pass locally. No new runtime dependency or database migration. The offline shell includes all four additional imported modules.
- [x] Fresh final review findings reproduced and corrected: compact restorable 1,008-recipe backups, validated next-state writes, explicitly reviewed short pantry names for long original source lines, and committed filter state separated from drafts. Four regressions verified RED→GREEN.
- [x] Detailed three-engine browser checks, including cross-page saves, home/reload, actual image decoding, additional credits, drafts/focus, real source-line purchases/backup restoration, failure fallbacks and mobile layout. All 20 PASS results inspected: six suites each in Chromium and WebKit; eight Firefox executions including three independent continuity runs.
- [x] Published exact tested native package as private preview version 9 on 26 October 2026. All 48 source assets and provenance match the prepared Worker. The archive preserves Site identity, DB binding and all three migration files. All 19 checked live release paths and provenance match the tested application source. Audience remains one owner, zero groups and zero external visitors; PR1 stays draft and unmerged.

Verified application source: `4ce206ee9df4f47f85543c9a450a746a2dbd7028`.
[Final CI run 40228614990](https://github.com/ZubaerAhmed13/Tasteit/actions/runs/40228614990)
passes all 229 Node tests, syntax/build checks and all 20 browser-suite executions.
Native Site source: `7822f2deb55f9761b785f53d946f4bc8f3deffff`.
[Open the rated collection](https://tasteit-kitchen-preview.bhuyainria.chatgpt.site/selected-recipes.html).

The final screenshot fixture uses a separate context with service workers blocked
so its mocked legacy API response is observable. The main cross-page flow and
dedicated offline continuity runs retain real service workers. Product assertions
and timeouts were not weakened. Real image decoding uses deterministic browser
fixtures; live availability of every external image is not guaranteed. A sampled
ordinary olive-oil photograph request succeeded; other missing images retain their
visible fallbacks. Owner-signed-in hosted walkthrough, physical-device/accessibility
acceptance and public-release rights review remain open.

BBC Good Food now emits its rating in a separate top-level JSON-LD object. Only
that publisher's exact main Recipe identity with explicit owning-page evidence
can receive its matching direct score. Conflicting or unrelated supplements stay
unrated; the general rejection of unlinked same-ID enrichments is preserved.
Fresh Woks retrieval was held for its explicit crawler restriction. Prior source
records remain unchanged. Both research streams stopped at a sufficient checkpoint;
872 records were selected from 1,039 eligible-source candidates after holding ten
standalone sauce/stock/condiment records and balancing four publishers and courses.

## Breakfast expansion — 26 October 2026

- [x] Added exactly 100 distinct new approved-source breakfasts: 35 RecipeTin Eats, 30 BBC Good Food and 35 Swasthi recipes, selected from 127 eligible candidates. Every addition has an explicit source Breakfast/Brunch category, a published score of at least 4/5, at least 15 votes/reviews, an original publisher dish photograph and usable original ingredient metadata. Source communities differ; this is an editorial selection, not an official worldwide ranking.
- [x] Total 1,108 recipes, 1,100 rated; 146 breakfasts, of which 143 are rated. Three earlier unrated breakfasts remain unchanged and available by clearing the published-rating filter. All 1,008 previous records and original world-favourites IDs remain unchanged, with no canonical URL duplicates.
- [x] All 100 selected original HTML hashes and exact fresh extractions verified. The committed evidence manifest records original URLs, dates, hashes, discovery pages, selection policy and preserved-record hash. No methods or review text copied. Fresh robots/access checks respected; research stopped at a sufficient checkpoint.
- [x] Existing 172 ingredient references now match 8,136 of 14,737 rows; 6,601 remain explicit gaps. No new ingredient photographs or matching rules were invented. The existing credited renderer, failure fallbacks, kitchen saves and home shelves are reused.
- [x] New data-integrity acceptance observed RED against the 1,008-record baseline and GREEN after expansion. All 230 Node tests, syntax checks and Worker build pass locally. No runtime dependency, application-JavaScript, persistence or database migration change.
- [x] Independent final review found zero Critical, Important or Minor issues. Its audit reproduced all 100 original HTML hashes and exact extractions against the current strict parser, preserved all 1,008 git-base records, and found no category/rating/canonical-URL or same-publisher title/photo/ingredient duplicates. Three ordinary sampled publisher dish-image requests returned image/jpeg successfully; this does not guarantee every external image remains available.
- [x] Detailed final three-engine browser logs inspected: six suites in Chromium and WebKit; eight Firefox executions including three independent continuity runs. All 20 PASS results include full Breakfast pagination and visibility of every new recipe ID. The CI merge commit and candidate have identical source trees.
- [x] Exact-source native package published as private preview version 10. All 48 source assets and source provenance match the prepared Worker. The archive preserves Site identity, DB/r2 bindings and all three migration files. All 19 checked live release paths and provenance match the tested source. Audience remains one owner, zero groups and zero external visitors; PR1 stays draft and unmerged.

Verified application source: `72de55d4969a7fec56df275acd8c8fbd2a24d6ca`.
[Final CI run 40302717364](https://github.com/ZubaerAhmed13/Tasteit/actions/runs/40302717364)
passes all 230 Node tests and all 20 browser-suite executions. CI merge
`65c378785ceea86564ecdd26d74989d6dd07edab` and the application candidate have
identical tree `df299e8a4135a70f3531e2e6ad9cb683d7b8d964`.
Native Site source: `efec7180846e00922af83cfce96783f474826f9f`.
[Open the collection](https://tasteit-kitchen-preview.bhuyainria.chatgpt.site/selected-recipes.html)
and select Meal type → Breakfast. Existing source-photo availability,
physical-device/accessibility, owner-signed-in hosted walkthrough and
public-release rights limits remain unchanged.

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

## Trust and continuity release — 26 October 2026

- [x] Damaged local records block ordinary writes and show recovery guidance. Raw
  downloads, last-good restore and existing v1 backup imports preserve the exact
  unreadable copy first. Denied storage accessors and failed/quota writes have
  focused regressions and actual browser acceptance. Recovery checkpoints are
  best effort after successful primary saves and may be older when storage is full.
- [x] Catalogue loading is independent of optional photo/curation metadata. Fetch
  and body parsing have 12-second deadlines and local retry controls. Late photos
  preserve drafts/focus; world-favourites waits for membership metadata.
- [x] Saved publisher metadata is discoverable offline without copying cooking
  methods. Full committed selected-route state survives reload/Back/saves, and
  returning from an internal recipe restores result focus.
- [x] Secondary/source/accent/ingredient-gap/saved-action/due-date CSS pairs meet
  4.5:1. Full accessibility conformance and physical-device acceptance remain open.
- [x] No recipe, ingredient-registry, dependency, backup-format, database or account
  boundary change. Catalogue remains 1,108 recipes, 1,100 rated; 146 breakfasts,
  143 rated. Ingredient coverage remains 8,136/14,737 rows from 172 references.
- [x] Full local and CI verification: 246 Node tests, syntax/Worker build and all
  20 browser-suite executions (six Chromium, six WebKit, eight Firefox). Detailed
  logs inspected. Fresh final review issues fixed with RED→GREEN regressions in
  one pass; no unresolved/deferred findings.
- [x] Owner-private version 11 publishes application source
  `42e5c301788627c64c19319d4a0590f4558a1a1c` through native Site source
  `cc247190ea4955459596291c8a8074af0c7eeef9`. All 50 source assets plus provenance
  match the prepared Worker; archive preserves Site ID, DB/r2 and three migration
  files. Audience remains one owner, zero groups and zero external visitors.

[Release notes and rulings](releases/2026-10-26-trust-continuity.md) ·
[Final CI run 40353743082](https://github.com/ZubaerAhmed13/Tasteit/actions/runs/40353743082).
CI merge `b8b33de3eef5fd664d8aa1febaecefbc5898403e` equals the candidate's tree
`aecdd12fabe0969a782770fe9734b3a44d9e8e6b`. PR1 remains draft and unmerged.

All 21 checked live release paths and application provenance match the tested
Release 1 source. No owner-signed-in hosted or physical-device walkthrough is claimed.

## Coherent interface release — 26 October 2026

- [x] Default Home search now combines all 1,108 approved-source recipes with the
  personal cookbook, including ingredient metadata. TheMealDB remains an explicit
  additional source. Exact-ID merging retains personal flags and avoids duplicates.
- [x] Search-first Home, meal shortcuts and usual/want-to-try shelves; four shared
  destinations; research under More tools; native mobile filter disclosure.
  Compact cards preserve publisher ratings/count types and original-method links.
  Photos/titles open internal details, which can add recipes atomically to the
  existing daily plan. Readable ingredient-photo credits and larger-photo links.
- [x] Validated full filters and page URLs, reload/Back, result focus and scroll,
  source-switch draft preservation, late cuisine options, course-only removal,
  offline saved ingredient search and composed source/course/rating filters.
- [x] One fresh independent final review; all findings addressed with observed
  RED→GREEN regressions in one fix pass. No unresolved/deferred findings. Physical
  magnification/screen-reader checks remain distinct from 320CSSpx reflow acceptance.
- [x] Final CI40361696542: 266 Node tests, syntax/build and all 23 browser-suite
  executions pass. Seven suites in Chromium and WebKit; nine Firefox executions
  including three independent continuity sessions. Detailed logs inspected.
- [x] Application source `65e7c0558d1d90d8a959461e0a4ef9cd561e95ce` and synthetic
  CI merge `8e86e6e7928f47e7b2d53f6bb5e558a77dc177f8` have identical tree
  `cb71664bc4c7630be2fd82b226bf09362366db4a`. All 54 source assets plus provenance
  match the prepared Worker; archive matches Site ID, DB/r2 and three migration files.
- [x] Published private version12, native source
  `a621ca409fc83a8b70da230be9b869695b4ea594`. Audience remains one owner, zero groups,
  zero external visitors. PR1 remains draft and unmerged. No recipe/photo-registry,
  dependency, backup-format, database or account-boundary change.

[Release notes and rulings](releases/2026-10-26-coherent-interface.md) ·
[Final CI run](https://github.com/ZubaerAhmed13/Tasteit/actions/runs/40361696542).

All 25 checked live Release 2 paths and tested application provenance match.
No owner-signed-in hosted walkthrough or physical-device/zoom/screen-reader
conformance claim is inferred from automated acceptance.
