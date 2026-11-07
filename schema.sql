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
alter table public.profiles add column if not exists hat_upload_enabled boolean not null default false;

grant select on public.profiles to anon, authenticated;
revoke insert, update on public.profiles from authenticated;
grant update (username, avatar_url) on public.profiles to authenticated;

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

create table if not exists public.hats (
    id uuid primary key default gen_random_uuid(),
    uploader_id uuid not null references auth.users(id) on delete cascade,
    name text not null check (char_length(name) between 1 and 80),
    model_path text not null unique,
    model_url text not null,
    created_at timestamptz not null default now()
);

create index if not exists hats_uploader_created_at_idx
    on public.hats (uploader_id, created_at desc);

alter table public.hats enable row level security;

grant select on public.hats to anon, authenticated;
grant insert, delete on public.hats to authenticated;

drop policy if exists hats_public_read on public.hats;
create policy hats_public_read
    on public.hats for select
    using (true);

drop policy if exists hats_enabled_insert_own on public.hats;
create policy hats_enabled_insert_own
    on public.hats for insert to authenticated
    with check (
        uploader_id = (select auth.uid())
        and exists (
            select 1 from public.profiles
            where profiles.id = (select auth.uid())
                and profiles.hat_upload_enabled
        )
    );

drop policy if exists hats_enabled_delete_own on public.hats;
create policy hats_enabled_delete_own
    on public.hats for delete to authenticated
    using (
        uploader_id = (select auth.uid())
        and exists (
            select 1 from public.profiles
            where profiles.id = (select auth.uid())
                and profiles.hat_upload_enabled
        )
    );

create table if not exists public.faces (
    id uuid primary key default gen_random_uuid(),
    uploader_id uuid not null references auth.users(id) on delete cascade,
    name text not null check (char_length(name) between 1 and 80),
    image_path text not null unique,
    image_url text not null,
    created_at timestamptz not null default now()
);

create index if not exists faces_created_at_idx
    on public.faces (created_at desc);

alter table public.faces enable row level security;

grant select on public.faces to anon, authenticated;
grant insert, delete on public.faces to authenticated;

drop policy if exists faces_public_read on public.faces;
create policy faces_public_read
    on public.faces for select
    using (true);

drop policy if exists faces_enabled_insert_own on public.faces;
create policy faces_enabled_insert_own
    on public.faces for insert to authenticated
    with check (
        uploader_id = (select auth.uid())
        and exists (
            select 1 from public.profiles
            where profiles.id = (select auth.uid())
                and profiles.hat_upload_enabled
        )
    );

drop policy if exists faces_enabled_delete_own on public.faces;
create policy faces_enabled_delete_own
    on public.faces for delete to authenticated
    using (
        uploader_id = (select auth.uid())
        and exists (
            select 1 from public.profiles
            where profiles.id = (select auth.uid())
                and profiles.hat_upload_enabled
        )
    );

create table if not exists public.user_faces (
    user_id uuid not null references auth.users(id) on delete cascade,
    face_id uuid not null references public.faces(id) on delete cascade,
    acquired_at timestamptz not null default now(),
    primary key (user_id, face_id)
);

create index if not exists user_faces_face_id_idx
    on public.user_faces (face_id);

alter table public.user_faces enable row level security;

grant select, insert on public.user_faces to authenticated;

drop policy if exists user_faces_select_own on public.user_faces;
create policy user_faces_select_own
    on public.user_faces for select to authenticated
    using (user_id = (select auth.uid()));

drop policy if exists user_faces_insert_own on public.user_faces;
create policy user_faces_insert_own
    on public.user_faces for insert to authenticated
    with check (user_id = (select auth.uid()));

create table if not exists public.user_hats (
    user_id uuid not null references auth.users(id) on delete cascade,
    hat_id uuid not null references public.hats(id) on delete cascade,
    acquired_at timestamptz not null default now(),
    primary key (user_id, hat_id)
);

create index if not exists user_hats_hat_id_idx
    on public.user_hats (hat_id);

alter table public.user_hats enable row level security;

grant select, insert on public.user_hats to authenticated;

drop policy if exists user_hats_select_own on public.user_hats;
create policy user_hats_select_own
    on public.user_hats for select to authenticated
    using (user_id = (select auth.uid()));

drop policy if exists user_hats_insert_own on public.user_hats;
create policy user_hats_insert_own
    on public.user_hats for insert to authenticated
    with check (user_id = (select auth.uid()));

alter table public.profiles
    add column if not exists avatar_colors jsonb not null default '{"head":"#f3f1ef","torso":"#d7ddee","leftArm":"#eef2ff","rightArm":"#eef2ff","leftLeg":"#c7d1ef","rightLeg":"#c7d1ef"}'::jsonb
        check (
            jsonb_typeof(avatar_colors) = 'object'
            and avatar_colors->>'head' ~ '^#[0-9a-fA-F]{6}$'
            and avatar_colors->>'torso' ~ '^#[0-9a-fA-F]{6}$'
            and avatar_colors->>'leftArm' ~ '^#[0-9a-fA-F]{6}$'
            and avatar_colors->>'rightArm' ~ '^#[0-9a-fA-F]{6}$'
            and avatar_colors->>'leftLeg' ~ '^#[0-9a-fA-F]{6}$'
            and avatar_colors->>'rightLeg' ~ '^#[0-9a-fA-F]{6}$'
        ),
    add column if not exists worn_hat_id uuid references public.hats(id) on delete set null,
    add column if not exists worn_face_id uuid references public.faces(id) on delete set null;

grant update (avatar_colors, worn_hat_id, worn_face_id) on public.profiles to authenticated;

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
    on public.profiles for update to authenticated
    using (id = (select auth.uid()))
    with check (
        id = (select auth.uid())
        and (
            worn_hat_id is null
            or exists (
                select 1 from public.user_hats
                where user_hats.user_id = (select auth.uid())
                    and user_hats.hat_id = profiles.worn_hat_id
            )
        )
        and (
            worn_face_id is null
            or exists (
                select 1 from public.user_faces
                where user_faces.user_id = (select auth.uid())
                    and user_faces.face_id = profiles.worn_face_id
            )
        )
    );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
    insert into public.profiles (id, username, hat_upload_enabled)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
        coalesce(lower(new.email), '') in ('pedrorandow@gmail.com', 'ap3ytube@gmail.com')
    )
    on conflict (id) do update set
        username = excluded.username,
        hat_upload_enabled = public.profiles.hat_upload_enabled or excluded.hat_upload_enabled,
        created_at = public.profiles.created_at;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert or update of raw_user_meta_data on auth.users
    for each row
    execute function public.handle_new_user();

insert into public.profiles (id, username, hat_upload_enabled)
select
    id,
    coalesce(raw_user_meta_data->>'username', split_part(email, '@', 1)),
    coalesce(lower(email), '') in ('pedrorandow@gmail.com', 'ap3ytube@gmail.com')
from auth.users
on conflict (id) do update set
    username = excluded.username,
    hat_upload_enabled = public.profiles.hat_upload_enabled or excluded.hat_upload_enabled;

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

create table if not exists public.recently_played (
    user_id uuid not null references auth.users(id) on delete cascade,
    game_id uuid not null references public.games(id) on delete cascade,
    last_played_at timestamptz not null default now(),
    primary key (user_id, game_id)
);

create index if not exists recently_played_user_last_played_idx
    on public.recently_played (user_id, last_played_at desc);

alter table public.recently_played enable row level security;

grant select, insert, update on public.recently_played to authenticated;

drop policy if exists recently_played_select_own on public.recently_played;
create policy recently_played_select_own
    on public.recently_played for select to authenticated
    using (user_id = (select auth.uid()));

drop policy if exists recently_played_insert_own on public.recently_played;
create policy recently_played_insert_own
    on public.recently_played for insert to authenticated
    with check (user_id = (select auth.uid()));

drop policy if exists recently_played_update_own on public.recently_played;
create policy recently_played_update_own
    on public.recently_played for update to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'hats',
    'hats',
    true,
    10485760,
    array['model/gltf-binary', 'application/octet-stream']
)
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists hats_public_file_read on storage.objects;
create policy hats_public_file_read
    on storage.objects for select
    using (bucket_id = 'hats');

drop policy if exists hats_enabled_file_insert on storage.objects;
create policy hats_enabled_file_insert
    on storage.objects for insert to authenticated
    with check (
        bucket_id = 'hats'
        and (storage.foldername(name))[1] = (select auth.uid())::text
        and exists (
            select 1 from public.profiles
            where profiles.id = (select auth.uid())
                and profiles.hat_upload_enabled
        )
    );

drop policy if exists hats_enabled_file_delete on storage.objects;
create policy hats_enabled_file_delete
    on storage.objects for delete to authenticated
    using (
        bucket_id = 'hats'
        and (storage.foldername(name))[1] = (select auth.uid())::text
        and exists (
            select 1 from public.profiles
            where profiles.id = (select auth.uid())
                and profiles.hat_upload_enabled
        )
    );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'faces',
    'faces',
    true,
    2097152,
    array['image/png']
)
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists faces_public_file_read on storage.objects;
create policy faces_public_file_read
    on storage.objects for select
    using (bucket_id = 'faces');

drop policy if exists faces_enabled_file_insert on storage.objects;
create policy faces_enabled_file_insert
    on storage.objects for insert to authenticated
    with check (
        bucket_id = 'faces'
        and (storage.foldername(name))[1] = (select auth.uid())::text
        and exists (
            select 1 from public.profiles
            where profiles.id = (select auth.uid())
                and profiles.hat_upload_enabled
        )
    );

drop policy if exists faces_enabled_file_delete on storage.objects;
create policy faces_enabled_file_delete
    on storage.objects for delete to authenticated
    using (
        bucket_id = 'faces'
        and (storage.foldername(name))[1] = (select auth.uid())::text
        and exists (
            select 1 from public.profiles
            where profiles.id = (select auth.uid())
                and profiles.hat_upload_enabled
        )
    );