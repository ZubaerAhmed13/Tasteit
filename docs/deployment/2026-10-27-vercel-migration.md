# Tasteit — private Vercel migration

27 October 2026. The complete Tasteit application is deployed privately to Vercel. Hosting verification is complete; email delivery/redirect configuration is explicitly unverified. The original owner-private Site v13 remains unchanged and available. PR1 stays draft and unmerged.

## Deployment

- Canonical: https://tasteit-zeta.vercel.app
- Team alias: https://tasteit-bhuyainria-7304.vercel.app
- Generated: https://tasteit-l9wn76own-bhuyainria-7304.vercel.app
- Branch alias: https://tasteit-git-feat-recipe-kitchen-foundation-bhuyainria-7304.vercel.app
- Deployment: `dpl_Aj3XFWd5cKhi7zyEZA8gUjt43goh`, returned READY, production. The native API returned production for this first deployment despite a preview target request; all deployments remain authenticated.
- Source: `c696e0b3ec96989cc5a523e6e684f6121d803e4d`, repository ZubaerAhmed13/Tasteit, feature branch; no merge.
- Asset digest: `298fc20f5120c191fa1e9c5dc4ff8bbbe512a093cedb12c11a6e62c726e6b43d`.
- Vercel project: `prj_34N5Eu8WwM9IkGnPE8coJXdyWZkj`, team `team_4VtWGFD5vMH5UwLvIRKK3syR`, ssoProtection enabled/all. Anonymous root, static-data and auth endpoint checks on all four addresses deny access. Temporary test share access is kept out of source and user links.
- Dedicated Supabase: `kddgvhmnaflnkasgnivu`, Frankfurt/eu-central-1, Primary account. Other projects untouched. Email confirmation enabled; anonymous sign-in disabled. No service-role key is used. Two server-only environment variables are sensitive in Vercel. Provisioning did not request a cost-confirmation form; no paid upgrade was requested.

## Preserved functionality and data

The same applicationAssets exporter supplies all 58 frontend assets plus provenance. Catalogue1,108 / rated1,100; breakfasts146 / rated143; ingredient references172. Existing recipe IDs, genuine publisher scores, credited photographs and explicit photo gaps are unchanged. Full meal slots, portions, preparation/timers, atomic shopping/purchases, local recovery, backups and offline reopening remain. The original Worker build still passes.

Vercel adds a conditional email/password account panel and HTTP-only Secure SameSite=Lax server cookies. Verified getUser identity replaces the Sites-only trusted header at this host. Caller headers/body IDs never select accounts. Postgres RLS isolates reads; direct writes are denied; a private guarded CAS function and authenticated wrapper retain revisions and deletion tombstones. Login does not enable sync. Sign-out stops pending sync immediately, even if the remote account request fails, and retains the local kitchen. No credentials or session tokens enter browser localStorage.

Browser records belong to their origin. To move an existing kitchen, export a backup at the original Site, open the canonical Vercel address and review/import it. No cloud identities are guessed or automatically mapped. The original Site is the rollback path.

## Verification

- `npm run verify`:302/302, zero failures. Both hosting builds pass. Production dependency audit:0 known vulnerabilities.
- CI: https://github.com/ZubaerAhmed13/Tasteit/actions/runs/40570844930 — all jobs pass:302 Node tests and29 browser-suite executions (9 Chromium,11 Firefox,9 WebKit). Detailed logs inspected. CI commit `bdb6a3e18f128c35d4421eef4e207e5801503935` differs from deployed source only in a browser test; application/server/data/build sources are identical. The test now opens the filter disclosure by user click and waits for visibility before retaining its keyboard-focus assertion; its previous WebKit failure was at immediate scripted disclosure/focus.
- Real Supabase probes passed two-user sign-in, secure cookies, account isolation, spoof denial, concurrent200/409 writes, delete tombstones, stale-write rejection and revoked-session rejection. No emails sent.
- One fresh final review (gpt-6-astra/high). Both Important findings reproduced RED and fixed GREEN: repeated connection notifications clearing account fields, and in-flight cloud downloads during sign-out. Regression uses the actual controller and actual sync engine with held GET/PUT and successful/failed auth responses. No second review.
- All58 live assets and provenance match the exact candidate; private cache headers and inaccessible server/configuration files are verified. The deployed real sign-in/cookie/isolation/spoof/wrong-origin/CAS/tombstone/revoked-session probes passed, exit0. The mismatched account guard returns409 as specified. Both temporary QA accounts, snapshots and sessions were removed (all remaining counts0); temporary share access was revoked.
- The live probe initially expected403 for a mismatched body account, but the documented account-change contract correctly returns409. The probe was corrected; no product change.
- Native Auth advisor flags optional leaked-password protection as disabled. Email confirmation stays enabled and the app requires12–128-character passwords; no paid plan or auth-policy weakening was introduced.

## Remaining owner setup

The Supabase connector exposes no Auth URL configuration mutation. In https://supabase.com/dashboard/project/kddgvhmnaflnkasgnivu/auth/url-configuration set **Site URL** to `https://tasteit-zeta.vercel.app` and allow redirect `https://tasteit-zeta.vercel.app/api/auth`. Keep email confirmation enabled. Use the canonical address for account creation and return to it to sign in. Other aliases require their own exact callback allow-list entries if used for signup. Email delivery and an owner confirmation roundtrip have not been tested. Browser dashboard fallback requires user approval because the plugin cannot perform this operation.

## Decisions and review limits

1. Continue the authorized native implementation/private hosting — full migration requested and workspace consent completed; cost if scope differs: revise migration.
2. Use a dedicated Supabase project because native Marketplace provisioning is unavailable — cost: maintain a second service.
3. Preserve old origin and use reviewed backup/import — ownership/origin boundaries cannot be guessed; cost: deliberate transfer action.
4. Skill task helper resources were unavailable — equivalent brief/base/commit/test bookkeeping recorded directly; cost: no helper automation.
5. Keep email confirmation enabled and disclose external setup — cost: confirmation may require a manual return until configured.
6. Verify live protection, aliases/provenance separately from read-only review — cost: withhold acceptance if probes fail.
7. Physical-device/field performance remain unclaimed — cost: later real-device validation.

Deferred minor: invalid/expired confirmation callbacks return to the normal sign-in panel without a specific outcome message. The ordinary sign-in/error controls remain. RLS initplan performance advisory is negligible for the current indexed single-account read; it does not change isolation. Physical-device alarms, actual screen-reader conformance, field metrics and external-photo uptime remain outside automated coverage.

Spec: `docs/superpowers/specs/2026-10-27-vercel-hosting-design.md`; plan: `docs/superpowers/plans/2026-10-27-vercel-hosting.md`.
