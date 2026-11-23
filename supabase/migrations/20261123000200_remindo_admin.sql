begin;

create function public.remindo_admin_stats()
returns jsonb
language sql stable
set search_path = ''
as $$
  with per_user as (
    select p.id, p.display_name, count(t.id) as total,
      count(t.id) filter (where t.status = 'selesai') as completed,
      count(t.id) filter (where t.status <> 'selesai' and t.deadline_at < now()) as overdue
    from public.profiles p
    left join public.todos t on t.user_id = p.id
    where (select remindo_private.active_role()) = 'admin'
    group by p.id, p.display_name
  )
  select case when (select remindo_private.active_role()) = 'admin' then jsonb_build_object(
    'total', coalesce(sum(total), 0), 'completed', coalesce(sum(completed), 0),
    'overdue', coalesce(sum(overdue), 0),
    'users', coalesce(jsonb_agg(to_jsonb(per_user) order by display_name, id), '[]'::jsonb)
  ) end
  from per_user;
$$;

create function public.remindo_admin_users()
returns table (id uuid, display_name text, email text, role public.app_role, is_active boolean)
language sql stable security definer
set search_path = ''
as $$
  select p.id, p.display_name, u.email::text, p.role, p.is_active
  from public.profiles p join auth.users u on u.id = p.id
  where (select remindo_private.active_role()) = 'admin';
$$;

revoke execute on function public.remindo_admin_stats(), public.remindo_admin_users() from public, anon, authenticated;
grant execute on function public.remindo_admin_stats(), public.remindo_admin_users() to authenticated;

commit;
