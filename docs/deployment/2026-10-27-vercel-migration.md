# Tasteit Vercel migration — implementation in progress

27 October 2026. User request: host Tasteit on Vercel without compromising it.
Vercel workspace authorization completed. Dedicated Vercel project `prj_34N5Eu8WwM9IkGnPE8coJXdyWZkj` (`tasteit`) has been created with Vercel Authentication enabled for all deployments. No application deployment has been released yet.
The existing owner-private Site version 13 and its database remain unchanged.
PR #1 remains draft and unmerged.

## Verified source and prepared files

Application: Release 3, tested source `d09079dd26f7e388f0af7595ff8490c28653741c`.
Current repository `d17091f8e23310d6e39d5d72b2307abc2c8ea2ec` adds documentation only.
The original release passed 281 Node tests and 26 three-engine browser executions.
Fresh preparation verification: `npm run verify` passed all 281 tests with zero failures.

The existing `applicationAssets()` build exports the complete 57 frontend assets,
including the 1,108-recipe catalogue, 172 credited ingredient-photo references,
new meal planner, cooking sessions and offline service-worker modules. Prepared
frontend candidate files are checked byte-for-byte against that exporter. Server
code, environment variables, development documents and private browser records
are excluded. This is a frontend candidate, not a deployable full application.

## Workspace authorization resolved

The connected Vercel user can list projects. No Tasteit project exists in the
returned project list. Its selected default workspace is
`team_4VtWGFD5vMH5UwLvIRKK3syR`. Explicit workspace configuration and integration
requests initially returned HTTP 403, `forbidden`, with this recovery instruction:
`authorize_team_access`, then have the user open the single-use consent link,
then retry the same request on the existing connection.

The user completed the authorization, and the original explicit-workspace requests now succeed. Do not omit the workspace, switch accounts, change
sharing, use another credential, or publish an incomplete frontend. The consent
link is temporary and must not be committed to the repository.

## Preserve the existing capabilities

1. Create/use a dedicated Tasteit Vercel project in the authorized workspace.
   Apply Vercel Authentication with `ssoProtection.deploymentType: "all"` before
   deploying application content. Verify every production and generated URL is
   protected. Preserve owner-only access; disable public source/directory listing.
2. Provision a dedicated compatible database and verified application sign-in
   through an available authorized integration. Check the actual plan/cost first;
   no paid upgrade or unrelated project reuse is authorized by this preparation.
3. Port `/api/sync` to the new runtime while retaining the shared backup parser,
   2 MB request limit, same-origin write checks, revision compare-and-swap,
   deletion tombstones, no-store responses and account isolation. A persistent
   transactional backend is required; runtime filesystem or in-memory state is
   not a replacement.
4. Obtain account identity from a verified server-side session. The original
   `oai-authenticated-user-id` header is trusted only behind Sites dispatch.
   Vercel must not trust a caller-supplied copy of that header. Deployment
   protection alone does not supply an application account identity. Keep all
   provider secrets server-side. Do not forward a Site bypass token as user auth.
5. Browser localStorage belongs to its origin. Existing cookbooks, pantry, plans
   and timers cannot silently appear on a new hostname. Preserve the original
   origin and support a reviewed existing backup export/import. Any cloud-copy
   migration must verify identity ownership before transferring records; never
   guess an account mapping or overwrite either copy automatically.
6. Retain the UI, source boundaries, genuine ratings, photo credits, every recipe
   ID, recovery checkpoints, offline access and opt-in sync. Never publish with
   sync silently removed or nonfunctional. Keep the current Site available as
   the rollback path until the full new-host journey passes.

## Required acceptance before release

- Full Node suite, Vercel build and the existing three-engine journeys pass.
- Verify recipe catalogue, all ingredient references/credits, meal slots/portions,
  shopping, atomic stock updates, preparation/timers, backup/recovery and offline
  reopening against the actual Vercel build.
- Authenticated sync roundtrip and reconnect/conflict pass; anonymous, spoofed
  identity, wrong-origin and wrong-account requests fail without data access.
- Competing writes produce one success and one conflict; stale deletion cannot
  resurrect a cloud snapshot. Denied/full browser storage does not erase records.
- Verify protected deployment, production alias and static-data URLs; sign-out
  and expired-session behavior must not leak cached private pages.
- Compare live assets/provenance with the exact tested source. Record the URL,
  deployment ID, environment, commit, protection, database and verification limits.
- Keep PR #1 draft/unmerged until the user explicitly authorizes a merge.

## Primary references

- https://vercel.com/docs/deployment-protection
- https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication
- https://vercel.com/docs/functions
- https://vercel.com/docs/storage

Vercel's current docs state that All Deployments protection covers production
and generated deployment domains and is available on all plans. This must still
be confirmed against the actual project's returned configuration after access.

Dedicated Supabase backend: `kddgvhmnaflnkasgnivu` (Tasteit, Frankfurt), in the existing Primary account. Provisioning succeeded without a cost-confirmation request. Existing unrelated projects were not modified.
