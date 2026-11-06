# Complete recipes inside Tasteit

Published 29 October 2026 to the existing protected Vercel production project.

This release adds **50 complete Wikibooks Cookbook recipes**, separately identified from the existing **1,108 publisher records**. The curated catalogue now has **1,158 records**. The original file, IDs, genuine source ratings, ingredient references and usual/wanted collections are preserved. Original publisher records retain their source links; these 50 methods do not replace them.

Home → **Browse complete recipes** opens the licensed collection. Recipe details show ingredients, numbered logical steps and recipe notes. Guided cooking supports Previous/Next/Finish, ingredient checkmarks, manual timers and saved progress. **Save recipe for offline** keeps the full recipe and credits in this browser. Wait for **Ready offline** before disconnecting; saved recipes can then reopen, resume and finish without a publisher request. Backup export/import retains the full method and text attribution.

Source quantities do not scale automatically; details and cooking mode explicitly require manual adjustment for selected portions. Source introductions, including the 60-person historical chipped-beef batch, are retained as notes.

Recipe text is CC BY-SA 4.0, with exact source revisions, contributor/history links and change notices in details, cooking mode, saved copies and backups. Primary quantities and preparation/package measurements are retained; secondary parenthetical conversions are omitted only where an explicit primary measure exists. No missing timings, serving counts, star ratings or dish photographs are invented. The existing separately credited ingredient reference photos remain available. See [per-recipe credits](../recipes/complete-recipes-license.md).

Coverage: 19 Breakfast, 7 Main, 7 Dessert, 5 Appetiser, 1 Soup and 11 Other, using dated source category evidence. Community recipes are not claims of tested culinary quality or a global ranking. Pages with ambiguous methods, missing dependent components or known inconsistent ingredient quantities were excluded.

## Verification

- Local syntax and all **312/312 Node tests** pass, including 10 Python extraction tests.
- Both Worker and Vercel builds succeed. All 50 final records reproduce their pinned source ingredients, logical steps and notes; every revision has a matching credit.
- [CI 40813325463](https://github.com/ZubaerAhmed13/Tasteit/actions/runs/40813325463): all 4 jobs pass, 32 browser-suite executions (10 Chromium, 10 WebKit, 12 Firefox). Complete-recipe acceptance covers changed-portions disclosure, saved full text, real server shutdown/offline reload, resumed step/checklist/manual timer, finishing and backup licence retention. All previous suites remain enabled.
- Tested application `3974208c6be9327698ba3116bcb42c1dc269976b` and actual CI merge `a85c8a4add1f1598767b3e7bfdea56403b928232` share tree `8b476978a678ad072ec7550ad44c5de4054e6e4a`.
- Vercel deployment `dpl_97wjf2tT8m7C9U592agKs8exE8Pd` is READY; canonical tasteit-zeta.vercel.app resolves to that deployment/source. All-deployments Vercel Authentication remains enabled. All 59 live application assets match the tested local source byte for byte, including the separate complete-recipe snapshot. Source provenance and digest `876c48e1d49d6e58b4fe8b0daab58a48b34435653668c003f1d2753a872452b1` match. Anonymous access remains protected on all 4 deployment/alias hosts at root, original/new recipe snapshots and account API. Server/config source paths return 404. The read-only account capability check succeeds. The temporary verification share link was revoked with zero remaining bypass entries. No QA users, account writes or emails were created for this content release.
- New-deployment runtime error/fatal count scan (10-minute window) reported no groups. This is a limited post-deployment check; physical devices and long-term reliability are not established by it.
- URL: [Tasteit](https://tasteit-zeta.vercel.app). Target: protected production. Status: READY. Source: `3974208`. Framework: existing vanilla/static app with Node account/sync functions. Build duration: 11.6 seconds. Original Site remains version 13.

PR #1 remains draft and unmerged. Original owner-private Site version 13 is unchanged. The separate Supabase confirmation URL dashboard setup remains pending owner approval and is outside this content release.

## Final review and decisions

One fresh read-only whole-release review (GPT-6-astra/high) checked the source corpus and software paths. Three Important findings were fixed in one continuing RED→GREEN pass: per-snapshot retention through alternating/both-failed retries; ingredient-level subrecipe dependency rejection and replacement of Breakfast Burrito; and explicit manual-adjustment wording for unchanged source quantities. The omitted 60-person historical batch context was regraded Important by user effect and fixed with source-introduction notes. Each fix had an observed failing regression before implementation; the final local suite is 312/312, and both builds pass. Corrected three-engine CI passes all 32 browser-suite executions; all 312 Node tests pass in CI. No re-review or additional implementation delegation.

Deferred minor: the separate publisher-only catalogue has a zero-count Wikibooks filter. The main application exposes all 50 complete recipes.

Rulings, with their consequences:

- Continue the approved full-recipe direction natively in the current feature checkout without repeating design/integration permissions — user selected the proposed approach and requests implementation — cost if wrong: content release scope may need revision.
- First release 50 complete Wikibooks recipes, preserving original 1,108 separately — bounded verified coverage can be shipped accurately — cost if wrong: more complete recipes may be desired in the next batch.
- Retain source primary ingredient quantities and omit parenthetical unit conversions — several source equivalents conflict, so conversions are not inferred or repaired — cost if wrong: secondary units are unavailable. Per-recipe change notices disclose this adaptation.
- Culinary quality, nutrition, authenticity and food-safety certification remain unverified — source fidelity and software behavior do not establish those claims — cost if wrong: source community guidance may disappoint in cooking.
- Keep ingredient scaling and serving-limit redesign outside this release; source quantities now require explicit manual adjustment — a truthful bounded correction meets this release without inferring measures — cost if wrong: cooks must adjust amounts manually.
- Leave unrelated rewrites and the separately pending Supabase email-dashboard step outside this content release — neither is required for licensed offline recipes and dashboard browser access has not been approved — cost if wrong: email-confirmation URL setup remains pending.
- Require protected live publication verification separately; physical-device acceptance remains unverified — browser engines do not establish behavior on actual phones — cost if wrong: device-specific issues may remain.
