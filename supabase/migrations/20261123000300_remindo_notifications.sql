begin;

alter table public.todos add column reminder_since timestamptz not null default now();
alter table public.notifications
  add column reminder_offset smallint,
  add column reminder_deadline timestamptz,
  add constraint notifications_reminder_fields check (
    (kind = 'reminder' and reminder_offset is not null and reminder_offset in (0, 60, 1440) and reminder_deadline is not null)
    or (kind <> 'reminder' and reminder_offset is null and reminder_deadline is null)
  ) not valid;

create unique index notifications_reminder_once_idx
  on public.notifications (todo_id, user_id, reminder_deadline, reminder_offset)
  where kind = 'reminder';

create or replace function remindo_private.touch_todo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.deadline_at is distinct from old.deadline_at or new.user_id is distinct from old.user_id then
    new.reminder_since := now();
  end if;
  return new;
end;
$$;

create function remindo_private.notify_todo_change()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  assigned boolean := tg_op = 'INSERT';
begin
  if tg_op = 'UPDATE' then
    assigned := new.user_id is distinct from old.user_id;
    if not assigned and
      row(new.title, new.description, new.category, new.priority, new.status, new.starts_at, new.deadline_at)
      is not distinct from
      row(old.title, old.description, old.category, old.priority, old.status, old.starts_at, old.deadline_at) then
      return new;
    end if;
  end if;

  if assigned and not exists (
    select 1 from public.profiles where id = new.user_id and is_active for share
  ) then
    raise exception 'The assignee must be active' using errcode = '23514';
  end if;

  if remindo_private.active_role() = 'admin' and new.user_id <> (select auth.uid()) then
    insert into public.notifications (user_id, todo_id, kind, title, message)
    select new.user_id, new.id,
      (case when assigned then 'assigned' else 'updated' end)::public.notification_kind,
      case when assigned then 'Remindo: tugas baru' else 'Remindo: tugas diperbarui' end,
      case when assigned then 'Admin menugaskan: ' else 'Admin memperbarui: ' end || new.title
    where exists (select 1 from public.profiles where id = new.user_id and is_active);
  end if;
  return new;
end;
$$;

create trigger remindo_todo_notification
after insert or update on public.todos
for each row execute function remindo_private.notify_todo_change();

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

create table public.push_deliveries (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  notification_id uuid not null references public.notifications(id) on delete cascade,
  available_at timestamptz not null default now(),
  attempts smallint not null default 0,
  unique (notification_id, subscription_id)
);

create index push_deliveries_ready_idx on public.push_deliveries (available_at, id);
create index push_deliveries_subscription_idx on public.push_deliveries (subscription_id);

alter table public.push_subscriptions enable row level security;
alter table public.push_deliveries enable row level security;
revoke all on public.push_subscriptions, public.push_deliveries from public, anon, authenticated;
grant all on public.push_subscriptions, public.push_deliveries to service_role;

create function remindo_private.queue_push()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.push_deliveries (subscription_id, notification_id)
  select id, new.id from public.push_subscriptions where user_id = new.user_id;
  return new;
end;
$$;

create trigger remindo_queue_push
after insert on public.notifications
for each row execute function remindo_private.queue_push();

create function public.remindo_generate_reminders()
returns integer
language sql
set search_path = ''
as $$
  with candidates as (
    select t.id, t.user_id, t.title, t.deadline_at, offsets.minutes
    from public.todos t
    join public.profiles p on p.id = t.user_id and p.is_active
    join public.reminder_settings s on s.user_id = t.user_id
    cross join lateral (values
      (1440, s.one_day_before), (60, s.one_hour_before), (0, s.at_deadline)
    ) as offsets(minutes, enabled)
    where t.status <> 'selesai' and offsets.enabled
      and t.deadline_at between now() - interval '1 day' and now() + interval '1 day'
      and t.deadline_at - make_interval(mins => offsets.minutes)
        between greatest(t.reminder_since, now() - interval '1 day') and now()
    for share of t, p, s
  ), created as (
    insert into public.notifications (user_id, todo_id, kind, title, message, reminder_offset, reminder_deadline)
    select user_id, id, 'reminder', 'Remindo: pengingat tugas',
      case minutes
        when 1440 then 'Pengingat 1 hari sebelum deadline: '
        when 60 then 'Pengingat 1 jam sebelum deadline: '
        else 'Deadline tiba: '
      end || title, minutes, deadline_at
    from candidates
    on conflict (todo_id, user_id, reminder_deadline, reminder_offset) where kind = 'reminder' do nothing
    returning id
  )
  select count(*)::integer from created;
$$;

create function public.remindo_claim_push()
returns table (id uuid, subscription_id uuid, endpoint text, p256dh text, auth_key text, notification_id uuid, kind public.notification_kind, attempts smallint)
language plpgsql
set search_path = ''
as $$
begin
  delete from public.push_deliveries d using public.notifications n
  where d.notification_id = n.id and
    (n.created_at < now() - interval '1 day' or (d.attempts >= 5 and d.available_at <= now()));

  return query
  with ready as (
    select d.id, s.endpoint, s.p256dh, s.auth_key, n.kind
    from public.push_deliveries d
    join public.push_subscriptions s on s.id = d.subscription_id
    join public.notifications n on n.id = d.notification_id and n.user_id = s.user_id
    join public.profiles p on p.id = s.user_id and p.is_active
    left join public.todos t on t.id = n.todo_id
    left join public.reminder_settings r on r.user_id = s.user_id
    where d.available_at <= now() and d.attempts < 5
      and (n.kind <> 'reminder' or (
        t.status <> 'selesai' and t.user_id = s.user_id and t.deadline_at = n.reminder_deadline
        and case n.reminder_offset
          when 1440 then r.one_day_before when 60 then r.one_hour_before when 0 then r.at_deadline else false
        end
      ))
    order by d.available_at, d.id
    limit 30
    for update of d skip locked
  )
  update public.push_deliveries d
  set attempts = d.attempts + 1, available_at = now() + interval '2 minutes'
  from ready where ready.id = d.id
  returning d.id, d.subscription_id, ready.endpoint, ready.p256dh, ready.auth_key, d.notification_id, ready.kind, d.attempts;
end;
$$;

revoke execute on function remindo_private.notify_todo_change(), remindo_private.queue_push() from public, anon, authenticated;
revoke execute on function public.remindo_generate_reminders(), public.remindo_claim_push() from public, anon, authenticated;
grant execute on function public.remindo_generate_reminders(), public.remindo_claim_push() to service_role;

commit;
