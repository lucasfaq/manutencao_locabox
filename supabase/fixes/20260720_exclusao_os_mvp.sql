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

grant select on table
  public.estoque_materiais,
  public.movimentacoes,
  public.movimentacoes_estoque
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

create or replace function public.listar_atendimento_mvp_movimentacoes(p_atendimento_ids bigint[])
returns table (
  id_atendimento bigint,
  id_movimentacao integer,
  data_movimentacao timestamptz,
  tipo_codigo text,
  material text,
  codigo text,
  quantidade numeric,
  unidade_medida text,
  origem text,
  observacao text
)
language sql
security definer
set search_path = ''
as $$
  select
    ids.id_atendimento,
    m.id_movimentacao,
    m.data_movimentacao,
    m.tipo_codigo,
    em.descricao as material,
    coalesce(em.codigo, '') as codigo,
    me.quantidade,
    em.unidade_medida,
    m.origem,
    coalesce(m.observacao, '') as observacao
  from unnest(coalesce(p_atendimento_ids, array[]::bigint[])) as ids(id_atendimento)
  join public.movimentacoes m
    on m.origem in (
      concat('Atendimento MVP #', ids.id_atendimento),
      concat('Estorno Atendimento MVP #', ids.id_atendimento)
    )
  join public.movimentacoes_estoque me
    on me.id_movimentacao = m.id_movimentacao
  join public.estoque_materiais em
    on em.id_material = me.id_material
  where private.has_active_profile((select auth.uid()))
  order by ids.id_atendimento, m.data_movimentacao desc, m.id_movimentacao desc;
$$;

revoke execute on function public.listar_atendimento_mvp_movimentacoes(bigint[]) from public, anon;
grant execute on function public.listar_atendimento_mvp_movimentacoes(bigint[]) to authenticated;

comment on function public.listar_atendimento_mvp_movimentacoes(bigint[])
  is 'Lista movimentacoes de estoque originadas ou estornadas por atendimentos MVP.';

create or replace function public.estornar_atendimento_mvp_materiais(p_atendimento_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  origem_atendimento text;
  origem_estorno text;
  created_movimentacao_id integer;
  movimentos_original integer;
  item record;
begin
  if not private.has_active_profile((select auth.uid())) then
    raise exception 'Usuario sem perfil ativo';
  end if;

  if not exists (
    select 1
    from public.perfis p
    where p.id = (select auth.uid())
      and p.ativo = true
      and p.perfil = 'gestor'
  ) then
    raise exception 'Somente gestores podem estornar materiais de atendimento';
  end if;

  if p_atendimento_id is null then
    raise exception 'Atendimento obrigatorio';
  end if;

  if not exists (select 1 from public.atendimentos a where a.id = p_atendimento_id) then
    raise exception 'Atendimento inexistente';
  end if;

  origem_atendimento := concat('Atendimento MVP #', p_atendimento_id);
  origem_estorno := concat('Estorno Atendimento MVP #', p_atendimento_id);

  if exists (select 1 from public.movimentacoes m where m.origem = origem_estorno) then
    delete from public.atendimento_materiais
    where atendimento_id = p_atendimento_id;
    return;
  end if;

  select count(*)
  into movimentos_original
  from public.movimentacoes m
  join public.movimentacoes_estoque me
    on me.id_movimentacao = m.id_movimentacao
  where m.origem = origem_atendimento
    and m.tipo_codigo = 'saida';

  if movimentos_original = 0 then
    delete from public.atendimento_materiais
    where atendimento_id = p_atendimento_id;
    return;
  end if;

  insert into public.movimentacoes (
    data_movimentacao,
    tipo_codigo,
    origem,
    observacao,
    criado_por
  )
  values (
    now(),
    'entrada',
    origem_estorno,
    'Estorno de material para liberar exclusao/cancelamento de OS MVP',
    (select auth.uid())
  )
  returning id_movimentacao into created_movimentacao_id;

  for item in
    select
      me.id_material,
      sum(me.quantidade) as quantidade
    from public.movimentacoes m
    join public.movimentacoes_estoque me
      on me.id_movimentacao = m.id_movimentacao
    where m.origem = origem_atendimento
      and m.tipo_codigo = 'saida'
    group by me.id_material
    having sum(me.quantidade) <> 0
  loop
    insert into public.movimentacoes_estoque (
      id_movimentacao,
      id_material,
      quantidade
    )
    values (
      created_movimentacao_id,
      item.id_material,
      item.quantidade
    );
  end loop;

  delete from public.atendimento_materiais
  where atendimento_id = p_atendimento_id;
end;
$$;

revoke execute on function public.estornar_atendimento_mvp_materiais(bigint) from public, anon;
grant execute on function public.estornar_atendimento_mvp_materiais(bigint) to authenticated;

comment on function public.estornar_atendimento_mvp_materiais(bigint)
  is 'Registra entrada de estorno para materiais de atendimento MVP e remove o bloqueio operacional de exclusao.';
