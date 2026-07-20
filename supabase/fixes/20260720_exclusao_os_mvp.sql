-- Fix operacional para exclusao de OS MVP no app manutencao-web.
-- Aplicar no Supabase Dashboard > SQL Editor do projeto nyroltiqmkvxcujxapzf.

grant usage on schema public, private to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant select, insert, update, delete on table
  public.unidades,
  public.ordens,
  public.pendencias_ordem,
  public.atendimentos,
  public.atendimento_materiais,
  public.estoque
to authenticated;

drop policy if exists "app_active_manage_pendencias_ordem" on public.pendencias_ordem;
create policy "app_active_manage_pendencias_ordem"
on public.pendencias_ordem for all
to authenticated
using (private.has_active_profile((select auth.uid())))
with check (private.has_active_profile((select auth.uid())));

drop policy if exists "app_active_manage_atendimentos" on public.atendimentos;
create policy "app_active_manage_atendimentos"
on public.atendimentos for all
to authenticated
using (private.has_active_profile((select auth.uid())))
with check (private.has_active_profile((select auth.uid())));

drop policy if exists "app_active_manage_atendimento_materiais" on public.atendimento_materiais;
create policy "app_active_manage_atendimento_materiais"
on public.atendimento_materiais for all
to authenticated
using (private.has_active_profile((select auth.uid())))
with check (private.has_active_profile((select auth.uid())));

do $$
begin
  if to_regclass('public.atendimento_pendencias') is not null then
    grant select, insert, update, delete on table public.atendimento_pendencias to authenticated;
    drop policy if exists "app_active_manage_atendimento_pendencias" on public.atendimento_pendencias;
    create policy "app_active_manage_atendimento_pendencias"
    on public.atendimento_pendencias for all
    to authenticated
    using (private.has_active_profile((select auth.uid())))
    with check (private.has_active_profile((select auth.uid())));
  end if;
end $$;

create or replace function public.excluir_ordem_mvp(p_ordem_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  materiais_vinculados integer;
begin
  if not private.has_active_profile((select auth.uid())) then
    raise exception 'Usuario sem perfil ativo';
  end if;

  if p_ordem_id is null then
    raise exception 'OS obrigatoria';
  end if;

  select count(*)
  into materiais_vinculados
  from public.atendimento_materiais am
  join public.atendimentos a on a.id = am.atendimento_id
  where a.ordem_id = p_ordem_id;

  if materiais_vinculados > 0 then
    raise exception 'Esta OS possui atendimento com material ou movimentacao de estoque. Exclua apenas OS sem baixa de material para preservar o estoque.';
  end if;

  if to_regclass('public.atendimento_pendencias') is not null then
    execute
      'delete from public.atendimento_pendencias ap
       using public.atendimentos a
       where ap.atendimento_id = a.id
         and a.ordem_id = $1'
    using p_ordem_id;
  end if;

  delete from public.atendimentos
  where ordem_id = p_ordem_id;

  delete from public.pendencias_ordem
  where ordem_id = p_ordem_id;

  delete from public.ordens
  where id = p_ordem_id;
end;
$$;

revoke execute on function public.excluir_ordem_mvp(bigint) from public, anon;
grant execute on function public.excluir_ordem_mvp(bigint) to authenticated;

comment on function public.excluir_ordem_mvp(bigint)
  is 'Exclui OS MVP e seus vinculos operacionais somente quando nao ha material/baixa de estoque relacionada.';
