alter table public.unidades_instaladas
  add column if not exists latitude numeric(10,7),
  add column if not exists longitude numeric(10,7),
  add column if not exists coordenadas_atualizadas_em timestamptz,
  add constraint unidades_instaladas_latitude_check
    check (latitude is null or latitude between -90 and 90),
  add constraint unidades_instaladas_longitude_check
    check (longitude is null or longitude between -180 and 180);

create index if not exists idx_unidades_instaladas_coordenadas
  on public.unidades_instaladas (latitude, longitude)
  where latitude is not null and longitude is not null and ativo is true;

create index if not exists idx_ordens_manutencao_unidade_abertura
  on public.ordens_manutencao (id_unidade, abertura_em desc);

create index if not exists idx_atendimentos_ordens_ordem_datas
  on public.atendimentos_ordens (id_ordem, data_fechamento desc, data_abertura desc);

drop view if exists public.vw_mapa_unidades;
create view public.vw_mapa_unidades
with (security_invoker = true)
as
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
  'registro'::text as tipo_evento,
  'Registro manual'::text as titulo,
  hu.descricao,
  null::text as status_codigo,
  null::text as protocolo
from public.historico_unidade hu
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

grant select on table public.historico_unidade, public.vw_mapa_unidades, public.vw_historico_unidades to authenticated;
grant insert on table public.historico_unidade to authenticated;

drop policy if exists "historico_unidade_select_autenticado" on public.historico_unidade;
create policy "historico_unidade_select_autenticado"
on public.historico_unidade for select
to authenticated
using (private.has_active_profile((select auth.uid())));

drop policy if exists "historico_unidade_insert_gestor" on public.historico_unidade;
create policy "historico_unidade_insert_gestor"
on public.historico_unidade for insert
to authenticated
with check (private.is_gestor((select auth.uid())));

comment on column public.unidades_instaladas.latitude is
  'Latitude extraida do link do Google Maps para exibicao no mapa operacional.';

comment on column public.unidades_instaladas.longitude is
  'Longitude extraida do link do Google Maps para exibicao no mapa operacional.';

comment on view public.vw_mapa_unidades is
  'Consolida unidades, contrato, projeto, coordenadas e ultima manutencao para o mapa interativo.';

comment on view public.vw_historico_unidades is
  'Linha do tempo da unidade combinando historico manual, OS e atendimentos.';
