-- Maatklaar: foto's in de cloud + veilige offerte-links. Idempotent: mag vaker worden uitgevoerd.
-- Plak in Supabase → SQL Editor → Run. Vereist: schema.sql, ondertekenen.sql, beveiliging.sql en opvolging.sql.
-- Achterwaarts compatibel: de huidige live-app (zelfde database) blijft werken; alle bestaande functies houden
-- dezelfde naam en parameters en geven alleen extra velden terug.
--
-- 1. Foto's: privé-bucket 'project-fotos', elke gebruiker alleen in zijn eigen map <user_id>/...
-- 2. Offerte-links: eigenaar (user_id als ingelogd, anders een eigenaarsgeheim), intrekken, verlopen opnieuw gecontroleerd.
-- 3. Account verwijderen wist ook de eigen offerte-links.
-- 4. Rate limit per aanroeper (gebruiker of IP) in plaats van 500 per dag voor iedereen samen.

create extension if not exists pgcrypto;

-- ——— 1. Foto-opslag ————————————————————————————————————————————————————
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-fotos', 'project-fotos', false, 3145728, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "project-fotos eigen lezen" on storage.objects;
drop policy if exists "project-fotos eigen toevoegen" on storage.objects;
drop policy if exists "project-fotos eigen wijzigen" on storage.objects;
drop policy if exists "project-fotos eigen verwijderen" on storage.objects;
create policy "project-fotos eigen lezen" on storage.objects for select to authenticated
  using (bucket_id = 'project-fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "project-fotos eigen toevoegen" on storage.objects for insert to authenticated
  with check (bucket_id = 'project-fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "project-fotos eigen wijzigen" on storage.objects for update to authenticated
  using (bucket_id = 'project-fotos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'project-fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "project-fotos eigen verwijderen" on storage.objects for delete to authenticated
  using (bucket_id = 'project-fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ——— 2. Offerte-links: eigenaar en intrekken ——————————————————————————
alter table public.offerte_signatures add column if not exists owner_id uuid references auth.users on delete cascade;
alter table public.offerte_signatures add column if not exists owner_secret_hash text;
alter table public.offerte_signatures add column if not exists revoked_at timestamptz;
create index if not exists offerte_signatures_owner_idx on public.offerte_signatures (owner_id);

-- Rate limit met een eigen sleutel (gebruiker of gehashte IP).
create or replace function private.rate_ok_sleutel(p_bucket text, p_sleutel text, p_max int, p_venster interval)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from private.rate where bucket = p_bucket and sleutel = p_sleutel and ts > now() - p_venster) >= p_max then return false; end if;
  insert into private.rate (bucket, sleutel) values (p_bucket, p_sleutel);
  return true;
end $$;
revoke all on function private.rate_ok_sleutel(text, text, int, interval) from public, anon, authenticated;

-- Delen. Ingelogd: per gebruiker 60 per uur / 300 per dag. Anoniem: per IP 20 per uur / 100 per dag,
-- plus een vangnet van 2.000 per dag voor alle anonieme aanroepen samen (ingelogde gebruikers tellen daar niet in mee).
create or replace function public.offerte_delen(p_snapshot jsonb, p_site text default 'main')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t text; h text; nr text; g text; u uuid := auth.uid(); k text;
begin
  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' or length(p_snapshot::text) > 200000 then
    raise exception 'ongeldige offerte' using errcode = '22023';
  end if;
  if u is not null then
    k := 'u:' || u::text;
    if (select count(*) from private.rate where bucket = 'delen-dag' and sleutel = k and ts > now() - interval '1 day') >= 300
       or not private.rate_ok_sleutel('delen', k, 60, interval '1 hour') then
      raise exception 'te veel deellinks, probeer het later opnieuw' using errcode = '54000';
    end if;
  else
    k := 'ip:' || private.client_sleutel();
    if (select count(*) from private.rate where bucket = 'delen-dag' and sleutel = k and ts > now() - interval '1 day') >= 100
       or (select count(*) from private.rate where bucket = 'delen-dag' and sleutel like 'ip:%' and ts > now() - interval '1 day') >= 2000
       or not private.rate_ok_sleutel('delen', k, 20, interval '1 hour') then
      raise exception 'te veel deellinks, probeer het later opnieuw' using errcode = '54000';
    end if;
  end if;
  insert into private.rate (bucket, sleutel) values ('delen-dag', k);
  nr := left(coalesce(p_snapshot->>'nr', ''), 40);
  t := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  g := encode(extensions.gen_random_bytes(24), 'hex');
  h := encode(sha256(convert_to(p_snapshot::text, 'UTF8')), 'hex');
  insert into public.offerte_signatures (token, site, offerte_nr, snapshot, snapshot_hash, expires_at, owner_id, owner_secret_hash)
    values (t, case when p_site = 'test' then 'test' else 'main' end, nr, p_snapshot, h, now() + interval '90 days',
            u, encode(sha256(convert_to(g, 'UTF8')), 'hex'));
  return jsonb_build_object('token', t, 'hash', h, 'owner_secret', g);
end $$;

-- Ophalen: verlopen links geven niets; ingetrokken links alleen {revoked: true} (geen offerte, geen handtekening).
create or replace function public.offerte_ophalen(p_token text)
returns jsonb language sql security definer set search_path = '' stable as $$
  select case when revoked_at is not null then jsonb_build_object('revoked', true, 'revoked_at', revoked_at)
         else jsonb_build_object('snapshot', snapshot, 'hash', snapshot_hash, 'created_at', created_at,
                                 'signed_at', signed_at, 'signer_name', signer_name, 'signature', signature,
                                 'signed_hash', signed_hash, 'viewed_at', viewed_at) end
  from public.offerte_signatures
  where token = p_token and length(p_token) between 40 and 80 and expires_at > now();
$$;

-- Tekenen: niet op een ingetrokken link.
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
      raise exception 'ingetrokken' using errcode = 'P0002';
    end if;
    if exists (select 1 from public.offerte_signatures where token = p_token and signed_at is not null and expires_at > now()) then
      raise exception 'al getekend' using errcode = 'P0001';
    end if;
    raise exception 'offerte niet gevonden of gewijzigd' using errcode = 'P0002';
  end if;
  return jsonb_build_object('signed_at', r.signed_at, 'signer_name', r.signer_name);
end $$;

-- Bekeken: niet op verlopen of ingetrokken links.
create or replace function public.offerte_bekeken(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v timestamptz;
begin
  if p_token is null or length(p_token) not between 40 and 80 then
    raise exception 'ongeldig' using errcode = '22023';
  end if;
  update public.offerte_signatures set viewed_at = now()
   where token = p_token and viewed_at is null and revoked_at is null and expires_at > now()
  returning viewed_at into v;
  if v is null then
    select viewed_at into v from public.offerte_signatures where token = p_token and expires_at > now();
  end if;
  return jsonb_build_object('viewed_at', v);
end $$;

-- Intrekken: alleen de eigenaar (ingelogd als dezelfde gebruiker, of met het eigenaarsgeheim). Getekende links blijven staan.
create or replace function public.offerte_intrekken(p_token text, p_geheim text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.offerte_signatures; u uuid := auth.uid();
begin
  if p_token is null or length(p_token) not between 40 and 80 then raise exception 'ongeldig' using errcode = '22023'; end if;
  if not private.rate_ok_sleutel('intrekken', coalesce('u:' || u::text, 'ip:' || private.client_sleutel()), 60, interval '1 hour') then
    raise exception 'te vaak, probeer het later opnieuw' using errcode = '54000';
  end if;
  select * into r from public.offerte_signatures where token = p_token;
  if r.token is null
     or not ((r.owner_id is not null and r.owner_id = u)
             or (r.owner_secret_hash is not null and length(coalesce(p_geheim, '')) between 32 and 128
                 and r.owner_secret_hash = encode(sha256(convert_to(p_geheim, 'UTF8')), 'hex'))) then
    raise exception 'niet gevonden of geen eigenaar' using errcode = 'P0002';
  end if;
  if r.signed_at is not null then raise exception 'al getekend' using errcode = 'P0001'; end if;
  update public.offerte_signatures set revoked_at = coalesce(revoked_at, now()) where token = p_token returning * into r;
  return jsonb_build_object('revoked_at', r.revoked_at);
end $$;

revoke all on function public.offerte_delen(jsonb, text) from public;
revoke all on function public.offerte_ophalen(text) from public;
revoke all on function public.offerte_tekenen(text, text, text, text) from public;
revoke all on function public.offerte_bekeken(text) from public;
revoke all on function public.offerte_intrekken(text, text) from public;
grant execute on function public.offerte_delen(jsonb, text) to anon, authenticated;
grant execute on function public.offerte_ophalen(text) to anon, authenticated;
grant execute on function public.offerte_tekenen(text, text, text, text) to anon, authenticated;
grant execute on function public.offerte_bekeken(text) to anon, authenticated;
grant execute on function public.offerte_intrekken(text, text) to anon, authenticated;

-- ——— 3. Account verwijderen: ook eigen offerte-links (en via cascade alle overige cloudgegevens) ———
-- Foto's in Storage wist de app vóór deze aanroep (Supabase staat direct verwijderen uit storage.objects via SQL niet toe).
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'niet ingelogd' using errcode = '42501'; end if;
  delete from public.offerte_signatures where owner_id = auth.uid();
  delete from auth.users where id = auth.uid();
end $$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
