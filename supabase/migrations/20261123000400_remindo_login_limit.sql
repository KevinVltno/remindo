begin;

create table remindo_private.login_limits (
  account_key text primary key check (account_key ~ '^[a-f0-9]{64}$'),
  attempts jsonb not null default '[]',
  locked_until timestamptz,
  updated_at timestamptz not null default clock_timestamp()
);

create index login_limits_updated_at_idx on remindo_private.login_limits (updated_at);
revoke all on remindo_private.login_limits from public, anon, authenticated;

create function public.remindo_reserve_login(p_account_key text, p_attempt_id uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  state remindo_private.login_limits%rowtype;
  checked_at timestamptz;
begin
  insert into remindo_private.login_limits (account_key)
  values (p_account_key) on conflict do nothing;

  select * into strict state
  from remindo_private.login_limits
  where account_key = p_account_key
  for update;

  checked_at := clock_timestamp();
  if state.locked_until > checked_at then
    return jsonb_build_object('allowed', false, 'locked_until', state.locked_until);
  end if;

  if state.locked_until is not null then state.attempts := '[]'; end if;
  select coalesce(jsonb_agg(attempt), '[]'::jsonb) into state.attempts
  from jsonb_array_elements(state.attempts) as attempt
  where (attempt ->> 'at')::timestamptz > checked_at - interval '15 minutes';

  state.attempts := state.attempts || jsonb_build_array(jsonb_build_object('id', p_attempt_id, 'at', checked_at));
  state.locked_until := case when jsonb_array_length(state.attempts) >= 5
    then checked_at + interval '30 minutes' end;

  update remindo_private.login_limits
  set attempts = state.attempts, locked_until = state.locked_until, updated_at = checked_at
  where account_key = p_account_key;

  return jsonb_build_object('allowed', true, 'locked_until', state.locked_until);
end;
$$;

create function public.remindo_finish_login(p_account_key text, p_attempt_id uuid, p_success boolean)
returns void
language sql security definer
set search_path = ''
as $$
  update remindo_private.login_limits l
  set attempts = case when p_success then '[]'::jsonb else (
        select coalesce(jsonb_agg(attempt), '[]'::jsonb)
        from jsonb_array_elements(l.attempts) as attempt
        where attempt ->> 'id' <> p_attempt_id::text
      ) end,
      locked_until = null,
      updated_at = clock_timestamp()
  where account_key = p_account_key and l.attempts @> jsonb_build_array(jsonb_build_object('id', p_attempt_id));
$$;

revoke execute on function public.remindo_reserve_login(text, uuid), public.remindo_finish_login(text, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.remindo_reserve_login(text, uuid), public.remindo_finish_login(text, uuid, boolean)
  to service_role;

commit;
