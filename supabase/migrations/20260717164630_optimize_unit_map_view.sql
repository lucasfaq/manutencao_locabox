create or replace view public.vw_mapa_unidades
with (security_invoker = true)
as
with ultima_manutencao as (
  select
    om.id_unidade,
    max(coalesce(ao.data_fechamento, ao.data_abertura, om.data_conclusao, om.abertura_em)) as ultima_manutencao
  from public.ordens_manutencao om
  left join public.atendimentos_ordens ao on ao.id_ordem = om.id_ordem
  group by om.id_unidade
)
select
  ui.id_unidade,
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
  um.ultima_manutencao
from public.unidades_instaladas ui
join public.projetos pr on pr.id_projeto = ui.id_projeto
join public.contratos c on c.id_contrato = pr.id_contrato
left join ultima_manutencao um on um.id_unidade = ui.id_unidade;

grant select on table public.vw_mapa_unidades to authenticated;

comment on view public.vw_mapa_unidades is
  'Consolida unidades, contrato, projeto, coordenadas e ultima manutencao para o mapa interativo.';
