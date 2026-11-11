-- offerte_tekenen: "niet gevonden of gewijzigd" en "ingetrokken" als 4xx, niet als HTTP 500.
-- PostgREST mapte SQLSTATE P0002 (no_data_found) naar 500. 22023 (data exception) wordt 400,
-- net als "naam ongeldig" / "handtekening ongeldig".
--
-- NIET automatisch toepassen op productie: test- en live-site delen dezelfde database
-- (p_site = test|main). Dit bestand is de migratie om later bewust, na Marius' OK, te draaien.

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
   where token = p_token and signed_at is null and revoked_at is null and snapshot_hash = p_hash and expires_at > now()
  returning * into r;
  if r.token is null then
    if exists (select 1 from public.offerte_signatures where token = p_token and revoked_at is not null) then
      raise exception 'ingetrokken' using errcode = '22023';
    end if;
    if exists (select 1 from public.offerte_signatures where token = p_token and signed_at is not null and expires_at > now()) then
      raise exception 'al getekend' using errcode = 'P0001';
    end if;
    raise exception 'offerte niet gevonden of gewijzigd' using errcode = '22023';
  end if;
  return jsonb_build_object('signed_at', r.signed_at, 'signer_name', r.signer_name);
end $$;

revoke all on function public.offerte_tekenen(text, text, text, text) from public;
grant execute on function public.offerte_tekenen(text, text, text, text) to anon, authenticated;
