# Handoff - Manutencao Locabox

Atualizado em: 2026-07-02

## Objetivo

Evoluir o controle de manutencao legado em MS Access para um sistema web responsivo, publicado no GitHub Pages e persistindo dados no Supabase.

## Repositorio e ambientes

- Repositorio GitHub: https://github.com/lucasfaq/manutencao_locabox
- GitHub Pages: https://lucasfaq.github.io/manutencao_locabox/
- App local: `apps/manutencao-web`
- Supabase project ref: `nyroltiqmkvxcujxapzf`
- Supabase URL: `https://nyroltiqmkvxcujxapzf.supabase.co`

## Estado atual implementado

- Frontend em Vite + React + TypeScript.
- Deploy automatico por GitHub Actions para GitHub Pages.
- Integracao com Supabase via `@supabase/supabase-js` direto no frontend.
- Leitura e criacao de OS funcionando no Supabase.
- Painel com paginas de OS, unidades, atendimentos, estoque e relatorios simples.
- Indicador visual da origem dos dados: Supabase, API local ou JSON estatico.
- Banner de erro quando a persistencia no Supabase falha.
- Correcoes publicadas:
  - `bbb4563` - mostra erro de persistencia e evita falsa gravacao local.
  - `3bf9c8d` - corrige `reset()` assíncrono do formulario.
- Fase 1 de seguranca iniciada em 2026-07-02:
  - tela de login com Supabase Auth;
  - tabela `perfis` com perfis `tecnico` e `gestor`;
  - schema `private` para funcoes auxiliares de RLS;
  - remocao das policies anonimas;
  - policies `authenticated` com usuario ativo em `perfis`;
  - usuario `lucasft@gmail.com` criado e promovido a `gestor`;
  - schema canonico da Fase 1 aplicado com cadastros base, OS, atendimentos, equipes, movimentacoes e relatorios;
  - triggers de status derivado, pendencias de atendimento e estoque por movimentacoes;
  - advisors de seguranca sem alertas de SQL/RLS, restando apenas configuracao de dashboard de senha vazada.
- Fase 2 iniciada em 2026-07-02:
  - CRUD de `clientes` implementado no frontend;
  - CRUD de `empresas` implementado no frontend;
  - menu de Clientes visivel apenas para gestor;
  - menu de Empresas visivel apenas para gestor;
  - criacao/edicao de cliente usando `public.clientes`;
  - criacao/edicao de empresa usando `public.empresas`;
  - inativacao/reativacao por soft-delete via `ativo`;
  - tecnico permanece bloqueado para escrita por RLS.

## Schema atual

Migration inicial em `supabase/migrations/20260701110000_initial_schema.sql` com:

- `unidades`
- `ordens`
- `pendencias_ordem`
- `atendimentos`
- `atendimento_materiais`
- `estoque`

Observacao: este schema e um MVP funcional. Ainda nao e o modelo final seguro com autenticacao, perfis e RLS por usuario.

Migration de seguranca em `supabase/migrations/20260702120000_auth_perfis_rls.sql` com:

- enum `perfil_usuario`;
- tabela `perfis`;
- trigger de criacao de perfil tecnico para novos usuarios Auth;
- funcoes privadas `has_active_profile()` e `is_gestor()`;
- policies somente para `authenticated`;
- bloqueio de `anon` nas tabelas e sequences publicas do app.

Migration canonica em `supabase/migrations/20260702150000_core_schema_rules_rls.sql` com:

- `clientes`, `empresas`, `contratos`, `projetos`, `unidades_instaladas`;
- `colaboradores`, `terceirizados`, `equipes`;
- `estoque_materiais`, `movimentacoes`, `movimentacoes_estoque`;
- `pendencias_padrao`, `ordens_manutencao`, `pendencias_ordem_manutencao`;
- `atendimentos_ordens`, `atendimentos_executados`;
- catalogos `status_*` e `tipos_movimentacao`;
- funcao `public.criar_ordem_manutencao(...)`;
- view `public.vw_atendimentos_por_projeto` restrita a gestor.

Observacao: as tabelas MVP antigas permanecem para compatibilidade do frontend atual. A Fase 2 deve migrar as telas para o schema canonico.

## Pontos validados

- GitHub Pages esta servindo o build mais recente.
- Build de producao passa com `GITHUB_PAGES=true npm run build`.
- A anon key publicada consegue ler dados.
- Teste controlado de INSERT em `ordens` chegou ao banco e falhou por FK proposital, nao por RLS/permissao.
- Usuario testou criacao de OS e confirmou funcionamento.

## Prompt analisado do Claude Code

O prompt recebido define uma arquitetura final mais robusta:

- Supabase Auth com e-mail/senha.
- Perfis `tecnico` e `gestor`.
- RLS por usuario autenticado.
- Schema completo com contratos, projetos, unidades, equipes, materiais e movimentacoes.
- Status derivados por triggers.
- Estoque controlado por movimentacoes.
- Relatorios restritos a gestor.

Avaliacao: o prompt esta correto como direcao, mas deve ser aplicado de forma incremental. Ele e mais "greenfield" que o MVP atual e mudaria o schema de forma estrutural.

## Validacao de 2026-07-02

- Build local passou com `npm run build`.
- SQL aplicado no Supabase remoto.
- `anon` bloqueado para leitura das tabelas operacionais.
- Login REST e leitura de `public.perfis(id, perfil, ativo)` validados para `lucasft@gmail.com`.
- Fluxo canonico testado em transacao com rollback: gestor cria cadastros, OS com pendencia, atendimento carrega pendencia automaticamente.
- Contrato inativo bloqueia criacao de OS por trigger.
- Tecnico nao consegue criar cadastro base por RLS.
- Build local passou com `npm run build`.
- Security advisor mostra apenas `auth_leaked_password_protection`, que exige ajuste manual no dashboard do Supabase Auth.
- Performance advisor mostra indices nao usados em base pequena; FKs obrigatorias do prompt foram indexadas.

## Proximo passo recomendado

Continuar Fase 2 - Cadastros base, migrando o frontend para o schema canonico nesta ordem:

1. Clientes - concluido.
2. Empresas - concluido.
3. Contratos - proximo.
4. Projetos.
5. Unidades instaladas.
6. Colaboradores e terceirizados.
7. Equipes.
8. Materiais/estoque.
9. Catalogo de pendencias.

## Como retomar no Codex

Ao iniciar uma nova sessao, pedir:

```text
Leia apps/manutencao-web/docs/HANDOFF.md e retome o projeto manutencao_locabox a partir do proximo passo recomendado.
```

Se quiser continuar pela Fase 2:

```text
Leia o handoff e continue a Fase 2 de cadastros base, implementando Empresas, usando o schema canonico e sem antecipar Contratos.
```
