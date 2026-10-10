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

alter table public.games add column if not exists thumbnail_url text;

create index if not exists games_owner_created_at_idx
    on public.games (owner_id, created_at desc);

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    username text not null unique,
    avatar_url text,
    created_at timestamptz not null default now()
);

create index if not exists profiles_username_idx
    on public.profiles (username);

alter table public.profiles enable row level security;

grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;

drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all
    on public.profiles for select
    using (true);

drop policy if exists profiles_manage_own on public.profiles;
create policy profiles_manage_own
    on public.profiles for insert to authenticated
    with check (id = (select auth.uid()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
    on public.profiles for update to authenticated
    using (id = (select auth.uid()))
    with check (id = (select auth.uid()));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
    insert into public.profiles (id, username)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
    )
    on conflict (id) do update set
        username = excluded.username,
        created_at = public.profiles.created_at;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert or update of raw_user_meta_data on auth.users
    for each row
    execute function public.handle_new_user();

insert into public.profiles (id, username)
select id, coalesce(raw_user_meta_data->>'username', split_part(email, '@', 1))
from auth.users
on conflict (id) do update set
    username = excluded.username;

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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'game-thumbnails',
    'game-thumbnails',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists game_thumbnails_public_read on storage.objects;
create policy game_thumbnails_public_read
    on storage.objects for select
    using (bucket_id = 'game-thumbnails');

drop policy if exists game_thumbnails_owner_insert on storage.objects;
create policy game_thumbnails_owner_insert
    on storage.objects for insert to authenticated
    with check (
        bucket_id = 'game-thumbnails'
        and exists (
            select 1 from public.games
            where games.id::text = (storage.foldername(name))[1]
                and games.owner_id = (select auth.uid())
        )
    );

drop policy if exists game_thumbnails_owner_update on storage.objects;
create policy game_thumbnails_owner_update
    on storage.objects for update to authenticated
    using (
        bucket_id = 'game-thumbnails'
        and exists (
            select 1 from public.games
            where games.id::text = (storage.foldername(name))[1]
                and games.owner_id = (select auth.uid())
        )
    )
    with check (
        bucket_id = 'game-thumbnails'
        and exists (
            select 1 from public.games
            where games.id::text = (storage.foldername(name))[1]
                and games.owner_id = (select auth.uid())
        )
    );

drop policy if exists game_thumbnails_owner_delete on storage.objects;
create policy game_thumbnails_owner_delete
    on storage.objects for delete to authenticated
    using (
        bucket_id = 'game-thumbnails'
        and exists (
            select 1 from public.games
            where games.id::text = (storage.foldername(name))[1]
                and games.owner_id = (select auth.uid())
        )
    );