-- Maatklaar: beoordelingen van de app door vakmensen. Idempotent: mag vaker worden uitgevoerd.
-- Plak in Supabase → SQL Editor → Run. Gebruikt hetzelfde stats_token als analytics.sql (private.settings).

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.settings (key text primary key, value text not null);

create table if not exists public.reviews (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  site text not null default 'main' check (site in ('main', 'test')),
  stars smallint not null check (stars between 1 and 5),
  text text not null default '' check (length(text) <= 300),
  name text check (length(name) <= 60),
  company text check (length(company) <= 80),
  consent boolean not null default false,
  approved boolean not null default false
);
create index if not exists reviews_approved_idx on public.reviews (approved, created_at desc);

alter table public.reviews enable row level security;
revoke all on public.reviews from public, anon, authenticated;
-- Invoegen mag (zonder 'approved': die staat altijd op false); lezen alleen de veilige kolommen.
grant insert (site, stars, text, name, company, consent) on public.reviews to anon, authenticated;
grant select (id, created_at, site, stars, text, name, company) on public.reviews to anon, authenticated;
grant usage on sequence public.reviews_id_seq to anon, authenticated;

drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert to anon, authenticated with check (
  approved = false and stars between 1 and 5 and length(text) <= 300
  and coalesce(length(name), 0) <= 60 and coalesce(length(company), 0) <= 80
);
drop policy if exists reviews_public_select on public.reviews;
create policy reviews_public_select on public.reviews for select to anon, authenticated using (approved = true and consent = true);
-- Geen update/delete-policy: goedkeuren kan alleen Marius (Table Editor of approve_review met token).

-- Openstaande beoordelingen bekijken (token-beveiligd, zoals weekly_stats).
create or replace function public.pending_reviews(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if p_token is null or not exists (select 1 from private.settings where key = 'stats_token' and value = p_token) then
    raise exception 'geen toegang' using errcode = '42501';
  end if;
  return coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at) from public.reviews r where not r.approved), '[]'::jsonb);
end $$;
revoke all on function public.pending_reviews(text) from public;
grant execute on function public.pending_reviews(text) to anon, authenticated;

-- Goedkeuren (p_ok = true) of weer verbergen (false).
create or replace function public.approve_review(p_token text, p_id bigint, p_ok boolean default true)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_token is null or not exists (select 1 from private.settings where key = 'stats_token' and value = p_token) then
    raise exception 'geen toegang' using errcode = '42501';
  end if;
  update public.reviews set approved = p_ok where id = p_id;
  return found;
end $$;
revoke all on function public.approve_review(text, bigint, boolean) from public;
grant execute on function public.approve_review(text, bigint, boolean) to anon, authenticated;

-- Analytics: 'review_submitted' toestaan (alleen nodig als analytics.sql al gedraaid is).
do $$ begin
  if to_regclass('public.events') is not null then
    drop policy if exists events_insert_only on public.events;
    create policy events_insert_only on public.events for insert to anon, authenticated with check (
      name in ('page_view','project_created','offerte_shared','offerte_printed','factuur_created','design_opened',
               'chat_opened','chat_question_unanswered','feedback_opened','signup','review_submitted')
      and coalesce(length(path), 0) <= 100
      and coalesce(length(referrer_host), 0) <= 100
      and coalesce(length(session), 0) <= 16
      and coalesce(length(detail), 0) <= 120
      and (detail is null or name = 'chat_question_unanswered')
    );
  end if;
end $$;
