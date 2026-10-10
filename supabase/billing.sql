-- Maatklaar Pro: abonnementen. Plak in Supabase > SQL Editor > Run. Veilig om opnieuw te draaien.
-- Schrijven gebeurt alleen door de Edge Functions (service role) en door start_trial().

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users on delete cascade,
  status text not null check (status in ('trial', 'active', 'past_due', 'canceled')),
  plan text check (plan in ('maand', 'jaar')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  mollie_customer_id text,
  mollie_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
drop policy if exists eigen_abonnement_lezen on public.subscriptions;
create policy eigen_abonnement_lezen on public.subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);
-- géén insert/update/delete-policies: gebruikers kunnen hun status niet zelf aanpassen
revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;

-- Betalingen (voor de factuurhistorie en om webhooks idempotent te verwerken)
create table if not exists public.payments (
  mollie_payment_id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  status text not null,
  amount numeric(10, 2) not null,
  plan text,
  sequence_type text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.payments enable row level security;
drop policy if exists eigen_betalingen_lezen on public.payments;
create policy eigen_betalingen_lezen on public.payments for select to authenticated
  using ((select auth.uid()) = user_id);
revoke all on public.payments from anon, authenticated;
grant select on public.payments to authenticated;

-- Proefperiode van 14 dagen: één keer per gebruiker, zonder betaalgegevens.
create or replace function public.start_trial() returns public.subscriptions
language plpgsql security definer set search_path = '' as $$
declare
  rij public.subscriptions;
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd';
  end if;
  insert into public.subscriptions (user_id, status, trial_ends_at)
  values (auth.uid(), 'trial', now() + interval '14 days')
  on conflict (user_id) do nothing
  returning * into rij;
  if rij.user_id is null then
    raise exception 'Je hebt de proefperiode al gebruikt of hebt al een abonnement.';
  end if;
  return rij;
end;
$$;
revoke execute on function public.start_trial() from public, anon;
grant execute on function public.start_trial() to authenticated;
