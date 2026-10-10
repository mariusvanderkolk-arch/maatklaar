-- Maatklaar: offerte digitaal laten ondertekenen door de klant. Idempotent: mag vaker worden uitgevoerd.
-- Plak in Supabase → SQL Editor → Run.
-- Ontwerp: de tabel is NIET direct leesbaar of schrijfbaar via de API. Alles gaat via drie functies
-- (security definer) die alleen werken met een onraadbaar token (2× uuid v4 ≈ 244 bits toeval).

create table if not exists public.offerte_signatures (
  token text primary key check (length(token) between 40 and 80),
  created_at timestamptz not null default now(),
  site text not null default 'main' check (site in ('main', 'test')),
  offerte_nr text not null check (length(offerte_nr) <= 40),
  snapshot jsonb not null,
  snapshot_hash text not null,
  signed_at timestamptz,
  signer_name text check (length(signer_name) between 2 and 100),
  signature text check (length(signature) <= 150000),
  signed_hash text
);
alter table public.offerte_signatures enable row level security;
revoke all on public.offerte_signatures from public, anon, authenticated;
-- Geen policies: alleen de functies hieronder hebben toegang.

-- 1. Aannemer maakt een deellink: bewaart een momentopname van de offerte en krijgt een token terug.
create or replace function public.offerte_delen(p_snapshot jsonb, p_site text default 'main')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t text; h text; nr text;
begin
  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' or length(p_snapshot::text) > 200000 then
    raise exception 'ongeldige offerte' using errcode = '22023';
  end if;
  nr := left(coalesce(p_snapshot->>'nr', ''), 40);
  t := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  h := encode(sha256(convert_to(p_snapshot::text, 'UTF8')), 'hex');
  insert into public.offerte_signatures (token, site, offerte_nr, snapshot, snapshot_hash)
    values (t, case when p_site = 'test' then 'test' else 'main' end, nr, p_snapshot, h);
  return jsonb_build_object('token', t, 'hash', h);
end $$;

-- 2. Klant (en aannemer) lezen de offerte + tekenstatus, alleen met het token.
create or replace function public.offerte_ophalen(p_token text)
returns jsonb language sql security definer set search_path = '' stable as $$
  select jsonb_build_object('snapshot', snapshot, 'hash', snapshot_hash, 'created_at', created_at,
                            'signed_at', signed_at, 'signer_name', signer_name, 'signature', signature, 'signed_hash', signed_hash)
  from public.offerte_signatures where token = p_token and length(p_token) between 40 and 80;
$$;

-- 3. Klant tekent, één keer. De hash moet overeenkomen met de getoonde momentopname.
create or replace function public.offerte_tekenen(p_token text, p_naam text, p_handtekening text, p_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.offerte_signatures;
begin
  if length(trim(coalesce(p_naam, ''))) not between 2 and 100 then raise exception 'naam ongeldig' using errcode = '22023'; end if;
  if p_handtekening is null or p_handtekening not like 'data:image/png;base64,%' or length(p_handtekening) > 150000 then
    raise exception 'handtekening ongeldig' using errcode = '22023';
  end if;
  update public.offerte_signatures
     set signed_at = now(), signer_name = trim(p_naam), signature = p_handtekening, signed_hash = p_hash
   where token = p_token and signed_at is null and snapshot_hash = p_hash
  returning * into r;
  if r.token is null then
    if exists (select 1 from public.offerte_signatures where token = p_token and signed_at is not null) then
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
