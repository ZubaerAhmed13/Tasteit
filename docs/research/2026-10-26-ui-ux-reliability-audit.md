# Tasteit: interface, reliability and experience research

Research date: 26 October 2026. Scope: improvement recommendations, not implementation.
Live baseline: private Site version 10; application source `72de55d4969a7fec56df275acd8c8fbd2a24d6ca`.
Repository baseline: `b3ecb86e09b33846a95fdcac580d4f52b286c5d8` (documentation follow-up only).

## Main recommendation

Make Tasteit one consistent workspace for finding, saving, planning and cooking.
The approved-source collection is now substantial, but its separate entry point,
filter state and recipe presentation create friction. Prioritise data recovery and
predictable offline/loading behavior, then unify discovery and refine the visual
hierarchy. Preserve the warm cream/forest-green identity, approved publishers,
recipe IDs, existing personal records and opt-in private sync.

## Method and limits

Reviewed the published application's HTML, CSS, data adapters, discovery, selected
collection, storage, sync, offline and planning code. Ran controlled Node probes
against actual exported functions and the actual selected-page controller in the
same VM style as its existing tests. These probes used temporary in-memory state;
no personal browser records were changed. Calculated contrast from declared CSS
colours using WCAG relative luminance.

The live browser reached the private Site gate and then the OpenAI login page.
This browser had no signed-in owner session. No signed-in visual/mobile walkthrough,
physical-device test, screen-reader conformance audit or real-user speed measurement
is claimed. Visual recommendations below are grounded in markup/CSS and interaction
structure; composition still needs a signed-in desktop/phone review. Version 10's
existing release evidence includes 230 Node tests and three-engine acceptance;
those remain a foundation, rather than proof that every user journey is covered.

Benchmarks were official Paprika, Samsung Food, Kitchen Stories and Sorted Sidekick
pages. These are interaction references; they do not expand the approved recipe
source list. Accessibility/performance recommendations use W3C, web.dev and MDN.

## Confirmed findings and proposed changes

| Priority | Finding and evidence | User effect | Proposed change |
|---|---|---|---|
| High | `loadStore()` in `src/model.js` catches damaged JSON and returns `emptyStore()` without a recovery state. A controlled corrupt snapshot returned zero saved recipes and no recovery flag. Strict sync reads already reject damaged data. | A damaged local cookbook can appear newly empty. A later normal write could replace the unreadable snapshot. No actual user data loss was observed in this audit. | Preserve the original bytes, stop normal writes, show a recovery state, offer export/restore and retain a validated last-good snapshot. Keep the existing strict sync protection. |
| High | `boot()` in `src/selected-recipes-app.js` awaits catalogue, photo registry and optional curation in one `Promise.all`, without a request deadline. In a controlled run, catalogue results remained unavailable until the pending optional photo response resolved. | A stalled optional download can prevent all collection results from appearing. | Render validated catalogue data first; load photos/curation independently with bounded timeouts, local retry and visible partial availability. |
| High | `offlineRecipes()` requires `meal.strInstructions`; `collectedMeal()` deliberately leaves this empty because methods stay at the publisher. A valid saved Adai recipe returned zero offline discovery results. | Saved publisher recipes disappear from offline discovery, although their saved metadata can still be opened through the library/home lists. | Treat valid collected metadata as an eligible offline recipe. Show saved ingredients and notes; clearly identify that the original online method still needs a connection. Preserve access invalidation and account isolation. |
| High | Home search calls `discoverMeals()` in `src/api.js`, which searches TheMealDB. The 1,108 approved-source recipes live in a separate page/controller. | A recipe the user knows was added may not appear through the main search. | One search index across approved-source metadata and the user's cookbook. Keep additional provider results explicitly labelled/scoped and preserve original sources. |
| High | `syncCollectionUrl()` only commits the collection parameter; boot reads only that parameter. A controlled URL containing breakfast, query, sort and page still displayed all rated recipes on page 1. | Reload, bookmarks and returning from a recipe cannot reliably resume the selected breakfast/search/page state. | Encode and validate query, source, course, sort, rated state and page; restore scroll/focus on Back. Draft inputs remain separate until applied. |
| High | CSS muted text `#738078` on paper `#f8f7f3` computes to 3.85:1; on white, 4.13:1. Small source text `#929d94` on white is 2.81:1. White on coral is 3.43:1 where that button combination is used. | Small supporting text has insufficient contrast for the normal-text 4.5:1 target. | Adjust semantic text/button tokens and verify every actual text/background pair, hover, focus, disabled and error state. Keep decorative brand colours where they remain suitable. |
| Medium | Mobile navigation is five labels at 10px. The selected collection uses a different navigation shell. Home renders two personal shelves before its search hero, including for empty lists. | Dense navigation and competing entry points make the first action less obvious. | A shared shell with Home, Saved, Kitchen and Plan; world/cuisine browsing inside discovery; editorial research under an advanced area. Put search and meal shortcuts near the top while retaining Usual and Want to try on home. |
| Medium | Selected cards expose source, author, rating, category, multiple actions, checked date, caveats and ingredient details. A card's photo opens the external publisher, while its kitchen action opens internal details. | Browsing and understanding the primary action require extra effort. | Shared compact cards: photo/title open one internal detail view; keep rating/count/source visible and one clear save action. Put secondary facts in the detail view and retain a clearly labelled original-source link. |
| Medium | The current first rated page contains 24 recipes, 361 ingredient rows and 209 matched photo figures, all rendered into closed detail sections. Every render rebuilds these sections. The raw catalogue is about 1.49 MB before transport compression. | Extra DOM generation and matching work are performance risks on phones; these numbers are not measured latency or network-request counts. | Build ingredient details on first expansion, reuse stable components, cache reviewed matches, and split catalogue index/detail data if profiling justifies it. Profile before a larger storage/architecture migration. |
| Medium | Selected-card image failures remove the whole fixed-height photo link. All hero/card images are marked lazy, including the main hero image. | Late failures can change card height; lazy-loading a hero can delay important visible content. Actual CLS/LCP have not been measured. | Preserve an equal-size fallback; reserve image dimensions; prioritise the measured hero/LCP image and lazy-load below-the-fold content. Use supported original image sizes. |
| Medium | `planPage()` and backup validation support one recipe ID per date. | Breakfast and dinner cannot both be planned on the same day. | Add explicit Breakfast/Lunch/Dinner/Snack slots, flexible week navigation, copy-week/templates and accessible Move controls. Migrate existing date-only plans and keep old backups restorable before changing the UI. |
| Medium | Collected ingredient lines are preserved without parsed quantities; duration/yield fields are not retained in the current recipe record. | Reliable time filters, scaling and stock quantities are limited for the new catalogue. | Collect verified source times/yields and introduce reviewed quantity structure with explicit unknowns. Keep the source line intact and require review for ambiguous alternatives/units. |

## What to learn from the benchmarks

- **Paprika:** connected recipe, pantry, shopping and planning workflows; explicit meal types; reusable menus; keep-screen-on and timer controls. Tasteit can reuse its existing kitchen tools and improve continuity between them.
- **Samsung Food:** recipes move naturally into chosen plan days and shopping lists, with saved/reusable plans. The useful pattern is a clear next action from the recipe itself.
- **Kitchen Stories:** readable cooking mode and step-focused presentation. For Tasteit's linked publisher recipes, use ingredient/preparation assistance and original-method links; guided steps remain limited to content it can legitimately show.
- **Sorted Sidekick:** meals designed around shared ingredients and clear shopping organisation. Tasteit should explain use-soon suggestions and group compatible shopping requirements without guessing unknown quantities.
- **NN/g progressive disclosure:** defer secondary/advanced controls until the relevant task. Keep source/rating trust signals visible, while moving repetitive technical/editorial detail out of the main browsing flow.

## Proposed experience

**Home:** prominent unified search; Breakfast, Main dishes, Sweets and Snacks shortcuts;
compact Usual and Want to try shelves; continue-cooking only when a session exists;
use-soon suggestions with reasons. Empty shelves use one useful action and a short
explanation. Preserve those personal shelves even if discovery is unavailable.

**Discovery:** identical cards and navigation for the approved collection and saved
recipes; clear source scope; count plus active filter chips; mobile filters in a
compact panel; full filter/page URLs. Time/difficulty/diet options require verified
metadata before being exposed as dependable filters.

**Recipe:** photo, title, source, rating/count and save controls first; ingredients,
planning and notes in a clear hierarchy. Keep ingredient photos legible with original
creator/licence links, enlarge on tap, and distinguish unverified matches from failed
downloads. Display the full food/form reference rather than an ambiguous crop.

**Cooking:** large ingredient/step text, easy check-off, persistent timer controls,
resume state and an optional supported keep-screen-awake setting. Browser background
alarm behavior requires device testing and clear capability feedback. Publisher
methods remain at their original source unless separately authorised.

**Plan/shop:** multiple meal slots per day, reusable weeks, source-backed portions,
shopping organised by recipe/aisle, and reviewed transfer into pantry stock. Provide
button/menu alternatives to dragging. Preserve the existing atomic purchase and
cooking-history behavior.

## Three recommended releases

### Release 1 — Trust and continuity

Repair damaged-storage recovery, independently loading optional data, saved
publisher offline discovery, and selected-page URL restoration. Correct contrast
pairs and cover the exact failure paths with regressions. Keep IDs, backups and
account boundaries intact.

Acceptance: a pending photo request does not hold the catalogue; a saved publisher
recipe is discoverable offline; corrupt bytes are retained and not overwritten;
reload/Back restores breakfast/query/sort/page; normal text meets contrast targets.

### Release 2 — One coherent interface

Unify the catalogue with primary search, share navigation/cards/detail presentation,
reorder home around useful actions and personal shelves, simplify mobile filters,
make controls/readable captions consistent, and move editorial research out of the
main cooking path. Preserve photo attribution and source-rating distinctions.

Acceptance: find a newly added breakfast through main search, save it, open it from
home, return to the same results and add it to a plan without changing app contexts.
Verify both empty and large cookbooks and keyboard/zoomed layouts.

### Release 3 — Everyday cooking and measured quality

Add migrated multi-meal planning, reviewed time/yield/quantity metadata, better
use-soon/shopping continuity, cooking assistance, high-frequency ingredient-photo
coverage, and profiled performance improvements. Consider transactional IndexedDB
storage when measured record volume or synchronous work warrants that migration;
preserve compatibility and recovery throughout.

Acceptance: breakfast and dinner coexist on one date; checked purchases and cooking
stock updates remain atomic; timer/resume behavior is verified on real phones;
unknown quantities stay unknown; photo/network failures do not destabilise layout.

## Quality targets, not current measured results

- Core Web Vitals at the 75th percentile: LCP <=2.5 seconds, INP <=200 ms, CLS <=0.1.
  Use labelled controlled mobile tests first and field data when sufficient visits
  exist; do not present a fabricated Lighthouse or real-user score.
- WCAG 2.2 AA review: normal text >=4.5:1, keyboard/focus/dialog behavior, accessible
  errors and reflow at 320 CSS pixels/400% zoom. Aim for 44px main touch controls as
  a product comfort target; WCAG's AA minimum target-size criterion is 24px with
  specified exceptions, not a universal 44px rule.
- Failure-path tests: stalled optional data, corrupt/full/denied storage, concurrent
  tabs, reconnect, interrupted sync, expired authentication, unavailable images and
  app updates during an unsaved draft.
- Signed-in owner walkthrough on Android Chrome and iPhone Safari, including keyboard
  opening, portrait/landscape, offline reopen and cooking resume. Existing headless
  WebKit/Firefox checks are not physical-device acceptance.
- Track failures/timing without exporting cookbook contents or private identity data.
  Third-party analytics or broader sharing needs a separate deliberate choice.

## Sources

1. Paprika Android guide: https://www.paprikaapp.com/help/android/
2. Samsung Food meal planner: https://samsungfood.com/meal-planner/
3. Samsung Food planner guide: https://support.samsungfood.com/hc/en-us/articles/35369657798548-Getting-Started-with-Meal-Planner
4. Kitchen Stories app: https://pages.kitchenstories.com/en/app
5. Sorted Sidekick guide: https://help.sortedfood.com/hc/en-gb/articles/4638394094482-What-do-I-get-from-Sidekick
6. NN/g progressive disclosure: https://www.nngroup.com/articles/progressive-disclosure/
7. W3C contrast: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
8. W3C target size: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
9. W3C reflow: https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
10. W3C modal-dialog pattern: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
11. Core Web Vitals thresholds: https://web.dev/articles/defining-core-web-vitals-thresholds
12. Image loading: https://web.dev/articles/browser-level-image-lazy-loading
13. Browser storage: https://web.dev/articles/storage-for-the-web
14. Storage persistence: https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist
15. Screen Wake Lock: https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
