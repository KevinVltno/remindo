select cron.schedule(
  'remindo-reminders',
  '* * * * *',
  $job$
    select public.remindo_generate_reminders();
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'remindo_worker_url'),
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'remindo_cron_secret')
      ),
      timeout_milliseconds := 55000
    )
    where exists (select 1 from public.push_deliveries where available_at <= now());
  $job$
);

select cron.schedule(
  'remindo-login-limit-cleanup',
  '17 3 * * *',
  $$ delete from remindo_private.login_limits where updated_at < now() - interval '1 day'; $$
);
