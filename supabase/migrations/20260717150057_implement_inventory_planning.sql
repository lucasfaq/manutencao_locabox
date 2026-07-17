create table if not exists public.estoque_configuracoes (
  id_configuracao smallint primary key default 1 check (id_configuracao = 1),
  nivel_servico numeric(6,5) not null default 0.95 check (nivel_servico >= 0.5 and nivel_servico < 1),
  janela_historica_dias integer not null default 90 check (janela_historica_dias between 7 and 730),
  lead_time_dias integer not null default 5 check (lead_time_dias between 1 and 365),
  desvio_lead_time_dias numeric(8,2) not null default 1 check (desvio_lead_time_dias >= 0),
  periodo_revisao_dias integer not null default 7 check (periodo_revisao_dias between 1 and 365),
  minimo_observacoes integer not null default 7 check (minimo_observacoes between 2 and 365),
  atualizado_em timestamptz not null default now()
);

insert into public.estoque_configuracoes (id_configuracao)
values (1)
on conflict (id_configuracao) do nothing;

alter table public.estoque_materiais
  add column if not exists nivel_servico numeric(6,5) check (nivel_servico is null or (nivel_servico >= 0.5 and nivel_servico < 1)),
  add column if not exists janela_historica_dias integer check (janela_historica_dias is null or janela_historica_dias between 7 and 730),
  add column if not exists lead_time_dias integer check (lead_time_dias is null or lead_time_dias between 1 and 365),
  add column if not exists desvio_lead_time_dias numeric(8,2) check (desvio_lead_time_dias is null or desvio_lead_time_dias >= 0),
  add column if not exists periodo_revisao_dias integer check (periodo_revisao_dias is null or periodo_revisao_dias between 1 and 365),
  add column if not exists lote_minimo numeric(12,2) not null default 0 check (lote_minimo >= 0),
  add column if not exists multiplo_compra numeric(12,2) not null default 1 check (multiplo_compra > 0),
  add column if not exists critico boolean not null default false;

create index if not exists idx_movimentacoes_data_tipo
  on public.movimentacoes (data_movimentacao, tipo_codigo);

create index if not exists idx_movimentacoes_estoque_material_movimentacao
  on public.movimentacoes_estoque (id_material, id_movimentacao);

create index if not exists idx_estoque_materiais_ativos
  on public.estoque_materiais (descricao)
  where ativo is true;

create or replace view public.vw_estoque_planejamento
with (security_invoker = true)
as
with parametros as (
  select
    em.*,
    coalesce(em.nivel_servico, ec.nivel_servico) as nivel_servico_aplicado,
    coalesce(em.janela_historica_dias, ec.janela_historica_dias) as janela_historica_aplicada,
    coalesce(em.lead_time_dias, ec.lead_time_dias) as lead_time_aplicado,
    coalesce(em.desvio_lead_time_dias, ec.desvio_lead_time_dias) as desvio_lead_time_aplicado,
    coalesce(em.periodo_revisao_dias, ec.periodo_revisao_dias) as periodo_revisao_aplicado,
    ec.minimo_observacoes,
    case
      when coalesce(em.nivel_servico, ec.nivel_servico) >= 0.9999 then 3.620
      when coalesce(em.nivel_servico, ec.nivel_servico) >= 0.999 then 3.100
      when coalesce(em.nivel_servico, ec.nivel_servico) >= 0.99 then 2.325
      when coalesce(em.nivel_servico, ec.nivel_servico) >= 0.98 then 2.055
      when coalesce(em.nivel_servico, ec.nivel_servico) >= 0.97 then 1.880
      when coalesce(em.nivel_servico, ec.nivel_servico) >= 0.96 then 1.751
      when coalesce(em.nivel_servico, ec.nivel_servico) >= 0.95 then 1.645
      when coalesce(em.nivel_servico, ec.nivel_servico) >= 0.90 then 1.282
      when coalesce(em.nivel_servico, ec.nivel_servico) >= 0.85 then 1.037
      when coalesce(em.nivel_servico, ec.nivel_servico) >= 0.80 then 0.842
      when coalesce(em.nivel_servico, ec.nivel_servico) >= 0.70 then 0.525
      when coalesce(em.nivel_servico, ec.nivel_servico) >= 0.60 then 0.254
      else 0
    end as fator_servico
  from public.estoque_materiais em
  cross join public.estoque_configuracoes ec
  where em.ativo is true
),
demanda_diaria as (
  select
    p.id_material,
    serie.dia,
    coalesce(sum(me.quantidade) filter (where m.tipo_codigo = 'saida'), 0)::numeric as demanda
  from parametros p
  cross join lateral generate_series(
    current_date - (p.janela_historica_aplicada - 1),
    current_date,
    interval '1 day'
  ) serie(dia)
  left join public.movimentacoes m
    on m.data_movimentacao::date = serie.dia::date
   and m.tipo_codigo = 'saida'
  left join public.movimentacoes_estoque me
    on me.id_movimentacao = m.id_movimentacao
   and me.id_material = p.id_material
  group by p.id_material, serie.dia
),
estatisticas as (
  select
    id_material,
    avg(demanda)::numeric as demanda_media,
    coalesce(stddev_samp(demanda), 0)::numeric as desvio_demanda,
    count(*) filter (where demanda > 0)::integer as dias_com_consumo,
    sum(demanda)::numeric as consumo_periodo
  from demanda_diaria
  group by id_material
),
calculos as (
  select
    p.*,
    e.demanda_media,
    e.desvio_demanda,
    e.dias_com_consumo,
    e.consumo_periodo,
    (
      p.fator_servico * sqrt(
        power(e.desvio_demanda::double precision, 2) * p.lead_time_aplicado
        + power(e.demanda_media::double precision, 2) * power(p.desvio_lead_time_aplicado::double precision, 2)
      )
    )::numeric as estoque_seguranca
  from parametros p
  join estatisticas e using (id_material)
)
select
  id_material,
  codigo,
  descricao,
  categoria,
  unidade_medida,
  estoque_atual,
  estoque_minimo,
  critico,
  nivel_servico_aplicado as nivel_servico,
  fator_servico,
  janela_historica_aplicada as janela_historica_dias,
  lead_time_aplicado as lead_time_dias,
  desvio_lead_time_aplicado as desvio_lead_time_dias,
  periodo_revisao_aplicado as periodo_revisao_dias,
  lote_minimo,
  multiplo_compra,
  dias_com_consumo,
  consumo_periodo,
  round(demanda_media, 4) as demanda_media,
  round(desvio_demanda, 4) as desvio_demanda,
  round(estoque_seguranca, 2) as estoque_seguranca,
  round(demanda_media * lead_time_aplicado + estoque_seguranca, 2) as ponto_ressuprimento,
  round(demanda_media * (lead_time_aplicado + periodo_revisao_aplicado) + estoque_seguranca, 2) as estoque_alvo,
  case when demanda_media > 0 then round(estoque_atual / demanda_media, 1) else null end as cobertura_dias,
  case
    when dias_com_consumo < minimo_observacoes then 0
    else greatest(
      lote_minimo,
      ceil(
        greatest(
          0,
          demanda_media * (lead_time_aplicado + periodo_revisao_aplicado) + estoque_seguranca - estoque_atual
        ) / multiplo_compra
      ) * multiplo_compra
    )
  end::numeric(12,2) as sugestao_compra,
  case
    when dias_com_consumo < minimo_observacoes then 'sem_historico'
    when estoque_atual <= 0 then 'ruptura'
    when estoque_atual <= demanda_media * lead_time_aplicado + estoque_seguranca then 'comprar'
    when estoque_atual <= demanda_media * (lead_time_aplicado + periodo_revisao_aplicado) + estoque_seguranca then 'atencao'
    else 'normal'
  end as situacao
from calculos;

alter table public.estoque_configuracoes enable row level security;

revoke all on table public.estoque_configuracoes, public.vw_estoque_planejamento from anon, authenticated;
grant select on table public.estoque_configuracoes, public.vw_estoque_planejamento to authenticated;
grant update on table public.estoque_configuracoes to authenticated;

drop policy if exists "estoque_configuracoes_select_autenticado" on public.estoque_configuracoes;
create policy "estoque_configuracoes_select_autenticado"
on public.estoque_configuracoes for select
to authenticated
using (private.has_active_profile((select auth.uid())));

drop policy if exists "estoque_configuracoes_update_gestor" on public.estoque_configuracoes;
create policy "estoque_configuracoes_update_gestor"
on public.estoque_configuracoes for update
to authenticated
using (private.is_gestor((select auth.uid())))
with check (id_configuracao = 1 and private.is_gestor((select auth.uid())));

comment on view public.vw_estoque_planejamento is
  'Indicadores de demanda e reposicao calculados sobre saidas de estoque auditaveis.';
