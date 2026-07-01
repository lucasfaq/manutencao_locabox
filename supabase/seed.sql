insert into public.unidades (id, codigo, nome, cliente, contrato, projeto, municipio, status) values
  (1, 'UNI-001', 'C-Jovem Messejana', 'Locabox', 'Contrato C-Jovem', 'Ambientes modulares', 'Fortaleza', 'Instalada'),
  (2, 'UNI-002', 'SAMU Sobral', 'Prefeitura de Sobral', 'Locacao modular', 'Saude', 'Sobral', 'Instalada'),
  (3, 'UNI-003', 'SEPUL Recife', 'SEPUL Recife', '3401.1015-2022', 'Operacao Recife', 'Recife', 'Em operacao'),
  (4, 'UNI-004', 'Jaboatao SDS', 'SDS Jaboatao', '004-2024', 'Seguranca', 'Jaboatao dos Guararapes', 'Instalada')
on conflict (codigo) do update set
  nome = excluded.nome,
  cliente = excluded.cliente,
  contrato = excluded.contrato,
  projeto = excluded.projeto,
  municipio = excluded.municipio,
  status = excluded.status;

insert into public.ordens (id, unidade_id, protocolo, tipo, prioridade, status, abertura, prazo_sla, responsavel, descricao) values
  (1, 1, 'OS-2026-0001', 'Corretiva', 'P1', 'Em atendimento', '2026-06-28', '2026-07-01', 'Equipe Fortaleza', 'Revisao de ar condicionado e ajuste de vedacao.'),
  (2, 2, 'OS-2026-0002', 'Preventiva', 'P2', 'Agendada', '2026-06-30', '2026-07-04', 'Equipe Norte', 'Checklist preventivo mensal.'),
  (3, 3, 'OS-2026-0003', 'Corretiva', 'P3', 'Pendente', '2026-06-20', '2026-06-27', 'Terceirizado Recife', 'Porta com desalinhamento e necessidade de material.')
on conflict (protocolo) do update set
  unidade_id = excluded.unidade_id,
  tipo = excluded.tipo,
  prioridade = excluded.prioridade,
  status = excluded.status,
  abertura = excluded.abertura,
  prazo_sla = excluded.prazo_sla,
  responsavel = excluded.responsavel,
  descricao = excluded.descricao;

insert into public.pendencias_ordem (ordem_id, descricao)
select * from (values
  (1, 'Validar dreno'),
  (1, 'Registrar fotos finais'),
  (2, 'Conferir quadro eletrico'),
  (2, 'Testar iluminacao'),
  (3, 'Comprar dobradica'),
  (3, 'Agendar retorno')
) as source(ordem_id, descricao)
where not exists (
  select 1 from public.pendencias_ordem p
  where p.ordem_id = source.ordem_id and p.descricao = source.descricao
);

insert into public.atendimentos (id, ordem_id, data, equipe, status, relato) values
  (1, 1, '2026-06-29', 'Equipe Fortaleza', 'Parcial', 'Limpeza do evaporador executada. Dreno ficou pendente para retorno.')
on conflict (id) do update set
  ordem_id = excluded.ordem_id,
  data = excluded.data,
  equipe = excluded.equipe,
  status = excluded.status,
  relato = excluded.relato;

insert into public.atendimento_materiais (atendimento_id, descricao)
select * from (values
  (1, 'Filtro de ar'),
  (1, 'Fita aluminizada')
) as source(atendimento_id, descricao)
where not exists (
  select 1 from public.atendimento_materiais m
  where m.atendimento_id = source.atendimento_id and m.descricao = source.descricao
);

insert into public.estoque (id, item, categoria, unidade, quantidade, minimo) values
  (1, 'Filtro ar condicionado split', 'Climatizacao', 'un', 4, 6),
  (2, 'Dobradiça reforçada', 'Esquadrias', 'un', 3, 2),
  (3, 'Disjuntor bipolar 32A', 'Eletrica', 'un', 8, 4),
  (4, 'Sifao flexivel', 'Hidrossanitario', 'un', 1, 3)
on conflict (id) do update set
  item = excluded.item,
  categoria = excluded.categoria,
  unidade = excluded.unidade,
  quantidade = excluded.quantidade,
  minimo = excluded.minimo;

select setval(pg_get_serial_sequence('public.unidades', 'id'), greatest((select max(id) from public.unidades), 1));
select setval(pg_get_serial_sequence('public.ordens', 'id'), greatest((select max(id) from public.ordens), 1));
select setval(pg_get_serial_sequence('public.atendimentos', 'id'), greatest((select max(id) from public.atendimentos), 1));
select setval(pg_get_serial_sequence('public.estoque', 'id'), greatest((select max(id) from public.estoque), 1));
