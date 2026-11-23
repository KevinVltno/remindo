begin;

create type public.app_role as enum ('user', 'admin');
create type public.todo_priority as enum ('rendah', 'sedang', 'tinggi');
create type public.todo_status as enum ('pending', 'progress', 'selesai');
create type public.notification_kind as enum ('reminder', 'assigned', 'updated');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  role public.app_role not null default 'user',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 150),
  description text not null default '' check (char_length(description) <= 5000),
  category text not null default 'Umum' check (char_length(btrim(category)) between 1 and 80),
  priority public.todo_priority not null default 'sedang',
  status public.todo_status not null default 'pending',
  starts_at timestamptz not null,
  deadline_at timestamptz not null check (deadline_at >= starts_at),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  todo_id uuid references public.todos(id) on delete set null,
  kind public.notification_kind not null,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.reminder_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  one_day_before boolean not null default true,
  one_hour_before boolean not null default true,
  at_deadline boolean not null default true
);

create index todos_user_deadline_idx on public.todos (user_id, deadline_at);
create index todos_open_deadline_idx on public.todos (deadline_at) where status <> 'selesai';
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where not is_read;
create index notifications_todo_idx on public.notifications (todo_id) where todo_id is not null;

create schema if not exists remindo_private;
revoke all on schema remindo_private from public;
grant usage on schema remindo_private to authenticated;

create function remindo_private.active_role()
returns public.app_role
language sql stable security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid()) and is_active;
$$;

create function remindo_private.create_profile()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(left(btrim(new.raw_user_meta_data ->> 'display_name'), 80), ''), 'Pengguna Remindo'));
  insert into public.reminder_settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger remindo_create_profile
after insert on auth.users
for each row execute function remindo_private.create_profile();

insert into public.profiles (id, display_name)
select id, coalesce(nullif(left(btrim(raw_user_meta_data ->> 'display_name'), 80), ''), 'Pengguna Remindo')
from auth.users on conflict (id) do nothing;

insert into public.reminder_settings (user_id)
select id from public.profiles on conflict (user_id) do nothing;

create function remindo_private.touch_todo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger remindo_touch_todo
before update on public.todos
for each row execute function remindo_private.touch_todo();

revoke execute on all functions in schema remindo_private from public, anon, authenticated;
grant execute on function remindo_private.active_role() to authenticated;

alter table public.profiles enable row level security;
alter table public.todos enable row level security;
alter table public.notifications enable row level security;
alter table public.reminder_settings enable row level security;

revoke all on public.profiles, public.todos, public.notifications, public.reminder_settings from public, anon, authenticated;
grant select on public.profiles, public.todos, public.notifications, public.reminder_settings to authenticated;
grant update (role, is_active) on public.profiles to authenticated;
grant insert (user_id, title, description, category, priority, status, starts_at, deadline_at),
  update (user_id, title, description, category, priority, status, starts_at, deadline_at),
  delete on public.todos to authenticated;
grant update (is_read) on public.notifications to authenticated;
grant update (one_day_before, one_hour_before, at_deadline) on public.reminder_settings to authenticated;
grant all on public.profiles, public.todos, public.notifications, public.reminder_settings to service_role;

create policy profiles_read on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select remindo_private.active_role()) = 'admin');

create policy profiles_admin_update on public.profiles for update to authenticated
using (id <> (select auth.uid()) and (select remindo_private.active_role()) = 'admin')
with check (id <> (select auth.uid()) and (select remindo_private.active_role()) = 'admin');

create policy todos_access on public.todos for all to authenticated
using ((select remindo_private.active_role()) = 'admin'
  or ((select remindo_private.active_role()) = 'user' and user_id = (select auth.uid())))
with check ((select remindo_private.active_role()) = 'admin'
  or ((select remindo_private.active_role()) = 'user' and user_id = (select auth.uid())));

create policy notifications_read on public.notifications for select to authenticated
using ((select remindo_private.active_role()) = 'admin'
  or ((select remindo_private.active_role()) = 'user' and user_id = (select auth.uid())));

create policy notifications_mark_read on public.notifications for update to authenticated
using ((select remindo_private.active_role()) = 'admin'
  or ((select remindo_private.active_role()) = 'user' and user_id = (select auth.uid())));

create policy reminder_settings_read on public.reminder_settings for select to authenticated
using ((select remindo_private.active_role()) = 'admin'
  or ((select remindo_private.active_role()) = 'user' and user_id = (select auth.uid())));

create policy reminder_settings_update on public.reminder_settings for update to authenticated
using ((select remindo_private.active_role()) = 'admin'
  or ((select remindo_private.active_role()) = 'user' and user_id = (select auth.uid())));

commit;
