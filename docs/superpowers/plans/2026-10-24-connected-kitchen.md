# Connected Kitchen Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task by task.

**Goal:** Connect reviewed purchases and actual cooking usage with pantry batches and leftovers.
**Architecture:** Pure kitchen-flow helpers prepare atomic store changes; small forms
extend existing planner, journal and kitchen screens. Optional version-1 state fields.
**Tech Stack:** JavaScript modules, Node tests and Playwright fixture acceptance.
**Spec:** docs/superpowers/specs/2026-10-24-connected-kitchen-design.md

## Global Constraints
- Draft PR only; no merge, deployment, product dependencies or backend.
- Preserve original source content, existing IDs and version-1 backup compatibility.
- Checking shopping or logging cooking alone does not modify pantry quantities.

## Review Focus
- Repeated submission cannot double-add purchases or double-deduct cooking quantities.
- A concurrent inventory change must invalidate stale deduction/review amounts.
- Unknown or incompatible units need user entry and never get silently converted.
- Zero remaining stock remains a recorded batch but is excluded from recipe matching.
- Invalid leftover dates or failed storage leave the entire cooking journal unchanged.

## Task 1: Validated kitchen operations and backup state
**Files:** src/kitchen-flow.js, src/model.js, tests/kitchen-flow.test.js.
**Interfaces:** purchaseFingerprint(row), purchaseReview(checklist,stocked),
receivePurchases(store,review,selections,receiptId), consumptionReview(meal,pantry,base,target),
applyConsumption(pantry,deductions), addLeftover(records,input), validKitchenState(stocked,leftovers).
- [ ] Write/run failing tests for purchases, duplicate/stale rows and consumption.
- [ ] Implement pure helpers and strict optional backup fields; test old/new restore.
- [ ] Run the full Node suite and commit the independently testable model changes.

## Task 2: Reviewed shopping and cooking UI
**Files:** src/app.js, styles.css, tests/kitchen-browser.mjs, .github/workflows/verify.yml,
package.json, README.md, docs/ACCEPTANCE.md and browser test source allowlist.
**Interfaces:** Task 1 helpers prepare state persisted before assignment; the UI
holds review snapshots until success or cancellation and never persists drafts.
- [ ] Add failing browser acceptance for transfer, duplicate prevention, deduction,
  leftover persistence, blocked storage and mobile layout.
- [ ] Add forms and leftover controls to existing screens, preserving other flows.
- [ ] Run Node/browser verification, update docs and commit.

## Task 3: Independent review and draft CI
- [ ] Review this stage's diff independently, fix material findings with regressions.
- [ ] Publish to the same draft branch, verify CI and report device/live-source limits.
