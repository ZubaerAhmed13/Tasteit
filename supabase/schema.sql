-- Dedicated Tasteit project. Mutations are exposed only through guarded CAS.
create schema if not exists tasteit_private;
revoke all on schema tasteit_private from public, anon;
grant usage on schema tasteit_private to authenticated;
create table public.tasteit_sync (
 account_id uuid primary key references auth.users(id) on delete cascade,
 revision bigint not null check (revision between 1 and 9007199254740991),
 payload jsonb check (payload is null or jsonb_typeof(payload) = 'object'),
 updated_at timestamptz not null default clock_timestamp(),
 constraint snapshot_size check (payload is null or octet_length(payload::text) <= 2000000)
);
alter table public.tasteit_sync enable row level security;
revoke all on public.tasteit_sync from public, anon, authenticated;
grant select on public.tasteit_sync to authenticated;
create policy own_snapshots on public.tasteit_sync for select to authenticated
 using ((select auth.uid()) = account_id and (select auth.jwt()->>'is_anonymous') is distinct from 'true');

create function tasteit_private.write_snapshot(expected_revision bigint, snapshot jsonb)
returns table(revision bigint, updated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
 if actor is null or auth.jwt()->>'role' is distinct from 'authenticated' or auth.jwt()->>'is_anonymous' = 'true' then
  raise exception 'Authentication required' using errcode = '42501';
 end if;
 if expected_revision is null or expected_revision < 0 or expected_revision >= 9007199254740991 then
  raise exception 'Invalid revision' using errcode = '22023';
 end if;
 if snapshot is not null and (jsonb_typeof(snapshot) <> 'object' or octet_length(snapshot::text) > 2000000) then
  raise exception 'Invalid snapshot' using errcode = '22023';
 end if;
 return query
 insert into public.tasteit_sync as target(account_id, revision, payload, updated_at)
 select actor, 1, snapshot, clock_timestamp()
 where expected_revision = 0 or exists (select 1 from public.tasteit_sync as prior where prior.account_id = actor and prior.revision = expected_revision)
 on conflict(account_id) do update set revision = target.revision + 1, payload = excluded.payload, updated_at = excluded.updated_at
 where target.revision = expected_revision
 returning target.revision, target.updated_at;
end;
$$;
revoke all on function tasteit_private.write_snapshot(bigint,jsonb) from public, anon;
grant execute on function tasteit_private.write_snapshot(bigint,jsonb) to authenticated;

create function public.tasteit_write_snapshot(expected_revision bigint, snapshot jsonb)
returns table(revision bigint, updated_at timestamptz)
language sql security invoker set search_path = '' as $$
 select * from tasteit_private.write_snapshot(expected_revision, snapshot);
$$;
revoke all on function public.tasteit_write_snapshot(bigint,jsonb) from public, anon;
grant execute on function public.tasteit_write_snapshot(bigint,jsonb) to authenticated;
