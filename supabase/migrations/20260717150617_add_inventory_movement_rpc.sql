create or replace function public.registrar_movimentacao_estoque(
  p_id_material integer,
  p_tipo_codigo text,
  p_quantidade numeric,
  p_data_movimentacao timestamptz,
  p_origem text default '',
  p_observacao text default ''
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_id integer;
begin
  if not private.is_gestor((select auth.uid())) then
    raise exception 'Somente gestores podem registrar movimentacoes avulsas de estoque';
  end if;

  if p_tipo_codigo not in ('entrada', 'saida') then
    raise exception 'Tipo de movimentacao invalido';
  end if;

  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'Quantidade deve ser maior que zero';
  end if;

  if not exists (
    select 1
    from public.estoque_materiais
    where id_material = p_id_material
      and ativo is true
  ) then
    raise exception 'Material inexistente ou inativo';
  end if;

  insert into public.movimentacoes (
    data_movimentacao,
    tipo_codigo,
    origem,
    observacao,
    criado_por
  )
  values (
    coalesce(p_data_movimentacao, now()),
    p_tipo_codigo,
    coalesce(trim(p_origem), ''),
    coalesce(trim(p_observacao), ''),
    (select auth.uid())
  )
  returning id_movimentacao into created_id;

  insert into public.movimentacoes_estoque (
    id_movimentacao,
    id_material,
    quantidade
  )
  values (
    created_id,
    p_id_material,
    p_quantidade
  );

  return created_id;
end;
$$;

revoke execute on function public.registrar_movimentacao_estoque(integer, text, numeric, timestamptz, text, text)
  from public, anon;
grant execute on function public.registrar_movimentacao_estoque(integer, text, numeric, timestamptz, text, text)
  to authenticated;

comment on function public.registrar_movimentacao_estoque(integer, text, numeric, timestamptz, text, text)
  is 'Registra entrada ou saida avulsa de material em transacao unica, restrita a gestores.';
