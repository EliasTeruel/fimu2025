-- MANUAL ACTIVATION, AFTER deployment + migration + Vault setup.
-- This file is NOT part of the schema migration and contains NO secret values.
-- Prerequisites: Supabase Cron (pg_cron), pg_net, Vault.
-- Vault names: fimu_reservas_base_url (https://your-production-domain)
--              fimu_reservas_cron_secret (same value as Vercel CRON_SECRET).
BEGIN;
DO $check$
DECLARE
  base_url TEXT;
  secret TEXT;
BEGIN
  SELECT decrypted_secret INTO base_url FROM vault.decrypted_secrets WHERE name = 'fimu_reservas_base_url';
  SELECT decrypted_secret INTO secret FROM vault.decrypted_secrets WHERE name = 'fimu_reservas_cron_secret';
  IF base_url IS NULL OR base_url !~ '^https://[^/]+/?$' OR secret IS NULL OR length(secret) < 32 THEN
    RAISE EXCEPTION 'Configura en Vault la URL HTTPS y el secreto de reservas antes de activar';
  END IF;
END;
$check$;

-- Same name replaces the prior schedule rather than creating duplicate jobs.
SELECT cron.schedule(
  'fimu-expirar-reservas',
  '* * * * *',
  $job$
    SELECT net.http_get(
      url := rtrim((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'fimu_reservas_base_url'), '/') || '/api/cron/reservas',
      headers := jsonb_build_object('Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'fimu_reservas_cron_secret')),
      timeout_milliseconds := 45000
    );
  $job$
);
COMMIT;

-- Disable without dropping any data (execute separately when needed):
-- SELECT cron.alter_job(jobid, active := false) FROM cron.job WHERE jobname = 'fimu-expirar-reservas';
-- Reactivate:
-- SELECT cron.alter_job(jobid, active := true) FROM cron.job WHERE jobname = 'fimu-expirar-reservas';
