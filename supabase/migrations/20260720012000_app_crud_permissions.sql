-- Consolida permissoes do app web para o CRUD operacional.
-- A interface atual ainda usa tabelas MVP diretamente em algumas telas
-- e tabelas canonicas em cadastros/consultas. Esta migracao evita que
-- cada tela dependa de policies divergentes.

grant usage, select on all sequences in schema public to authenticated;

grant select, insert, update, delete on table
  public.unidades,
  public.ordens,
  public.pendencias_ordem,
  public.atendimentos,
  public.atendimento_materiais,
  public.estoque
to authenticated;

grant select, insert, update, delete on table public.atendimento_pendencias to authenticated;

grant select, insert, update on table
  public.clientes,
  public.empresas,
  public.contratos,
  public.projetos,
  public.unidades_instaladas,
  public.colaboradores,
  public.terceirizados,
  public.estoque_materiais,
  public.pendencias_padrao,
  public.historico_unidade,
  public.estoque_configuracoes
to authenticated;

drop policy if exists "app_active_manage_unidades" on public.unidades;
create policy "app_active_manage_unidades"
on public.unidades for all
to authenticated
using (private.has_active_profile((select auth.uid())))
with check (private.has_active_profile((select auth.uid())));

drop policy if exists "app_active_manage_ordens" on public.ordens;
create policy "app_active_manage_ordens"
on public.ordens for all
to authenticated
using (private.has_active_profile((select auth.uid())))
with check (private.has_active_profile((select auth.uid())));

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

drop policy if exists "app_active_manage_atendimento_pendencias" on public.atendimento_pendencias;
create policy "app_active_manage_atendimento_pendencias"
on public.atendimento_pendencias for all
to authenticated
using (private.has_active_profile((select auth.uid())))
with check (private.has_active_profile((select auth.uid())));

drop policy if exists "app_active_manage_estoque" on public.estoque;
create policy "app_active_manage_estoque"
on public.estoque for all
to authenticated
using (private.has_active_profile((select auth.uid())))
with check (private.has_active_profile((select auth.uid())));

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'clientes',
    'empresas',
    'contratos',
    'projetos',
    'unidades_instaladas',
    'colaboradores',
    'terceirizados',
    'estoque_materiais',
    'pendencias_padrao',
    'historico_unidade',
    'estoque_configuracoes'
  ] loop
    execute format('drop policy if exists "app_active_manage_%s" on public.%I', tbl, tbl);
    execute format(
      'create policy "app_active_manage_%s" on public.%I for all to authenticated using (private.has_active_profile((select auth.uid()))) with check (private.has_active_profile((select auth.uid())))',
      tbl,
      tbl
    );
  end loop;
end $$;

comment on policy "app_active_manage_ordens" on public.ordens
  is 'Permissao operacional consolidada para o CRUD do app web de manutencao.';
