# Decisoes de projeto

| Data | Decisao | Motivo |
|---|---|---|
| 2026-07-01 | Stack: Vite + React + TypeScript, Supabase, GitHub e GitHub Pages | Permite app web estatico, versionado e sem servidor proprio em producao |
| 2026-07-01 | Acesso a dados via `@supabase/supabase-js` direto do frontend | GitHub Pages nao executa backend |
| 2026-07-01 | MVP inicial publicado antes do modelo completo de autenticacao | Validar fluxo operacional e persistencia rapidamente |
| 2026-07-01 | RLS e Auth devem virar prioridade antes de ampliar o sistema | Sem backend proprio, a seguranca real precisa ficar no Supabase |
| 2026-07-01 | O prompt do Claude Code sera usado como direcao arquitetural, nao executado literalmente sobre o MVP atual | O prompt propoe uma reconstrucao greenfield e precisa ser adaptado incrementalmente |
| 2026-07-01 | Proximo passo tecnico sera Supabase Auth com perfis `tecnico` e `gestor` | Substituir escrita anonima por policies de usuario autenticado |
| 2026-07-02 | O app exige login quando o Supabase estiver configurado | O GitHub Pages acessa o banco direto pelo cliente; sem sessao, nao deve haver leitura ou escrita operacional |
| 2026-07-02 | Perfis ficam em `public.perfis`, mas funcoes auxiliares de autorizacao ficam no schema `private` | Evita expor funcoes `security definer` pela API publica e deixa os advisors de seguranca limpos |
| 2026-07-02 | Usuarios autenticados e ativos podem ler e operar OS/atendimentos; gestor fica reservado para manutencao de cadastros e estoque | Modelo incremental compativel com a operacao atual, sem bloquear tecnico na criacao de OS |
| 2026-07-02 | `public.perfis` passa a usar `id` como FK para `auth.users(id)` | Alinha o schema canonico ao prompt da Fase 1 e simplifica as policies |
| 2026-07-02 | As tabelas MVP antigas permanecem enquanto o frontend migra para o schema canonico | Evita quebrar o GitHub Pages antes da Fase 2 substituir as telas pelos cadastros novos |
| 2026-07-02 | Criacao de OS canonica deve usar a funcao `public.criar_ordem_manutencao(...)` | Garante insercao atomica da OS com pendencias selecionadas do catalogo |
| 2026-07-02 | A view `vw_atendimentos_por_projeto` usa `security_invoker` e filtro de gestor | Relatorios sao restritos a gestor e continuam respeitando RLS nas tabelas base |
| 2026-07-02 | Fase 2 deve migrar um cadastro por commit, comecando por `clientes` | Mantem rastreabilidade e evita misturar dependencias de cadastros base |
| 2026-07-02 | Exclusao de cliente no app sera soft-delete via `ativo`, sem DELETE fisico | Preserva historico e segue a regra de entidades operacionais com `RESTRICT` |
| 2026-07-17 | Cadastro de empresas segue o ciclo governado de clientes, com inativacao logica e sem DELETE | Preserva referencias futuras de contratos e mantem cada cadastro da Fase 2 em commit isolado |
| 2026-07-17 | Contratos sao editados pelo gestor e vinculados obrigatoriamente a cliente e empresa canonicos | Mantem integridade referencial e prepara a hierarquia Contrato -> Projeto -> Unidade |
| 2026-07-17 | Projetos pertencem obrigatoriamente a um contrato canonico | Preserva a hierarquia operacional usada por unidades, OS e relatorios |
| 2026-07-17 | Unidades instaladas substituem a listagem legada na tela de Unidades; leitura e operacional, escrita e de gestor | Migra a interface sem retirar dos tecnicos a visibilidade necessaria para OS e atendimentos |
| 2026-07-17 | Colaboradores e terceirizados compartilham a tela Pessoas, mas permanecem em tabelas e formularios distintos | Evita misturar vinculos internos e externos e prepara a composicao de equipes |
