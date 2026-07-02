do $$
begin
  create type public.perfil_usuario as enum ('tecnico', 'gestor');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.perfis (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  perfil public.perfil_usuario not null default 'tecnico',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create schema if not exists private;

create or replace function private.has_active_profile(target_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfis
    where user_id = target_user_id
      and ativo is true
  );
$$;

create or replace function private.is_gestor(target_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfis
    where user_id = target_user_id
      and perfil = 'gestor'
      and ativo is true
  );
$$;

create or replace function private.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (user_id, nome, perfil)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.email, ''),
    'tecnico'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function private.handle_new_user_profile();

drop function if exists public.handle_new_user_profile();

insert into public.perfis (user_id, nome, perfil)
select id, coalesce(raw_user_meta_data->>'nome', email, ''), 'tecnico'
from auth.users
on conflict (user_id) do nothing;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_perfis_updated_at on public.perfis;
create trigger set_perfis_updated_at
before update on public.perfis
for each row execute function public.set_updated_at();

create index if not exists idx_atendimento_materiais_atendimento_id
  on public.atendimento_materiais(atendimento_id);

alter table public.perfis enable row level security;
alter table public.unidades enable row level security;
alter table public.ordens enable row level security;
alter table public.pendencias_ordem enable row level security;
alter table public.atendimentos enable row level security;
alter table public.atendimento_materiais enable row level security;
alter table public.estoque enable row level security;

revoke all on table public.perfis from anon, authenticated;
revoke all on table public.unidades from anon, authenticated;
revoke all on table public.ordens from anon, authenticated;
revoke all on table public.pendencias_ordem from anon, authenticated;
revoke all on table public.atendimentos from anon, authenticated;
revoke all on table public.atendimento_materiais from anon, authenticated;
revoke all on table public.estoque from anon, authenticated;

grant select on table public.perfis to authenticated;
grant update (nome) on table public.perfis to authenticated;
grant select on table public.unidades to authenticated;
grant select, insert, update on table public.ordens to authenticated;
grant select, insert on table public.pendencias_ordem to authenticated;
grant select, insert on table public.atendimentos to authenticated;
grant select, insert on table public.atendimento_materiais to authenticated;
grant select on table public.estoque to authenticated;
grant insert, update on table public.unidades to authenticated;
grant insert, update on table public.estoque to authenticated;

revoke all on all sequences in schema public from anon;
grant usage, select on all sequences in schema public to authenticated;

revoke execute on function public.set_updated_at() from public;
revoke execute on function private.handle_new_user_profile() from public;
revoke execute on function private.has_active_profile(uuid) from public;
revoke execute on function private.is_gestor(uuid) from public;
grant execute on function private.has_active_profile(uuid) to authenticated;
grant execute on function private.is_gestor(uuid) to authenticated;

drop policy if exists "service role full access unidades" on public.unidades;
drop policy if exists "service role full access ordens" on public.ordens;
drop policy if exists "service role full access pendencias_ordem" on public.pendencias_ordem;
drop policy if exists "service role full access atendimentos" on public.atendimentos;
drop policy if exists "service role full access atendimento_materiais" on public.atendimento_materiais;
drop policy if exists "service role full access estoque" on public.estoque;
drop policy if exists "anon read unidades" on public.unidades;
drop policy if exists "anon read ordens" on public.ordens;
drop policy if exists "anon write ordens" on public.ordens;
drop policy if exists "anon update ordens" on public.ordens;
drop policy if exists "anon read pendencias_ordem" on public.pendencias_ordem;
drop policy if exists "anon write pendencias_ordem" on public.pendencias_ordem;
drop policy if exists "anon read atendimentos" on public.atendimentos;
drop policy if exists "anon write atendimentos" on public.atendimentos;
drop policy if exists "anon read atendimento_materiais" on public.atendimento_materiais;
drop policy if exists "anon write atendimento_materiais" on public.atendimento_materiais;
drop policy if exists "anon read estoque" on public.estoque;

drop policy if exists "authenticated read own profile" on public.perfis;
create policy "authenticated read own profile"
on public.perfis for select
to authenticated
using (
  user_id = (select auth.uid())
  or private.is_gestor((select auth.uid()))
);

drop policy if exists "authenticated update own profile name" on public.perfis;
create policy "authenticated update own profile name"
on public.perfis for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and perfil = perfil
  and ativo = ativo
);

drop policy if exists "active users read unidades" on public.unidades;
create policy "active users read unidades"
on public.unidades for select
to authenticated
using (private.has_active_profile((select auth.uid())));

drop policy if exists "gestores manage unidades" on public.unidades;
create policy "gestores manage unidades"
on public.unidades for insert
to authenticated
with check (private.is_gestor((select auth.uid())));

drop policy if exists "gestores update unidades" on public.unidades;
create policy "gestores update unidades"
on public.unidades for update
to authenticated
using (private.is_gestor((select auth.uid())))
with check (private.is_gestor((select auth.uid())));

drop policy if exists "active users read ordens" on public.ordens;
create policy "active users read ordens"
on public.ordens for select
to authenticated
using (private.has_active_profile((select auth.uid())));

drop policy if exists "active users create ordens" on public.ordens;
create policy "active users create ordens"
on public.ordens for insert
to authenticated
with check (private.has_active_profile((select auth.uid())));

drop policy if exists "active users update ordens" on public.ordens;
create policy "active users update ordens"
on public.ordens for update
to authenticated
using (private.has_active_profile((select auth.uid())))
with check (private.has_active_profile((select auth.uid())));

drop policy if exists "active users read pendencias" on public.pendencias_ordem;
create policy "active users read pendencias"
on public.pendencias_ordem for select
to authenticated
using (private.has_active_profile((select auth.uid())));

drop policy if exists "active users create pendencias" on public.pendencias_ordem;
create policy "active users create pendencias"
on public.pendencias_ordem for insert
to authenticated
with check (private.has_active_profile((select auth.uid())));

drop policy if exists "active users read atendimentos" on public.atendimentos;
create policy "active users read atendimentos"
on public.atendimentos for select
to authenticated
using (private.has_active_profile((select auth.uid())));

drop policy if exists "active users create atendimentos" on public.atendimentos;
create policy "active users create atendimentos"
on public.atendimentos for insert
to authenticated
with check (private.has_active_profile((select auth.uid())));

drop policy if exists "active users read atendimento materiais" on public.atendimento_materiais;
create policy "active users read atendimento materiais"
on public.atendimento_materiais for select
to authenticated
using (private.has_active_profile((select auth.uid())));

drop policy if exists "active users create atendimento materiais" on public.atendimento_materiais;
create policy "active users create atendimento materiais"
on public.atendimento_materiais for insert
to authenticated
with check (private.has_active_profile((select auth.uid())));

drop policy if exists "active users read estoque" on public.estoque;
create policy "active users read estoque"
on public.estoque for select
to authenticated
using (private.has_active_profile((select auth.uid())));

drop policy if exists "gestores manage estoque" on public.estoque;
create policy "gestores manage estoque"
on public.estoque for insert
to authenticated
with check (private.is_gestor((select auth.uid())));

drop policy if exists "gestores update estoque" on public.estoque;
create policy "gestores update estoque"
on public.estoque for update
to authenticated
using (private.is_gestor((select auth.uid())))
with check (private.is_gestor((select auth.uid())));
