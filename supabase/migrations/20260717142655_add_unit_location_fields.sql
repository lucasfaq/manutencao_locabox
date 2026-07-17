alter table public.unidades_instaladas
  add column if not exists estado text not null default '',
  add column if not exists cidade text not null default '',
  add column if not exists bairro text not null default '',
  add column if not exists rua text not null default '',
  add column if not exists google_maps_url text not null default '';

create index if not exists idx_unidades_instaladas_estado
  on public.unidades_instaladas (estado);

create index if not exists idx_unidades_instaladas_cidade
  on public.unidades_instaladas (cidade);

create index if not exists idx_unidades_instaladas_bairro
  on public.unidades_instaladas (bairro);

comment on column public.unidades_instaladas.estado is
  'Estado ou UF da localizacao fisica da unidade.';

comment on column public.unidades_instaladas.google_maps_url is
  'Link compartilhavel da localizacao da unidade no Google Maps.';
