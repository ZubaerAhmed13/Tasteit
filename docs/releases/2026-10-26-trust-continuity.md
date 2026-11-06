# Tasteit Release 1 — Trust and continuity

Release implementation source: `42e5c301788627c64c19319d4a0590f4558a1a1c`.
Native Site source: `cc247190ea4955459596291c8a8074af0c7eeef9`.
Published as owner-private **version 11** at [Open Tasteit](https://tasteit-kitchen-preview.bhuyainria.chatgpt.site). PR1 remains draft and unmerged.

The release protects damaged local records, offers explicit last-good/backup
recovery and raw-data downloads, and refuses ordinary overwrites of unreadable
records. A successful primary save attempts to retain a validated recovery copy.

Approved-source recipes load independently of optional ingredient photographs and
world-favourites metadata, with bounded fetch/body deadlines and local retries.
Late photographs update their cells without replacing filter drafts or focus.
World-favourites requests wait for their membership metadata rather than silently
showing the whole catalogue.

Saved publisher recipes are discoverable offline using their saved metadata and
ingredients; original cooking methods remain at the publisher and need a connection.
Submitted query/source/course/sort/rating/collection/page state survives reload and
Back. Returning from a recipe restores its result focus. Declared secondary,
source, accent, ingredient-gap, saved-action and due-date text pairs meet 4.5:1.
This is not a complete accessibility conformance audit.

All 1,108 recipes and IDs, 1,100 publisher-rated records, 146 breakfasts (143 rated),
172 ingredient references, original-method links, version-1 backups and opt-in
account boundaries are unchanged. No runtime dependency or database migration.

## Verification

- Focused storage, deadline, offline, route/controller and contrast regressions
  were observed failing before their corresponding fixes and passing afterwards.
- `npm run verify`: 246/246 Node tests; syntax and Worker build pass.
- Detailed final CI logs inspected: six suites each in Chromium and WebKit, eight
  Firefox executions including three independent continuity sessions. All 20 PASS.
- [Final candidate CI](https://github.com/ZubaerAhmed13/Tasteit/actions/runs/40353743082)
  verifies the synthetic merge `b8b33de3eef5fd664d8aa1febaecefbc5898403e`, whose tree
  `aecdd12fabe0969a782770fe9734b3a44d9e8e6b` equals the release candidate's tree.
- The prepared native Worker matches all 50 source assets and source provenance;
  anonymous sync returns 401. The archive matches that Worker, Site identity,
  DB/r2 bindings and all three migration files. Archive SHA256:
  `43912dc318a5c41afc732325e2e5c954255f42a5ecc7d6ee56ebee5d9f180288`.
- Published version11 verified: all 21 checked live release paths and the
  application provenance match. Access remains one owner, no groups or external
  visitors. Saved native source is exactly the packaged commit.
- One fresh independent review found two Important issues: denied storage accessor
  handling and long submitted-query normalization. Both have RED→GREEN regressions
  and actual browser acceptance. Remaining saved-action/due-date contrast checks
  were added and corrected in the same fix pass. No Critical issues, no deferred
  minors and no behavior declined for judgment. No second reviewer was dispatched.

## Rulings I made

1. Continued the established inline feature checkout and private publication under
   the user's approval. No merge or release-2 redesign; broader UI work remains
   for the next release.
2. Kept checkpoint writes best effort after a successful primary save, so a full
   browser does not falsely report that committed save as failed. An older valid
   checkpoint remains; its recovery point may be older if storage is full.
3. Treated remaining 12px saved-action/due-date contrast as Important because those
   action/status labels affect core saved/expiry tasks. Darker text slightly
   changes their visual emphasis.

## Limits

Headless Chromium/Firefox/WebKit acceptance is distinct from physical-device,
screen-reader, owner-signed-in hosted walkthrough and real-user performance checks.
External publisher/ingredient image delivery can change. Ingredient-photo gaps and
existing source-rating/rights limits remain explicit. PR1 remains draft and unmerged.
