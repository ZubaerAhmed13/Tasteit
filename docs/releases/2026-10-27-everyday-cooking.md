# Tasteit Release 3 — Everyday cooking and measured quality

Published 27 October 2026 as owner-private Site version 13.

## Result

Four daily meal slots now have independent portions and week browsing. Old single-meal dates remain Dinner. Recipe details select a day and slot; planned recipes open directly with that slot's portion target. Shopping and purchase review include every meal in the coming seven days, with that scope labelled even when viewing another week. Planning and preparation checkmarks do not change stock.

Publisher recipes now offer ingredient preparation check-off and a manual timer. Checks, chosen portions and clock-based deadlines persist across closing/reopening and backups. Personal/provider checklists use the selected scaled amounts, preserving review labels for ambiguous quantities. Original publisher methods stay at source; no directions were copied. Existing guided cooking is retained.

Three source-checked time/yield records display with check dates: Chicken Curry and Spaghetti Bolognese from RecipeTin Eats, and Shakshuka from BBC Good Food. Other records explicitly show unknowns. Publisher yields do not silently become user-confirmed serving references. Collected ingredient lines and unknown quantities remain untouched.

Home retains My usual dishes and Want to try, with recorded-date ingredient ideas linking into approved/saved discovery. Ingredient photos retain adjacent creator/licence credits and full-image links. A narrow spoon-measured paprika rule restores 24 rows: **8,160/14,737** ingredient rows match a verified reference; **6,577** remain explicit gaps. The registry remains **172** authentic reviewed photographs; no generated images or substitutes were added.

## Measured performance

Controlled full-catalogue CPU run, Node 24.22.1/Linux/x64, 14,737 rows and 172 references: uncached **8,733.06 ms**, compiled cold **532.43 ms**, compiled warm **1.11 ms**. All result digests are identical: `9933c23cb3b415b9ffef432c5fe8ec1d43cadb395da97435a894b3bcc5e753df`.

This measures ingredient matching, not browser/phone performance, Lighthouse or real-user speed. The earlier unmodified matcher probe took about 5.8 seconds on the same full dataset. Compilation is justified; an IndexedDB migration is not. Reproduction: `node scripts/profile-ingredient-matching.mjs`. Evidence: `docs/research/2026-10-27-ingredient-performance.json`.

## Verification and review

- **281/281 Node tests**, syntax and Worker build pass.
- **CI 40464185834**: all four jobs succeed; 26 browser-suite executions pass. Eight suites each in Chromium/WebKit, ten Firefox executions including three independent continuity sessions. Detailed job logs inspected: 122055547648 (Node), 122055547760 (Chromium), 122055547723 (WebKit), 122055547476 (Firefox).
- Application source `d09079dd26f7e388f0af7595ff8490c28653741c` and CI merge `65a9326885f49f663d0080141b8e3b5e52aada9f` have identical tree `80076decd8937477fcd497c3498e4120fea16ad9`.
- One fresh read-only whole-release review, GPT-6-astra/high. Two Important findings fixed in one continuing RED→GREEN pass: checklist showing original amounts after scaling, and planned recipe opening losing slot portions. Actual-controller tests cover two slots with different portions and ordinary discovery defaults; browser acceptance covers the resulting preparation and reload. No Critical, Minor or unresolved findings. A suspected zero-method keyboard edge was checked and dismissed because step movement clamps to zero.
- Backup version 2 exports; version 1 imports and legacy Dinner keys remain supported. Real SQLite sync tests prove multi-slot roundtrip and account isolation. Recovery, checkpoints, stale purchase reviews, atomic stock/journal writes and cloud revisions remain guarded. No database, binding or dependency migration.
- Catalogue remains 1,108 recipes, 1,100 rated; 146 breakfasts, 143 rated. Original recipe/photo registry files and IDs are unchanged.

## Private publication

URL: https://tasteit-kitchen-preview.bhuyainria.chatgpt.site

- Native Site source: `cfe80cec0e24880ecc9d731483f6842a009202e5`.
- Saved version: `appgprj_6adc6cb976148191a4ef448ca836c1c9~appgver_6f2f1ff7cd288191951e93eff8ecbd9f`.
- Successful deployment: `appgdep_6ae04c1178748191a5017e6302ba7d3a`.
- Archive SHA-256: `3cb4557956855865f32ac00789f4cb075013299cb97a68b94a72f66dc699cf90`.
- All 57 prepared source assets plus provenance match the native Worker. Archive Worker, Site identity, DB/r2 and all three migration files match. Anonymous sync remains 401.
- Audience confirmed after publication: one owner, no groups or external visitors. PR #1 remains draft and unmerged.
- All 29 checked live release paths and tested application provenance match (live checker exit 0).

## Rulings made

1. Continued the established native implementation/private publication workflow under the user's next-release approval. Cost if wrong: the user may prefer a different release scope.
2. Retained the clean feature checkout and existing draft PR for isolation from main. Cost if wrong: unrelated future work would need separating.
3. Kept legacy dates as Dinner and added colon keys for other slots; export v2/import v1. Cost if wrong: older app versions cannot read new v2 backups; the updated app keeps v1 import.
4. Limited time/yield enrichment to three verified recipes; collected quantities remain unknown. Cost if wrong: more manual source review is needed before dependable time/quantity filters.
5. Retained 172 credited photos and improved conservative matching/CPU work. Cost if wrong: 6,577 ingredient rows retain explicit reference gaps.
6. Physical-device alarms, screen readers, actual magnification and field metrics remain unverified. Users receive explicit limits; device-specific issues still require hands-on acceptance.

Deferred minors: none.

## Verification limits

Managed interactive preview could not launch the retained Worker checkout without a dev/static configuration; no workaround server was installed. Actual Worker CI exercises browser journeys. No owner-signed-in hosted walkthrough, physical Android/iPhone background/alarm test, screen-reader conformance, physical browser magnification or field-performance claim is made. Timers use wall clock and do not promise closed-browser/background notifications. Source scores are dated publisher snapshots, not an objective worldwide ranking.
