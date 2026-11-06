# Tasteit — private Vercel hosting

User request: host the existing complete Tasteit on Vercel without compromising it. Workspace access was approved and verified. Continue native execution and private publication, keeping PR1 draft/unmerged and existing Site v13 available. This is a host migration, not a redesign or recipe expansion.

## Chosen approach

Preserve the vanilla-JS frontend, catalogue, IDs, genuine scores, ingredient-photo rights, backup v2/v1 import, recovery, offline and cooking features. Export the same applicationAssets into dist/vercel with provenance and a new service-worker asset digest. Vercel Node functions implement /api/auth and /api/sync. The original Cloudflare Worker/D1 remains valid and available; its trusted header must never be trusted on Vercel.

A dedicated Supabase project supplies verified authentication and durable Postgres. Its native provisioning was available; Vercel Marketplace provisioning was not exposed by the connected tools. Use current pinned supabase-js/ssr libraries and HTTP-only secure SameSite=Lax cookies through server-only clients. GET auth reports capability/session; POST sign-in/sign-up/sign-out validates same-origin JSON, bounded input and generic errors. Email confirmation stays enabled. Callback exchanges PKCE code and redirects only to the same app. Never return access/refresh tokens or service keys to client JavaScript. No provider credentials are persisted in source, logs or local files.

Alternative: static-only hosting loses sync; forwarding caller identity headers or a Site bypass token weakens the trust boundary. Both are rejected. Rewriting the frontend/framework adds unrelated change and is unnecessary.

Sync obtains user ID through Supabase getUser, rejects anonymous/unconfirmed users, validates the existing backup shape and 2MB request boundary, and compares body accountId with verified identity. RLS SELECT isolates accounts. Direct snapshot INSERT/UPDATE/DELETE is denied; a narrowly scoped private SECURITY DEFINER function with explicit auth.uid checks performs compare-and-swap and tombstones, exposed through an authenticated SECURITY INVOKER wrapper. No service key is needed by the app. User-editable metadata never grants authorization.

## Product changes

The existing offline/cloud-sync panel gains a small account form only when /api/auth advertises the Vercel capability. Email/password sign-in and account creation use server cookies; confirmation and errors are accessible. Signing out disconnects optional sync and retains local data. Login does not enable sync automatically. Old Site builds show their existing flow when the endpoint is unavailable. Existing cloud conflict/account-change logic remains intact.

Vercel project prj_34N5Eu8WwM9IkGnPE8coJXdyWZkj in team_4VtWGFD5vMH5UwLvIRKK3syR has All Deployments authentication enabled. Supabase project kddgvhmnaflnkasgnivu in Primary/CareerOS AI is dedicated to Tasteit, region eu-central-1. No unrelated resource is reused. Current localStorage and cloud data are not copied or mapped by guess across origins; retain reviewed backup/import and the old Site.

## Release gates

All Node tests, both host builds, original three-engine journeys, added Vercel account/transport journeys, real database auth/RLS/CAS probes, one fresh final review, and exact live-source verification. Check anonymous/spoofed identity/wrong-origin/cross-account access, cookie attributes and no-store headers, expired/revoked sessions, concurrent writes, deletion resurrection, duplicate purchases and corrupt/local storage. Full recipes/photos/cooking remain available. Verify production/generated URLs remain protected. Keep secrets out of artifacts and client code. Do not claim physical-device or field-performance coverage.

Native tools cannot change Supabase email redirect configuration. If that cannot be finished through available authorized capabilities, complete the implementation and protected staging checks first, then present the exact remaining setup step honestly. Never claim email confirmation was verified if it was not.
