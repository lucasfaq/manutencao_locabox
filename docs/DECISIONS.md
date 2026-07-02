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
