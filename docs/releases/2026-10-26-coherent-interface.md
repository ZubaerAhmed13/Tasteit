# Tasteit Release 2 — One coherent interface

Verified application source: `65e7c0558d1d90d8a959461e0a4ef9cd561e95ce`.
Published as owner-private **version 12** at [Open Tasteit](https://tasteit-kitchen-preview.bhuyainria.chatgpt.site). All 266 Node tests and 23 browser-suite executions pass.
Native Site source: `a621ca409fc83a8b70da230be9b869695b4ea594`.

Search now leads Home and combines the approved publisher collection with the
user's cookbook. TheMealDB remains available through a clearly labelled additional
source scope. Meal shortcuts, Usual and Want to try shelves remain on Home, with
four main destinations: Home, Saved, Kitchen, Plan. Publisher audit/research tools
remain under More tools. Mobile filters use a native accessible disclosure.

Collected recipes appear in the same compact cards and internal detail view as
saved dishes. Publisher scores, vote/review counts and source identity remain
separate from personal cooking ratings. Photos and titles consistently open the
internal recipe view; original methods remain at publishers. Ingredient reference
captions are readable and credited, with larger-photo links and stable fallbacks.
Recipes can be added directly to the existing one-recipe-per-day plan. Replacing
a different planned recipe asks first; existing flags, notes and servings are
preserved, and a replaced recipe's portion preference is cleared.

Query/cuisine/source/course/rating/sort/page state survives saves, reload and Back.
Closing or returning from a recipe restores the originating result and scroll after
results render. Offline search applies the same supported filters to saved metadata
and ingredients. Source scope switches remove unsupported applied filters while
preserving unrelated drafts; late provider options cannot remove catalogue/saved
cuisines. Removing one course filter preserves the other search choices.

All 1,108 recipe IDs/records, 1,100 publisher-rated recipes, 146 breakfasts (143
rated), 172 ingredient references and source restrictions are unchanged. Ingredient
coverage remains 8,136/14,737 rows, with 6,601 explicit gaps. Existing v1 backups,
recovery guards, personal recipes, pantry, shopping, cooking history and opt-in
account boundaries remain. No runtime dependency or database migration.

## Verification

- Focused discovery, route, controller, planning and rating presentation tests
  were observed RED before implementation and GREEN after it.
- One fresh independent reviewer found four Important issues (offline filters,
  post-render result focus, late cuisine options and unsupported provider filters)
  and two findings initially labelled Minor (course-only removal and an ineffective
  zoom assertion). All were addressed in one fix pass with regressions; no Critical
  findings, deferred minors or behavior declined for judgment. No second review.
- Full `npm run verify`: 266 Node tests pass. Worker build and source parity pass:
  all 54 source assets plus provenance, and missing-identity sync401.
- [Final candidate CI40361696542](https://github.com/ZubaerAhmed13/Tasteit/actions/runs/40361696542) tests merge `8e86e6e7928f47e7b2d53f6bb5e558a77dc177f8`, whose tree `cb71664bc4c7630be2fd82b226bf09362366db4a` equals the candidate.
- Detailed final CI logs inspected: seven suites in Chromium and WebKit; nine
  Firefox executions including three independent continuity sessions. All 23 PASS.
- The archive preserves the exact prepared Worker, Site identity, DB/r2 bindings
  and all three migration files. Archive SHA256:
  `ab3b7cc16029029c7b85dd6a6d1928736a2e5702094ab719ad711f6eb2b9a435`.
- All 25 checked live release paths and tested application provenance match.
  Saved native source is the packaged commit. Post-publication access is one
  owner, zero groups and zero external visitors.
- Actual browser acceptance includes the collected breakfast search/save/home/open/
  plan journey, route paging/Back/focus/scroll, offline filtering/ingredient search,
  late provider options, source switches, 1,108 saved entries, source failure/retry,
  keyboard, 375px layout and 320CSSpx reflow with readable captions/controls.
- Existing provider suites explicitly select their source; their assertions remain.
  Native filter disclosure is opened before mobile controls are used. Offline UI
  filtering is tested through actual UI events; the existing continuity suite
  separately proves offline shell reload against a real network connection refusal.

## Rulings I made

1. Applied the user's next-release approval to the researched Release2 and existing
   inline/private publication workflow, without repeating design gates. Kept builder
   choices bounded to the current app and brand; the design stays familiar.
2. Made the default search the approved collection plus cookbook and kept TheMealDB
   explicit, protecting source boundaries and independent availability. Additional
   provider results require selecting that scope.
3. Treated course-only removal as Important: removing one chip must not silently
   change query/source/rating identity. Full reset remains a separate action.
4. Treated reflow verification as Important: the former root-font change did not
   enlarge fixed-pixel controls and overstated its evidence. Use 320CSSpx equivalent
   reflow with caption/control checks; physical browser magnification stays open.

## Limits

320CSSpx reflow is a layout check, not a physical-browser zoom or screen-reader
conformance audit. Physical devices, owner-signed-in hosted walkthrough, real-user
performance and external image uptime remain separate checks. The managed interactive
preview could not start the retained Worker-only checkout; headless three-engine
acceptance uses the actual prepared Worker instead. Publisher scores are dated
snapshots, not an objective worldwide ranking; public-release rights limits remain.
PR1 stays draft/unmerged; the Site remains owner-private.
