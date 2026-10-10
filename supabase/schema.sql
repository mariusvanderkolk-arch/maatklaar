-- Maatklaar cloud-sync. Plak in Supabase > SQL Editor > Run. Veilig om opnieuw te draaien.
create table if not exists public.user_data (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null,
  id text not null,
  data jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, id)
);
alter table public.user_data enable row level security;
drop policy if exists own_rows on public.user_data;
create policy own_rows on public.user_data for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.user_data from anon;
grant select, insert, update, delete on public.user_data to authenticated;

-- Eigen account verwijderen (cloudgegevens gaan mee via on delete cascade).
create or replace function public.delete_my_account() returns void
language sql security definer set search_path = '' as $$
  delete from auth.users where id = auth.uid();
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
