-- Maatklaar – beveiliging (security review 12-10-2026). Idempotent: mag vaker worden uitgevoerd.
-- Plak in Supabase → SQL Editor → Run. Vereist dat schema.sql, ondertekenen.sql, reviews.sql en analytics.sql al zijn uitgevoerd.
--
-- 1. Rate limiting voor anonieme schrijfacties (offerte delen, reviews, events) per IP (gehasht) en in totaal.
-- 2. Tekenlinks verlopen: niet getekend na 90 dagen, getekend na 365 dagen; daarna dagelijks gewist (pg_cron).
--    De aannemer houdt de getekende versie + handtekening lokaal in zijn project; de klant heeft de link dan niet meer nodig.
-- 3. Oude rate-limit-regels en analytics-events (> 400 dagen) worden ook opgeruimd.

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.settings (key text primary key, value text not null);
insert into private.settings (key, value) values ('rate_salt', encode(gen_random_bytes(16), 'hex')) on conflict (key) do nothing;

-- ——— 1. Rate limiting ————————————————————————————————————————————————
create table if not exists private.rate (
  bucket text not null,
  sleutel text not null,
  ts timestamptz not null default now()
);
create index if not exists rate_idx on private.rate (bucket, sleutel, ts);
create index if not exists rate_ts_idx on private.rate (ts);

-- Gehashte IP van de huidige API-aanvraag (PostgREST zet request.headers). Geen ruwe IP's opslaan.
create or replace function private.client_sleutel() returns text
language sql stable security definer set search_path = '' as $$
  select encode(extensions.digest(
    coalesce(
      nullif(split_part(coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', ''), ',', 1), ''),
      current_setting('request.headers', true)::json->>'cf-connecting-ip',
      'onbekend'
    ) || (select value from private.settings where key = 'rate_salt'), 'sha256'), 'hex');
$$;

-- true = toegestaan (en geteld); false = te vaak
create or replace function private.rate_ok(p_bucket text, p_per_ip int, p_ip_venster interval, p_totaal int, p_totaal_venster interval)
returns boolean language plpgsql security definer set search_path = '' as $$
declare k text := private.client_sleutel();
begin
  if (select count(*) from private.rate where bucket = p_bucket and sleutel = k and ts > now() - p_ip_venster) >= p_per_ip then return false; end if;
  if (select count(*) from private.rate where bucket = p_bucket and ts > now() - p_totaal_venster) >= p_totaal then return false; end if;
  insert into private.rate (bucket, sleutel) values (p_bucket, k);
  return true;
end $$;
revoke all on function private.client_sleutel() from public, anon, authenticated;
revoke all on function private.rate_ok(text, int, interval, int, interval) from public, anon, authenticated;

-- Reviews: max 3 per uur per IP, 100 per dag in totaal.
create or replace function private.reviews_limiet() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not private.rate_ok('review', 3, interval '1 hour', 100, interval '1 day') then
    raise exception 'te veel beoordelingen, probeer het later opnieuw' using errcode = '54000';
  end if;
  return new;
end $$;
drop trigger if exists reviews_limiet on public.reviews;
create trigger reviews_limiet before insert on public.reviews for each row execute function private.reviews_limiet();

-- Events: max 300 per uur per IP, 20.000 per dag in totaal (gewone bezoekers halen dit nooit).
create or replace function private.events_limiet() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not private.rate_ok('event', 300, interval '1 hour', 20000, interval '1 day') then
    return null; -- stil overslaan, de app merkt niets
  end if;
  return new;
end $$;
drop trigger if exists events_limiet on public.events;
create trigger events_limiet before insert on public.events for each row execute function private.events_limiet();

-- ——— 2. Tekenlinks: limiet + verlopen ————————————————————————————————
alter table public.offerte_signatures add column if not exists expires_at timestamptz not null default (now() + interval '90 days');
create index if not exists offerte_signatures_expires_idx on public.offerte_signatures (expires_at);

create or replace function public.offerte_delen(p_snapshot jsonb, p_site text default 'main')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t text; h text; nr text;
begin
  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' or length(p_snapshot::text) > 200000 then
    raise exception 'ongeldige offerte' using errcode = '22023';
  end if;
  -- max 20 per uur per IP en 500 per dag in totaal
  if not private.rate_ok('delen', 20, interval '1 hour', 500, interval '1 day') then
    raise exception 'te veel deellinks, probeer het later opnieuw' using errcode = '54000';
  end if;
  nr := left(coalesce(p_snapshot->>'nr', ''), 40);
  t := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  h := encode(sha256(convert_to(p_snapshot::text, 'UTF8')), 'hex');
  insert into public.offerte_signatures (token, site, offerte_nr, snapshot, snapshot_hash, expires_at)
    values (t, case when p_site = 'test' then 'test' else 'main' end, nr, p_snapshot, h, now() + interval '90 days');
  return jsonb_build_object('token', t, 'hash', h);
end $$;

create or replace function public.offerte_ophalen(p_token text)
returns jsonb language sql security definer set search_path = '' stable as $$
  select jsonb_build_object('snapshot', snapshot, 'hash', snapshot_hash, 'created_at', created_at,
                            'signed_at', signed_at, 'signer_name', signer_name, 'signature', signature, 'signed_hash', signed_hash)
  from public.offerte_signatures
  where token = p_token and length(p_token) between 40 and 80 and expires_at > now();
$$;

create or replace function public.offerte_tekenen(p_token text, p_naam text, p_handtekening text, p_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.offerte_signatures;
begin
  if length(trim(coalesce(p_naam, ''))) not between 2 and 100 then raise exception 'naam ongeldig' using errcode = '22023'; end if;
  if p_handtekening is null or p_handtekening not like 'data:image/png;base64,%' or length(p_handtekening) > 150000 then
    raise exception 'handtekening ongeldig' using errcode = '22023';
  end if;
  if length(coalesce(p_hash, '')) <> 64 then raise exception 'ongeldig' using errcode = '22023'; end if;
  update public.offerte_signatures
     set signed_at = now(), signer_name = trim(p_naam), signature = p_handtekening, signed_hash = p_hash,
         expires_at = now() + interval '365 days'
   where token = p_token and signed_at is null and snapshot_hash = p_hash and expires_at > now()
  returning * into r;
  if r.token is null then
    if exists (select 1 from public.offerte_signatures where token = p_token and signed_at is not null and expires_at > now()) then
      raise exception 'al getekend' using errcode = 'P0001';
    end if;
    raise exception 'offerte niet gevonden of gewijzigd' using errcode = 'P0002';
  end if;
  return jsonb_build_object('signed_at', r.signed_at, 'signer_name', r.signer_name);
end $$;

revoke all on function public.offerte_delen(jsonb, text) from public;
revoke all on function public.offerte_ophalen(text) from public;
revoke all on function public.offerte_tekenen(text, text, text, text) from public;
grant execute on function public.offerte_delen(jsonb, text) to anon, authenticated;
grant execute on function public.offerte_ophalen(text) to anon, authenticated;
grant execute on function public.offerte_tekenen(text, text, text, text) to anon, authenticated;

-- ——— 3. Opruimen ————————————————————————————————————————————————————
create or replace function private.opruimen() returns void
language sql security definer set search_path = '' as $$
  delete from public.offerte_signatures where expires_at < now();
  delete from private.rate where ts < now() - interval '2 days';
  delete from public.events where created_at < now() - interval '400 days';
$$;
revoke all on function private.opruimen() from public, anon, authenticated;

-- Dagelijks om 03:15 UTC. (pg_cron is beschikbaar op Supabase; staat hij uit: Database → Extensions → pg_cron aanzetten.)
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'maatklaar-opruimen';
select cron.schedule('maatklaar-opruimen', '15 3 * * *', $$select private.opruimen()$$);

-- Direct één keer opruimen
select private.opruimen();
