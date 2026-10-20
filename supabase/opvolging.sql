-- Maatklaar: offerte-opvolging ("Bekeken"). Idempotent: mag vaker worden uitgevoerd.
-- Vereist: supabase/ondertekenen.sql is al gedraaid.
-- Plak in Supabase → SQL Editor → Run.
-- Veiligheid: de tabel blijft dicht (RLS aan, geen policies, geen rechten voor anon/authenticated).
-- Alleen wie het onraadbare token heeft kan via de functie hieronder "bekeken" zetten, en alleen één keer.

alter table public.offerte_signatures add column if not exists viewed_at timestamptz;

-- 1. Klant opent de tekenlink: legt het eerste moment van openen vast (verandert daarna niet meer).
create or replace function public.offerte_bekeken(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v timestamptz;
begin
  if p_token is null or length(p_token) not between 40 and 80 then
    raise exception 'ongeldig' using errcode = '22023';
  end if;
  update public.offerte_signatures
     set viewed_at = now()
   where token = p_token and viewed_at is null
  returning viewed_at into v;
  if v is null then
    select viewed_at into v from public.offerte_signatures where token = p_token;
  end if;
  return jsonb_build_object('viewed_at', v);
end $$;

-- 2. Ophalen geeft nu ook viewed_at terug (verder ongewijzigd).
create or replace function public.offerte_ophalen(p_token text)
returns jsonb language sql security definer set search_path = '' stable as $$
  select jsonb_build_object('snapshot', snapshot, 'hash', snapshot_hash, 'created_at', created_at,
                            'signed_at', signed_at, 'signer_name', signer_name, 'signature', signature,
                            'signed_hash', signed_hash, 'viewed_at', viewed_at)
  from public.offerte_signatures where token = p_token and length(p_token) between 40 and 80;
$$;

revoke all on function public.offerte_bekeken(text) from public;
revoke all on function public.offerte_ophalen(text) from public;
grant execute on function public.offerte_bekeken(text) to anon, authenticated;
grant execute on function public.offerte_ophalen(text) to anon, authenticated;
