-- Tekenbewijs: bij digitaal tekenen ook een gehashte IP-code en het browsertype (user-agent) vastleggen.
-- Zo is achteraf beter te onderbouwen vanaf welk apparaat een offerte is getekend.
-- Geen ruwe IP-adressen: private.client_sleutel() geeft sha256(IP + geheim zout) terug (zie beveiliging.sql).
-- offerte_ophalen geeft deze kolommen NIET terug; alleen de beheerder kan ze in de database zien.
--
-- Bevat ook de 4xx-foutcodes uit 20261111133000_offerte_tekenen_hash_4xx.sql ("niet gevonden"/"ingetrokken" → 400 i.p.v. 500).
-- Draai dit bestand dus NA, of IN PLAATS VAN, 20261111133000 (dat bestand daarna niet meer los draaien, anders vervallen de nieuwe velden).
--
-- NIET automatisch toepassen op productie: test- en live-site delen dezelfde database.
-- Pas na Marius' OK plakken in Supabase → SQL Editor → Run. Idempotent: mag vaker worden uitgevoerd.
-- Vereist: ondertekenen.sql, beveiliging.sql en fotos-en-links.sql zijn al gedraaid.

alter table public.offerte_signatures add column if not exists signer_ip_hash text;
alter table public.offerte_signatures add column if not exists signer_ua text;

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
         expires_at = now() + interval '365 days',
         signer_ip_hash = private.client_sleutel(),
         signer_ua = left(coalesce(current_setting('request.headers', true)::json->>'user-agent', ''), 300)
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
