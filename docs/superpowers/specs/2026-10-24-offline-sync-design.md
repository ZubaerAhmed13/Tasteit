# Offline access, optional sync and mobile reliability

The user requested completion of the next audit stage after personal discovery.
The original stage 4 covers offline access, synchronisation and mobile polish.
Continue in the dedicated feature clone; keep PR #1 draft and unmerged. Update the
same private testing Site after verification, preserving its owner access policy.

## Approach and boundaries

Keep the browser app dependency-free and local-first. Add a bounded app-shell
service worker and optional snapshot synchronisation using the existing Site's
ChatGPT identity and a D1 binding. This avoids another account/provider setup.
An opaque merge engine risks inventory and journal corruption; use versioned,
atomic snapshots with explicit conflict choices. JSON backup compatibility and
existing record IDs remain unchanged. Build-only tools may bundle the Worker and
generate schema migrations; no framework replaces the browser app.

## Offline behavior

- After one successful online load, cache the application shell and same-origin
  static modules. Saved detailed recipes, pantry, planner, cooking progress and
  local edits remain available offline. Do not promise offline photographs or a
  downloaded worldwide catalogue; images and remote recipes need a connection.
- Navigation is network-first. Only a confirmed Tasteit HTML shell may enter the
  cache. Never cache API calls, sign-in/callback pages, cross-origin responses,
  redirects or unsuccessful responses. A reachable login/denial response must win
  over cached content; clear the cached shell on an authentication response.
- Show an unobtrusive offline/reconnecting status. Offline Discover filters saved
  recipe details locally and explains that source results are unavailable.
- Provide a web manifest, explicit offline readiness, and update notification that
  applies a waiting worker only after the user's Reload choice. Keep browser data.
- At phone widths, form text is at least 16px, primary interactive targets at
  least 44px and navigation respects safe-area space. Verify no horizontal scroll.

## Optional cloud synchronisation

- Off by default. A clear Enable cloud sync control explains which browser data
  is uploaded: cookbook, cooking notes, kitchen batches, plans, leftovers and taste
  choices. No private records are uploaded merely by opening Tasteit.
- The hosted API derives the account ID only from Sites' authenticated identity
  header. Reject anonymous requests, cross-origin mutations, malformed snapshots,
  oversized bodies and invalid revision numbers. Keep private responses no-store.
- Store one versioned snapshot per account. Conditional writes use an atomic D1
  compare-and-swap; stale writes return 409. A deletion is a revisioned tombstone
  and removes cloud content without deleting any browser copy.
- After enable, reconcile on successful local saves, connection restoration,
  window focus and explicit Sync now. This operates while the app is open; no
  background-alarm or closed-browser synchronisation promise.
- Track the last common snapshot and revision separately from the v1 backup.
  Initial empty-browser/empty-cloud cases are straightforward; if both copies
  differ, or both changed since the common version, offer a clear conflict review.
  Show counts and a cloud update time, not raw JSON. Require explicit replacement.
- Never discard edits made during an in-flight request or conflict review. Never
  upload an old account's local copy automatically after identity changes. Pause
  and ask the person to reconnect/review through product controls.
- Local storage failure preserves working data. Network/auth failures retain local
  edits and explain the pending state. Sync-off retains both copies. A separate
  confirmed Remove cloud copy action retains local data and turns sync off.

## Verification and publication

Pure and event-owner tests cover offline filtering, failed writes, account changes,
conflicts, concurrent edits and retry recovery. API tests use real SQLite to verify
the production SQL, per-account isolation, revision races, deletion, body bounds,
identity and origin checks. Browser acceptance covers reload while offline, local
edits, reconnect, sync conflicts and mobile controls in Chromium/Firefox/WebKit.

Bundle the existing static assets and Worker API without credentials or private
browser records. Generate and inspect schema-only migrations. The same Site moves
from static hosting to a Worker with D1; keep its project ID and private audience.
Run one independent review before final publication. Authenticated hosted and
physical-device checks remain distinct from simulated identities and headless QA.
