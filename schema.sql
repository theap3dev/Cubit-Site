create table if not exists public.games (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    title text not null check (char_length(title) between 1 and 80),
    visibility text not null default 'private' check (visibility in ('private', 'public')),
    world_data jsonb not null check (
        jsonb_typeof(world_data) = 'object'
        and octet_length(world_data::text) <= 1048576
    ),
    created_at timestamptz not null default now()
);

create index if not exists games_owner_created_at_idx
    on public.games (owner_id, created_at desc);

alter table public.games enable row level security;

grant select on public.games to anon, authenticated;
grant insert, update, delete on public.games to authenticated;

drop policy if exists games_read_public_or_owner on public.games;
create policy games_read_public_or_owner
    on public.games for select
    using (visibility = 'public' or owner_id = (select auth.uid()));

drop policy if exists games_insert_own on public.games;
create policy games_insert_own
    on public.games for insert to authenticated
    with check (owner_id = (select auth.uid()));

drop policy if exists games_update_own on public.games;
create policy games_update_own
    on public.games for update to authenticated
    using (owner_id = (select auth.uid()))
    with check (owner_id = (select auth.uid()));

drop policy if exists games_delete_own on public.games;
create policy games_delete_own
    on public.games for delete to authenticated
    using (owner_id = (select auth.uid()));