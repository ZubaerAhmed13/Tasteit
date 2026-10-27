# Tasteit Release 3 — Everyday cooking and measured quality

Continue the approved three-release roadmap in the existing app, private Site and draft PR. The user's “Go ahead with the next release” authorizes implementation and private publication, retaining the established native execution method. No extra discovery/approval loop is needed.

## Approach

Extend the vanilla-JS store and controllers. Dinner retains the legacy date key; Breakfast, Lunch and Snack use date:slot keys. This preserves all existing date-only plans as Dinner without guessing meal types. New exports use backup version 2; version 1 imports remain supported. Cloud validation accepts both historical and new representations through the shared parser; account, revision, recovery and atomic-write rules remain. A nested replacement schema would churn every existing consumer; a second independent planner risks divergence. Builder's call: additive keys, no database migration or new runtime dependency.

## Deliverables

- Four explicitly labelled meal slots per day, independent servings, previous/next week controls, recipe-detail day/slot selection and direct opening of planned recipes. Shopping and reviewed purchases cover all coming-week slots. Offscreen plans are retained.
- Source time/yield metadata for a bounded verified sample from approved publishers, exact original yield text, source/check date, explicit unknown values elsewhere. Publisher ingredients remain intact; collected quantities remain unknown rather than automatically parsing ambiguous source lines. User-confirmed serving references remain separate.
- Preparation assistance for publisher recipes: ingredient check-off and a manual timer with persistent resume; original method link remains prominent. No copied publisher directions or fabricated steps. Clock-based countdown survives close/reopen; browser/device alarm limitations stay visible.
- Reuse soon-dated pantry suggestions with a clear route from Home to matching approved/saved discovery; preserve usual/wanted shelves.
- Profile ingredient matching on the real 1,108-recipe catalogue. Cache immutable-registry reference results when measurements justify it; improve only demonstrably equivalent food/form descriptors, keep all credits and explicit missing photos. No generated reference photos. Measure before/after with identical results checked. Do not migrate to IndexedDB without evidence.

## Acceptance and limits

Breakfast and Dinner coexist on one date through reload, backup and sync. Replacing one slot clears only its servings. Invalid dates/slots and malformed backups fail safely. Shopping sums repeated recipes per slot; purchase/stock/journal writes remain atomic and stale reviews fail. Unknown quantities never become confirmed/scaled amounts. Timer and preparation checks resume on reopen without claiming background notifications. Preserve 1,108 recipe IDs/ratings and photo rights. All Node checks, Worker build, three-engine browser acceptance and one fresh final review must pass before private publication. Publish exact tested source and verify live provenance; leave PR1 draft and unmerged.

Physical phones, screen readers, real browser magnification and field performance cannot be certified by headless CI. Report these limits honestly. No new recipe collection, third-party analytics, sharing change, source expansion or storage migration.
