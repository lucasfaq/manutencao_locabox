grant delete on table public.atendimento_pendencias to authenticated;

drop policy if exists "atendimento_pendencias_delete_autenticado" on public.atendimento_pendencias;
create policy "atendimento_pendencias_delete_autenticado"
on public.atendimento_pendencias for delete
to authenticated
using (private.has_active_profile((select auth.uid())));

create or replace function public.excluir_ordem_mvp(p_ordem_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  materiais_vinculados integer;
begin
  if not private.has_active_profile((select auth.uid())) then
    raise exception 'Usuario sem perfil ativo';
  end if;

  if p_ordem_id is null then
    raise exception 'OS obrigatoria';
  end if;

  select count(*)
  into materiais_vinculados
  from public.atendimento_materiais am
  join public.atendimentos a on a.id = am.atendimento_id
  where a.ordem_id = p_ordem_id;

  if materiais_vinculados > 0 then
    raise exception 'Esta OS possui atendimento com material ou movimentacao de estoque. Exclua apenas OS sem baixa de material para preservar o estoque.';
  end if;

  delete from public.atendimento_pendencias ap
  using public.atendimentos a
  where ap.atendimento_id = a.id
    and a.ordem_id = p_ordem_id;

  delete from public.atendimentos
  where ordem_id = p_ordem_id;

  delete from public.pendencias_ordem
  where ordem_id = p_ordem_id;

  delete from public.ordens
  where id = p_ordem_id;
end;
$$;

revoke execute on function public.excluir_ordem_mvp(bigint) from public, anon;
grant execute on function public.excluir_ordem_mvp(bigint) to authenticated;

comment on function public.excluir_ordem_mvp(bigint)
  is 'Exclui OS MVP e seus vinculos operacionais somente quando nao ha material/baixa de estoque relacionada.';
