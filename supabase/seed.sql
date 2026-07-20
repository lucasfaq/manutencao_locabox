-- Seed destrutivo para ambiente de teste/demo.
-- Execute somente apos backup e somente no projeto Supabase correto.
-- Mantem cadastros de sistema, perfis e usuarios; limpa registros operacionais
-- e cria um unico fluxo de teste: unidade -> OS -> pendencia -> atendimento.

begin;

delete from public.atendimento_pendencias;
delete from public.atendimento_materiais;
delete from public.atendimentos;
delete from public.pendencias_ordem;
delete from public.ordens;
delete from public.estoque;

delete from public.movimentacoes_estoque;
delete from public.movimentacoes;
delete from public.atendimentos_executados;
delete from public.equipes;
delete from public.atendimentos_ordens;
delete from public.pendencias_ordem_manutencao;
delete from public.ordens_manutencao;
delete from public.historico_unidade;
delete from public.unidades_instaladas;
delete from public.projetos;
delete from public.contratos;
delete from public.clientes;
delete from public.empresas;
delete from public.colaboradores;
delete from public.terceirizados;
delete from public.estoque_materiais;

insert into public.clientes (id_cliente, nome, documento, email, telefone, ativo)
values (1, 'Cliente Teste Locabox', '00000000000191', 'teste@locabox.local', '(85) 3000-0000', true);

insert into public.empresas (id_empresa, razao_social, nome_fantasia, cnpj, ativo)
values (1, 'Locabox Ambientes Modulares LTDA', 'Locabox', '00000000000192', true);

insert into public.contratos (id_contrato, id_cliente, id_empresa, numero_contrato, objeto, status_codigo, data_inicio, data_fim, valor_total, ativo)
values (1, 1, 1, 'TESTE-2026-001', 'Contrato de teste para manutencao', 'ativo', '2026-01-01', '2026-12-31', 1000.00, true);

insert into public.projetos (id_projeto, id_contrato, nome, municipio, uf, ativo)
values (1, 1, 'Projeto Teste Manutencao', 'Fortaleza', 'CE', true);

insert into public.unidades_instaladas (
  id_unidade,
  id_projeto,
  codigo,
  nome,
  estado,
  cidade,
  bairro,
  rua,
  google_maps_url,
  latitude,
  longitude,
  status_codigo,
  ativo
) values (
  1,
  1,
  'UNI-TESTE-001',
  'Unidade Teste 001',
  'CE',
  'Fortaleza',
  'Messejana',
  'Rua de Teste, 100',
  '',
  -3.8311,
  -38.4932,
  'instalada',
  true
);

insert into public.colaboradores (id_colaborador, nome, cargo, email, telefone, ativo)
values (1, 'Tecnico Teste', 'Tecnico de manutencao', 'tecnico.teste@locabox.local', '(85) 98888-0000', true);

insert into public.terceirizados (id_terceira, nome, empresa, documento, telefone, ativo)
values (1, 'Equipe Terceira Teste', 'Fornecedor Teste', '00000000000193', '(85) 97777-0000', true);

insert into public.estoque_materiais (
  id_material,
  codigo,
  descricao,
  categoria,
  unidade_medida,
  estoque_minimo,
  estoque_atual,
  nivel_servico,
  janela_historica_dias,
  lead_time_dias,
  desvio_lead_time_dias,
  periodo_revisao_dias,
  lote_minimo,
  multiplo_compra,
  critico,
  ativo
) values (
  1,
  'MAT-TESTE-001',
  'Filtro de ar teste',
  'Climatizacao',
  'un',
  2,
  5,
  0.95,
  90,
  7,
  2,
  30,
  1,
  1,
  false,
  true
);

insert into public.unidades (id, codigo, nome, cliente, contrato, projeto, municipio, status)
values (1, 'UNI-TESTE-001', 'Unidade Teste 001', 'Cliente Teste Locabox', 'TESTE-2026-001', 'Projeto Teste Manutencao', 'Fortaleza', 'Instalada');

insert into public.estoque (id, item, categoria, unidade, quantidade, minimo)
values (1, 'Filtro de ar teste', 'Climatizacao', 'un', 5, 2);

insert into public.ordens (
  id,
  unidade_id,
  protocolo,
  tipo,
  prioridade,
  status,
  abertura,
  prazo_sla,
  responsavel,
  descricao
) values (
  1,
  1,
  'OS-TESTE-001',
  'Corretiva',
  'P2',
  'Pendente',
  '2026-07-20',
  '2026-07-22',
  'Tecnico Teste, Equipe Terceira Teste',
  'OS de teste para validar fluxo de atendimento, pendencias e materiais.'
);

insert into public.pendencias_ordem (id, ordem_id, descricao, status)
values (1, 1, 'Validar funcionamento do ar condicionado', 'Pendente');

insert into public.atendimentos (id, ordem_id, data, equipe, status, relato)
values (1, 1, '2026-07-20', 'Tecnico Teste', 'Parcial', 'Atendimento de teste registrado sem baixa de material para permitir edicao e exclusao.');

insert into public.atendimento_pendencias (atendimento_id, pendencia_id, status, observacao)
values (1, 1, 'Pendente', 'Pendencia mantida em aberto para teste de acompanhamento.');

insert into public.historico_unidade (id_historico, id_unidade, descricao, tipo_evento, registrado_em)
values (1, 1, 'Registro inicial de teste da unidade para consulta de historico.', 'registro', '2026-07-20 09:00:00-03');

select setval(pg_get_serial_sequence('public.clientes', 'id_cliente'), 1, true);
select setval(pg_get_serial_sequence('public.empresas', 'id_empresa'), 1, true);
select setval(pg_get_serial_sequence('public.contratos', 'id_contrato'), 1, true);
select setval(pg_get_serial_sequence('public.projetos', 'id_projeto'), 1, true);
select setval(pg_get_serial_sequence('public.unidades_instaladas', 'id_unidade'), 1, true);
select setval(pg_get_serial_sequence('public.colaboradores', 'id_colaborador'), 1, true);
select setval(pg_get_serial_sequence('public.terceirizados', 'id_terceira'), 1, true);
select setval(pg_get_serial_sequence('public.estoque_materiais', 'id_material'), 1, true);
select setval(pg_get_serial_sequence('public.unidades', 'id'), 1, true);
select setval(pg_get_serial_sequence('public.ordens', 'id'), 1, true);
select setval(pg_get_serial_sequence('public.pendencias_ordem', 'id'), 1, true);
select setval(pg_get_serial_sequence('public.atendimentos', 'id'), 1, true);
select setval(pg_get_serial_sequence('public.estoque', 'id'), 1, true);
select setval(pg_get_serial_sequence('public.historico_unidade', 'id_historico'), 1, true);

commit;
