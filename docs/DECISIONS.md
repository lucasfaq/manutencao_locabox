# Decisoes de projeto

| Data | Decisao | Motivo |
|---|---|---|
| 2026-07-01 | Stack: Vite + React + TypeScript, Supabase, GitHub e GitHub Pages | Permite app web estatico, versionado e sem servidor proprio em producao |
| 2026-07-01 | Acesso a dados via `@supabase/supabase-js` direto do frontend | GitHub Pages nao executa backend |
| 2026-07-01 | MVP inicial publicado antes do modelo completo de autenticacao | Validar fluxo operacional e persistencia rapidamente |
| 2026-07-01 | RLS e Auth devem virar prioridade antes de ampliar o sistema | Sem backend proprio, a seguranca real precisa ficar no Supabase |
| 2026-07-01 | O prompt do Claude Code sera usado como direcao arquitetural, nao executado literalmente sobre o MVP atual | O prompt propoe uma reconstrucao greenfield e precisa ser adaptado incrementalmente |
| 2026-07-01 | Proximo passo tecnico sera Supabase Auth com perfis `tecnico` e `gestor` | Substituir escrita anonima por policies de usuario autenticado |

