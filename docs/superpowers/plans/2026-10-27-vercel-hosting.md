# Private Vercel Hosting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Host the full current Tasteit privately on Vercel with verified auth and durable isolated sync.
**Architecture:** Preserve applicationAssets; add Node request adapter, server-only Supabase cookie session, RLS/CAS repository and capability-detected account panel. Original Worker stays compatible.
**Tech Stack:** Vanilla JS, Node24, pinned @supabase/ssr0.12.7 + @supabase/supabase-js2.118.0, Postgres, existing Node/Playwright CI.
**Spec:** docs/superpowers/specs/2026-10-27-vercel-hosting-design.md

## Global Constraints

- Existing Site v13/data untouched; PR1 draft and unmerged; no new recipes or redesign.
- Vercel All Deployments protection, exact project/team IDs in spec, database dedicated Frankfurt project.
- HTTP-only Secure SameSite=Lax server cookies, no client tokens/service keys, verified getUser identity.
- Existing 2MB snapshots, parser, revision guards, tombstones, opt-in sync and browser recovery remain.

## Review Focus

- Caller identity headers and body IDs cannot select another account (Task1).
- Token refresh and errors retain secure cookie/cache headers; revoked sessions cannot read data (Task1).
- Concurrent updates/deletion against real Postgres have one success/one conflict and cannot resurrect stale copies (Task1).
- Late auth rendering preserves forms; signing out disconnects sync and leaves local records (Task2).
- New host boundaries preserve offline imports and all existing Worker/browser contracts (Task3).

### Task 1: Verified server auth and transactional snapshots
**Files:** server/supabase-client.js, server/vercel-sync.js, server/vercel-auth.js, server/vercel-http.js, api/auth.js, api/sync.js, server/sync-api.js, package.json/package-lock.json, supabase/schema.sql, tests/vercel-api.test.js.
**Interfaces:** createSession(request,env)->{client,finish(Response)}; handleVercelAuth(request,dependencies)->Response; handleVercelSync(request,dependencies)->Response; nodeHandler(handler)->Node handler. Existing boundedJson exported.
- [x] Add tests for forged/absent/unconfirmed identity, same-origin/content type/body/account validation, cookies/no-store and getUser errors; run to observe RED.
- [x] Implement pinned SDK cookie/session and Node transport, snapshot handlers retaining backup validation. Provision schema through execute_sql; direct writes denied, select RLS and private CAS RPC authenticated only.
- [x] Run targeted/full Node tests and real DB role/CAS probes; expected all pass. Commit.

### Task 2: Account UI and migration continuity
**Files:** src/host-auth.js, src/app.js, styles.css, sw.js, tests/host-auth.test.js, tests/vercel-browser.mjs.
**Interfaces:** createHostAuth({fetch,onState})->{state,refresh,submit}; accountMarkup(state)->HTML. Capability absent preserves old host UI; on sign-out explicitly disconnect cloud sync.
- [x] Add RED tests for account request/timeout/unknown capability, generic errors and no client token storage; browser account sign-in/out + local records/sync consent.
- [x] Implement conditional account form, same-origin fetch, meaningful status/focus and no automatic sync enable. Add new module to offline assets.
- [x] Run full Node and new/browser CI; expected all pass. Commit.

### Task 3: Vercel package and full verification
**Files:** scripts/build-vercel.mjs, vercel.json, .gitignore, .github/workflows/verify.yml, tests/vercel-build.test.js.
**Interfaces:** build exports identical frontend asset bytes/provenance into dist/vercel, Vercel functions remain server-only; both builds work.
- [x] Add RED build/Node transport tests preserving modules/photos/provenance and excluding private/server source; wire Vercel browser suite into all three CI jobs.
- [x] Implement build config, pin lockfile/install and headers (private/no-cache, SW no-cache, noindex, nosniff). Configure server env through native encrypted tool values only.
- [x] Run npm run verify, both builds, full three-engine CI and live authenticated DB probes. Expected all pass. Commit.
- [x] One fresh final reviewer, one continuing Critical/Important RED→GREEN fix pass and full green suite. No re-review.
- [x] Deploy exact tested commit to protected staging/production, verify protected aliases and assets/provenance; document actual auth/confirmation limits and any required user setup. Keep old Site and draft PR. Commit evidence and remove only this plan workspace after completion.
