alter table public.historico_unidade
  add column if not exists tipo_evento text not null default 'registro'
    check (tipo_evento in ('registro', 'manutencao', 'realocacao', 'reforma', 'mudanca_contrato')),
  add column if not exists id_projeto_anterior integer references public.projetos(id_projeto) on delete restrict,
  add column if not exists id_projeto_novo integer references public.projetos(id_projeto) on delete restrict;

create index if not exists idx_historico_unidade_tipo_evento
  on public.historico_unidade (tipo_evento);

grant select, insert on table public.historico_unidade to authenticated;
grant select on table public.vw_mapa_unidades, public.vw_historico_unidades to authenticated;
grant delete on table public.ordens, public.pendencias_ordem to authenticated;

drop policy if exists "ordens_delete_sem_atendimento_autenticado" on public.ordens;
create policy "ordens_delete_sem_atendimento_autenticado"
on public.ordens for delete
to authenticated
using (
  private.has_active_profile((select auth.uid()))
  and not exists (
    select 1
    from public.atendimentos a
    where a.ordem_id = ordens.id
  )
);

drop policy if exists "pendencias_ordem_delete_sem_atendimento_autenticado" on public.pendencias_ordem;
create policy "pendencias_ordem_delete_sem_atendimento_autenticado"
on public.pendencias_ordem for delete
to authenticated
using (
  private.has_active_profile((select auth.uid()))
  and not exists (
    select 1
    from public.atendimentos a
    where a.ordem_id = pendencias_ordem.ordem_id
  )
);

drop view if exists public.vw_mapa_unidades;
create view public.vw_mapa_unidades
with (security_invoker = true)
as
select
  ui.id_unidade,
  ui.id_projeto,
  ui.codigo,
  ui.nome,
  ui.estado,
  ui.cidade,
  ui.bairro,
  ui.rua,
  ui.google_maps_url,
  ui.latitude,
  ui.longitude,
  ui.status_codigo,
  ui.ativo,
  pr.nome as projeto_nome,
  c.numero_contrato,
  (
    select max(coalesce(ao.data_fechamento, ao.data_abertura))
    from public.ordens_manutencao om
    left join public.atendimentos_ordens ao on ao.id_ordem = om.id_ordem
    where om.id_unidade = ui.id_unidade
  ) as ultima_manutencao
from public.unidades_instaladas ui
join public.projetos pr on pr.id_projeto = ui.id_projeto
join public.contratos c on c.id_contrato = pr.id_contrato;

drop view if exists public.vw_historico_unidades;
create view public.vw_historico_unidades
with (security_invoker = true)
as
select
  ('historico-' || hu.id_historico::text) as id_evento,
  hu.id_unidade,
  hu.registrado_em as data_evento,
  hu.tipo_evento,
  case hu.tipo_evento
    when 'manutencao' then 'Manutencao'
    when 'realocacao' then 'Realocacao'
    when 'reforma' then 'Reforma'
    when 'mudanca_contrato' then 'Mudanca de contrato/projeto'
    else 'Registro manual'
  end as titulo,
  concat(
    hu.descricao,
    case
      when pa.nome is not null or pn.nome is not null then concat(
        ' | Projeto anterior: ',
        coalesce(pa.nome, 'nao informado'),
        ' | Projeto novo: ',
        coalesce(pn.nome, 'nao informado')
      )
      else ''
    end
  ) as descricao,
  null::text as status_codigo,
  null::text as protocolo
from public.historico_unidade hu
left join public.projetos pa on pa.id_projeto = hu.id_projeto_anterior
left join public.projetos pn on pn.id_projeto = hu.id_projeto_novo
union all
select
  ('ordem-' || om.id_ordem::text) as id_evento,
  om.id_unidade,
  om.abertura_em as data_evento,
  'ordem'::text as tipo_evento,
  ('OS ' || om.protocolo) as titulo,
  om.descricao,
  om.status_codigo,
  om.protocolo
from public.ordens_manutencao om
union all
select
  ('atendimento-' || ao.id_atendimento::text) as id_evento,
  om.id_unidade,
  coalesce(ao.data_fechamento, ao.data_abertura) as data_evento,
  'atendimento'::text as tipo_evento,
  ('Atendimento da OS ' || om.protocolo) as titulo,
  ao.relato as descricao,
  ao.status_codigo,
  om.protocolo
from public.atendimentos_ordens ao
join public.ordens_manutencao om on om.id_ordem = ao.id_ordem;

grant select on table public.vw_mapa_unidades, public.vw_historico_unidades to authenticated;

comment on column public.historico_unidade.tipo_evento is
  'Classifica eventos operacionais da unidade: manutencao, realocacao, reforma, mudanca de contrato/projeto ou registro geral.';

comment on policy "ordens_delete_sem_atendimento_autenticado" on public.ordens
  is 'Permite excluir OS MVP somente antes de existir atendimento, preservando rastreabilidade operacional.';
