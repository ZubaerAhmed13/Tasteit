# Tasteit release 1: trust and continuity

The user approved the first release from the UI/UX/reliability research. Implement
safer local recovery, independently loaded optional collection data, saved publisher
offline discovery, full selected-page URL/history continuity, and readable contrast.
Continue inline execution and private publication; PR1 remains draft and unmerged.

Preserve every recipe record/ID, source restriction, original-method links, existing
local version-1 data/backups and opt-in account boundaries. No runtime dependency,
database migration, new recipe collection or release-2 redesign.

Local data: ordinary writes must inspect the existing snapshot and refuse unreadable
or invalid records. Main UI displays a recovery screen rather than an empty cookbook;
selected-page saves direct the user there. Successful writes maintain a validated
last-good version-1 checkpoint, best effort when storage is full: checkpoint failure
must not misreport a successful primary save or destroy an older checkpoint.
Explicit restore validates the chosen backup, compares the exact reviewed damaged
bytes, preserves the most recent unreadable copy under a separate recovery key, then
replaces the primary record. A preservation/write failure cannot erase the original.
Offer download of unreadable/preserved data, last-good restore and normal backup
import. Unavailable storage has retry guidance. No silent reset or auto cloud restore.

Collection: catalogue results render independently of optional photo/curation loads.
All requests including body parsing have a 12-second deadline and explicit retry;
optional failures do not replace drafts/focus or reset filters. Existing photo credits
and world100 behavior remain. Saved valid collected metadata is eligible for offline
search despite its intentionally external cooking method.

Continuity: query, source, course, sort, rated state, collection and page round-trip
through validated URLs. Submitted filters and pagination create history entries;
saves/late metadata keep the committed route. Reload and Back restore page and
filters; leaving for a recipe and returning restores result position/focus. Ignore
invalid values and clamp pages. Keep the existing unsubmitted-draft protection.

Contrast: correct declared normal-text/background pairs to >=4.5:1 while preserving
the existing identity. Larger visual/navigation redesign belongs to release 2.
Acceptance combines focused regressions, full Node/build, actual three-engine
recovery/loading/offline/history checks, a fresh final review, and exact-source
owner-private publication with live asset/provenance verification.
