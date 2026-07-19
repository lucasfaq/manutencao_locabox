create or replace function public.registrar_atendimento_com_materiais(
  p_ordem_id integer,
  p_data date,
  p_status text,
  p_equipe text,
  p_relato text,
  p_materiais jsonb default '[]'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_atendimento_id integer;
  created_movimentacao_id integer;
  item jsonb;
  item_id_material integer;
  item_quantidade numeric;
  item_tipo_uso text;
  item_observacao text;
  item_descricao text;
begin
  if not private.has_active_profile((select auth.uid())) then
    raise exception 'Usuario sem perfil ativo';
  end if;

  if p_ordem_id is null then
    raise exception 'OS obrigatoria';
  end if;

  if p_status not in ('Executado', 'Parcial', 'Reagendado') then
    raise exception 'Status de atendimento invalido';
  end if;

  if jsonb_typeof(coalesce(p_materiais, '[]'::jsonb)) <> 'array' then
    raise exception 'Materiais devem ser enviados como lista';
  end if;

  insert into public.atendimentos (
    ordem_id,
    data,
    equipe,
    status,
    relato
  )
  values (
    p_ordem_id,
    coalesce(p_data, current_date),
    coalesce(nullif(trim(p_equipe), ''), 'Equipe interna'),
    coalesce(nullif(trim(p_status), ''), 'Executado'),
    coalesce(trim(p_relato), '')
  )
  returning id into created_atendimento_id;

  for item in select * from jsonb_array_elements(coalesce(p_materiais, '[]'::jsonb))
  loop
    item_id_material := nullif(item->>'idMaterial', '')::integer;
    item_quantidade := nullif(item->>'quantidade', '')::numeric;
    item_tipo_uso := coalesce(nullif(trim(item->>'tipoUso'), ''), 'consumo');
    item_observacao := coalesce(trim(item->>'observacao'), '');

    if item_id_material is null then
      raise exception 'Material obrigatorio em todas as linhas';
    end if;

    if item_quantidade is null or item_quantidade <= 0 then
      raise exception 'Quantidade deve ser maior que zero em todas as linhas';
    end if;

    if item_tipo_uso not in ('consumo', 'emprestimo_ferramenta', 'perda_avaria') then
      raise exception 'Tipo de uso de material invalido';
    end if;

    select descricao
    into item_descricao
    from public.estoque_materiais
    where id_material = item_id_material
      and ativo is true;

    if item_descricao is null then
      raise exception 'Material inexistente ou inativo';
    end if;

    insert into public.atendimento_materiais (
      atendimento_id,
      descricao
    )
    values (
      created_atendimento_id,
      concat(
        item_descricao,
        ' | qtd: ',
        item_quantidade,
        ' | uso: ',
        case item_tipo_uso
          when 'consumo' then 'consumo'
          when 'emprestimo_ferramenta' then 'emprestimo de ferramenta/equipamento'
          when 'perda_avaria' then 'perda ou avaria'
        end,
        case when item_observacao <> '' then concat(' | obs: ', item_observacao) else '' end
      )
    );

    insert into public.movimentacoes (
      data_movimentacao,
      tipo_codigo,
      origem,
      observacao,
      criado_por
    )
    values (
      coalesce(p_data::timestamptz, now()),
      'saida',
      concat('Atendimento MVP #', created_atendimento_id),
      concat(
        case item_tipo_uso
          when 'consumo' then 'Consumo em atendimento'
          when 'emprestimo_ferramenta' then 'Emprestimo de ferramenta/equipamento para equipe'
          when 'perda_avaria' then 'Perda ou avaria em atendimento'
        end,
        case when item_observacao <> '' then concat(': ', item_observacao) else '' end
      ),
      (select auth.uid())
    )
    returning id_movimentacao into created_movimentacao_id;

    insert into public.movimentacoes_estoque (
      id_movimentacao,
      id_material,
      quantidade
    )
    values (
      created_movimentacao_id,
      item_id_material,
      item_quantidade
    );
  end loop;

  update public.ordens
  set status = case when p_status = 'Executado' then 'Concluida' else 'Pendente' end
  where id = p_ordem_id;

  return created_atendimento_id;
end;
$$;

revoke execute on function public.registrar_atendimento_com_materiais(integer, date, text, text, text, jsonb)
  from public, anon;
grant execute on function public.registrar_atendimento_com_materiais(integer, date, text, text, text, jsonb)
  to authenticated;

comment on function public.registrar_atendimento_com_materiais(integer, date, text, text, text, jsonb)
  is 'Registra atendimento MVP e materiais estruturados em transacao unica, gerando saidas canonicas de estoque por consumo, emprestimo de ferramenta/equipamento ou perda/avaria.';
