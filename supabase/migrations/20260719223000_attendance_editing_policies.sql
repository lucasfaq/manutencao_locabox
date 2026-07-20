grant update, delete on table public.atendimentos to authenticated;
grant delete on table public.atendimento_materiais to authenticated;

drop policy if exists "atendimentos_update_autenticado" on public.atendimentos;
create policy "atendimentos_update_autenticado"
on public.atendimentos for update
to authenticated
using (private.has_active_profile((select auth.uid())))
with check (private.has_active_profile((select auth.uid())));

drop policy if exists "atendimentos_delete_sem_material_autenticado" on public.atendimentos;
create policy "atendimentos_delete_sem_material_autenticado"
on public.atendimentos for delete
to authenticated
using (
  private.has_active_profile((select auth.uid()))
  and not exists (
    select 1
    from public.atendimento_materiais am
    where am.atendimento_id = atendimentos.id
  )
);

drop policy if exists "atendimento_materiais_delete_sem_uso_autenticado" on public.atendimento_materiais;
create policy "atendimento_materiais_delete_sem_uso_autenticado"
on public.atendimento_materiais for delete
to authenticated
using (
  private.has_active_profile((select auth.uid()))
  and exists (
    select 1
    from public.atendimentos a
    where a.id = atendimento_materiais.atendimento_id
  )
);

comment on policy "atendimentos_delete_sem_material_autenticado" on public.atendimentos
  is 'Permite excluir atendimento MVP somente quando nao houver material vinculado, preservando movimentacoes de estoque.';
