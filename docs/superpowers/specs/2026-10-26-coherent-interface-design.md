# Tasteit Release 2 — One coherent interface

The user approved the next release of the existing three-release research roadmap.
Deliver its main acceptance journey: search for a collected breakfast in the main
app, save it, find it on home, reopen it, return to the same results and plan it.
Keep usual/want-to-try shelves on home, now after a useful search entry point.

## Approach and constraints

Builder's call: extend the existing vanilla-JS main controller and saved-recipe
adapter. The default search combines approved publisher metadata with the user's
saved recipes. The existing TheMealDB discovery remains an explicitly selectable
source scope, avoiding an external outage delaying the approved catalogue and
honouring the user's source restrictions. A full framework rewrite adds migration
risk; automatically querying all providers obscures the approved-source boundary.
Keep the advanced source-audit page compatible and link its recipes to the same
main detail view. Reuse a small presentation module for ratings/source identity.

Main navigation becomes Home, Saved, Kitchen, Plan. Research/coverage remains
available in a More tools disclosure. Search leads home, followed by meal shortcuts
and compact personal shelves, then results. Mobile filters use an accessible native
disclosure; desktop retains visible filters. Source/course/rating/sort and page are
validated URL state alongside existing cuisine/category/letter links. Unsubmitted
drafts remain separate. Paging, opening and closing recipes preserve the committed
identity and return focus. Recipe photos/titles consistently open internal details.

Publisher rating/count/source are visible on compact cards and full detail, distinct
from personal cooking ratings and absent provider ratings. Credits remain beside
ingredient photos, with readable captions, a full-image link and fixed-size failure
fallbacks. Preserve all 1,108 recipes/IDs, approved-source restrictions, v1 backups,
recovery guards, pantry/shopping/planning/cooking features and opt-in sync boundaries.
No runtime dependency, schema migration, new recipe collection or release-3 work.
Same owner-private Site; PR1 draft and unmerged.

Acceptance covers empty and large cookbooks, ingredient/name search, source/course
filters, no duplicates, stale requests, failures/offline saved fallback, invalid
URLs, paging/reload/Back, keyboard/375px/zoomed layout, publisher ratings/credits and
full search-save-home-open-plan journey. Run full Node/build and three-engine CI;
one fresh final review, exact-source packaging/private publication/live parity.
