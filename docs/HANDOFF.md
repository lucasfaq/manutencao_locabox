# Handoff - Manutencao Locabox

Atualizado em: 2026-07-19

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
  - CRUD de `contratos` implementado no frontend;
  - CRUD de `projetos` implementado no frontend;
  - tela de unidades migrada para `unidades_instaladas`;
  - CRUD de `colaboradores` e `terceirizados` reunido na tela Pessoas;
  - administracao de usuarios Auth implementada na tela Usuarios;
  - Edge Function `admin-users` implantada para operacoes privilegiadas;
  - tela Estoque migrada para `estoque_materiais`;
  - menu de Clientes visivel apenas para gestor;
  - menu de Empresas visivel apenas para gestor;
  - criacao/edicao de cliente usando `public.clientes`;
  - criacao/edicao de empresa usando `public.empresas`;
  - contratos vinculados aos cadastros canonicos de clientes e empresas;
  - projetos vinculados aos contratos canonicos;
  - unidades vinculadas aos projetos e ao catalogo `status_unidade`;
  - pessoas operacionais mantidas em tabelas separadas, com soft-delete;
  - gestor pode criar conta, alterar email, perfil, vinculo, status e senha temporaria;
  - usuario autenticado pode alterar a propria senha;
  - cadastro de materiais usa estoque minimo e saldo derivado por movimentacoes;
  - catalogo de pendencias padrao gerenciavel por gestor;
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
3. Contratos - concluido.
4. Projetos - concluido.
5. Unidades instaladas - concluido.
6. Colaboradores e terceirizados - concluido.
7. Materiais/estoque - cadastro concluido; movimentacoes pendentes.
8. Catalogo de pendencias - concluido.
9. OS e Atendimentos canonicos, incluindo composicao de Equipes - proximo.

## Como retomar no Codex

Ao iniciar uma nova sessao, pedir:

```text
Leia apps/manutencao-web/docs/HANDOFF.md e retome o projeto manutencao_locabox a partir do proximo passo recomendado.
```

Se quiser continuar pela Fase 2:

```text
Leia o handoff e continue a Fase 2 de cadastros base, implementando Empresas, usando o schema canonico e sem antecipar Contratos.
```
# Planejamento de estoque — 2026-07-17

- Parametros globais: nivel de servico, janela historica, lead time, desvio do lead time, periodo de revisao e minimo de observacoes.
- Excecoes por material: nivel de servico, janela, lead time, desvio, revisao, lote minimo, multiplo de compra e criticidade.
- Indicadores: consumo medio, desvio, estoque de seguranca, ponto de ressuprimento, estoque-alvo, cobertura, sugestao e situacao.
- Fonte da demanda: somente movimentacoes canonicas do tipo `saida`; ajustes e entradas nao compoem consumo.
- A sugestao nao cria pedido automaticamente.

# Catalogo de pendencias — 2026-07-19

- Gestor pode criar, editar, inativar e reativar registros de `public.pendencias_padrao`.
- Tecnico continua sem acesso ao menu de cadastros e usa apenas pendencias ativas na criacao de OS.
- Proximo passo recomendado: migrar OS e Atendimentos para o fluxo canonico completo, incluindo composicao de equipes por atendimento.

# Atendimentos e materiais — 2026-07-19

- Tela de Atendimentos deixou de usar campo livre "um material por linha".
- Materiais agora sao lancados em linhas estruturadas com material do estoque, quantidade, tipo de uso e observacao.
- Tipos de uso suportados: consumo, emprestimo de ferramenta/equipamento e perda ou avaria.
- Criada RPC `public.registrar_atendimento_com_materiais(...)` para registrar atendimento MVP e saidas canonicas de estoque em transacao unica.
- Cada linha de material gera uma movimentacao de tipo `saida` em `public.movimentacoes` e `public.movimentacoes_estoque`.
- Proximo refinamento recomendado: separar formalmente materiais consumiveis, ferramentas/equipamentos retornaveis e bens avariados em schema proprio, com controle de devolucao para emprestimos.

# Retomada CRUD e permissoes — 2026-07-20

## Resumo do problema

O usuario reportou que o CRUD do sistema nao esta funcionando, incluindo falha ao excluir OS. A analise indicou que a causa provavel nao e apenas frontend: o app usa uma mistura de tabelas MVP antigas (`ordens`, `atendimentos`, `pendencias_ordem`, etc.) e tabelas canonicas (`clientes`, `empresas`, `contratos`, `unidades_instaladas`, etc.), enquanto as policies/RLS do Supabase estao restritivas e divergentes entre esses grupos.

## Commits recentes relevantes

- `8253df2` - adiciona testes de logica e seed demo.
- `64a9924` - permite excluir OS sem uso de estoque.
- `698cf67` - torna exclusao de OS mais compativel com RLS existente.
- `9ab2134` - cria migracao consolidada de permissoes CRUD do app.
- `514aeaa` - commit vazio para retry de deploy.
- `c30da81` - ajusta concorrencia do workflow Pages para cancelar deploys anteriores.

## Arquivos/mudancas importantes

- `src/maintenanceLogic.ts` e `src/maintenanceLogic.test.ts`
  - Cobrem metricas, status de pendencias, bloqueios de exclusao e responsaveis.
- `supabase/seed.sql`
  - Foi convertido para seed destrutivo de teste/demo com um unico fluxo operacional.
  - Nao foi aplicado no banco remoto por seguranca.
- `supabase/migrations/20260720012000_app_crud_permissions.sql`
  - Principal pendencia para restaurar CRUD.
  - Concede acesso e cria policies `app_active_manage_*` para usuario autenticado com perfil ativo.
  - Abrange tabelas MVP e canonicas usadas pelo frontend.
- `src/supabaseClient.ts`
  - Removeu exclusao direta de `atendimento_pendencias` em alguns fluxos para depender de cascade, reduzindo conflito de RLS.

## Validacoes feitas

- `npm run test`: passou.
- `npm run build`: passou.
- Build do GitHub Actions tambem passou nos runs recentes.
- Deploy do GitHub Pages falhou no job `deploy`, nao no job `build`.

## Situacao do deploy

Ultimo commit local/remoto: `c30da81`.

Runs relevantes:

- `29710323050` (`698cf67`) - deploy success.
- `29710475499` (`9ab2134`) - build success, deploy failure.
- `29710505436` (`514aeaa`) - build success, deploy failure.
- `29710555593` (`c30da81`) - build success, deploy failure.

Nao foi possivel baixar os logs detalhados do job de deploy via API publica, pois a API retornou `403 Must have admin rights to Repository`. A causa exata do deploy failure precisa ser conferida no GitHub Actions pela conta com permissao no repositorio.

## Situacao do Supabase

- Nao ha Supabase CLI disponivel localmente.
- Nao ha `.env` real no workspace, apenas `.env.example`.
- A migracao `20260720012000_app_crud_permissions.sql` ainda precisa ser aplicada manualmente no Supabase remoto.
- Sem aplicar essa migracao, o frontend pode continuar exibindo falhas de CRUD por RLS/permissao mesmo que o site esteja publicado.

## Proximo passo recomendado

1. Abrir o run mais recente do GitHub Actions e verificar o log do job `deploy`:
   - https://github.com/lucasfaq/manutencao_locabox/actions/runs/29710555593
2. Corrigir a causa do deploy Pages, se for configuracao/permissao do GitHub Pages.
3. Aplicar no Supabase remoto a migracao:
   - `apps/manutencao-web/supabase/migrations/20260720012000_app_crud_permissions.sql`
4. Confirmar que o usuario logado possui perfil ativo em `public.perfis`.
5. Testar CRUD minimo no app publicado:
   - criar/editar/inativar cliente;
   - criar/editar OS;
   - excluir OS sem material;
   - criar/editar/excluir atendimento sem material;
   - tentar excluir atendimento/OS com material e confirmar bloqueio correto.

## Observacao sobre worktree

Ao encerrar esta etapa, havia arquivos locais nao relacionados ao escopo que nao devem ser revertidos sem confirmacao:

- `server/index.ts`
- `server/index 2.ts`
- `data/store(1).json`
- `public/bootstrap(1).json`
- `supabase/seed(1).sql`

## Prompt para retomar

```text
Leia apps/manutencao-web/docs/HANDOFF.md e retome a partir da secao "Retomada CRUD e permissoes — 2026-07-20". Primeiro verifique o deploy do GitHub Pages, depois aplique/valide a migracao de permissoes CRUD no Supabase remoto.
```
