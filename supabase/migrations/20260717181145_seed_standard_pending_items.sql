insert into public.pendencias_padrao (codigo, descricao, ativo)
values
  ('vazamento', 'Vazamento', true),
  ('problema_eletrico', 'Problema eletrico', true),
  ('problema_hidraulico', 'Problema hidraulico', true),
  ('ar_condicionado', 'Ar-condicionado', true),
  ('porta_fechadura', 'Porta ou fechadura', true),
  ('pintura_acabamento', 'Pintura ou acabamento', true),
  ('piso_revestimento', 'Piso ou revestimento', true),
  ('telhado_cobertura', 'Telhado ou cobertura', true),
  ('limpeza', 'Limpeza', true),
  ('reposicao_material', 'Reposicao de material', true),
  ('estrutura_modular', 'Estrutura modular', true),
  ('mobiliario_acessorios', 'Mobiliario ou acessorios', true)
on conflict (codigo) do update
set
  descricao = excluded.descricao,
  ativo = true,
  atualizado_em = now();
