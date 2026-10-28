-- Maatklaar: anonieme, cookievrije gebruikscijfers. Idempotent: mag vaker worden uitgevoerd.
-- Plak in Supabase → SQL Editor → Run. Het statistiek-token zet je APART (zie onderaan), nooit in git.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.settings (key text primary key, value text not null);

create table if not exists public.events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  site text not null check (site in ('main', 'test')),
  name text not null,
  path text,
  referrer_host text,
  device text check (device in ('mobile', 'desktop')),
  inapp boolean,
  session text,
  detail text
);
create index if not exists events_created_at_idx on public.events (created_at);

alter table public.events enable row level security;
revoke all on public.events from public, anon, authenticated;
grant insert (site, name, path, referrer_host, device, inapp, session, detail) on public.events to anon, authenticated;
grant usage on sequence public.events_id_seq to anon, authenticated;

drop policy if exists events_insert_only on public.events;
create policy events_insert_only on public.events for insert to anon, authenticated with check (
  name in ('page_view','project_created','offerte_shared','offerte_printed','factuur_created','design_opened',
           'chat_opened','chat_question_unanswered','feedback_opened','signup','review_submitted',
           'opmeten_gestart','maat_ingevuld','offerte_bekeken','snelstart_gestart','snelstart_offerte_klaar')
  and coalesce(length(path), 0) <= 100
  and coalesce(length(referrer_host), 0) <= 100
  and coalesce(length(session), 0) <= 16
  and coalesce(length(detail), 0) <= 120
  -- detail: alleen vrije (geanonimiseerde) tekst bij onbeantwoorde chatvragen; verder uitsluitend vaste woorden.
  and (detail is null
    or name = 'chat_question_unanswered'
    or (name = 'maat_ingevuld' and detail in ('lengte','breedte','hoogte','tegelhoogte','spatwand','opening','overig'))
    or (name = 'snelstart_offerte_klaar' and detail in ('ai','regels'))
    or (name = 'offerte_shared' and detail in ('whatsapp','herinnering','ingetrokken'))
    or (name = 'factuur_created' and detail in ('na_tekenen')))
);
-- Geen SELECT-policy: niemand kan events via de API lezen.

create or replace function public.weekly_stats(p_token text, p_since timestamptz default now() - interval '7 days', p_until timestamptz default now(), p_site text default 'main')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  if p_token is null or not exists (select 1 from private.settings where key = 'stats_token' and value = p_token) then
    raise exception 'geen toegang' using errcode = '42501';
  end if;
  with e as (select * from public.events where created_at >= p_since and created_at < p_until and site = p_site)
  select jsonb_build_object(
    'van', p_since, 'tot', p_until, 'site', p_site,
    'totaal', (select count(*) from e),
    'per_event', coalesce((select jsonb_object_agg(name, n) from (select name, count(*) n from e group by name) x), '{}'::jsonb),
    'dagsessies', (select count(distinct (session, (created_at at time zone 'Europe/Amsterdam')::date)) from e where session is not null),
    'mobiel', (select count(distinct session) from e where device = 'mobile'),
    'desktop', (select count(distinct session) from e where device = 'desktop'),
    'inapp', (select count(distinct session) from e where inapp),
    'top_paden', coalesce((select jsonb_agg(jsonb_build_object('pad', path, 'n', n)) from (select path, count(*) n from e where name = 'page_view' group by path order by n desc limit 10) x), '[]'::jsonb),
    'top_bronnen', coalesce((select jsonb_agg(jsonb_build_object('bron', referrer_host, 'n', n)) from (select referrer_host, count(*) n from e where referrer_host is not null group by referrer_host order by n desc limit 5) x), '[]'::jsonb),
    -- funnel: aantal unieke dagsessies per stap (eerste minuut)
    'funnel', coalesce((select jsonb_object_agg(name, n) from (select name, count(distinct (session, (created_at at time zone 'Europe/Amsterdam')::date)) n from e
       where session is not null and name in ('page_view','project_created','opmeten_gestart','maat_ingevuld','offerte_bekeken','offerte_shared','snelstart_gestart','snelstart_offerte_klaar') group by name) x), '{}'::jsonb),
    'onbeantwoord', coalesce((select jsonb_agg(jsonb_build_object('vraag', d, 'n', n)) from (select lower(detail) d, count(*) n from e where name = 'chat_question_unanswered' and detail is not null group by lower(detail) order by n desc limit 10) x), '[]'::jsonb)
  ) into r;
  return r;
end $$;
revoke all on function public.weekly_stats(text, timestamptz, timestamptz, text) from public;
grant execute on function public.weekly_stats(text, timestamptz, timestamptz, text) to anon, authenticated;

-- Opruimen (optioneel, bv. events ouder dan 13 maanden):
-- delete from public.events where created_at < now() - interval '13 months';

-- TOKEN (apart toevoegen, NIET committen):
-- insert into private.settings (key, value) values ('stats_token', '<TOKEN>')
--   on conflict (key) do update set value = excluded.value;
