# Manutencao Locabox

Aplicacao web para controle dinamico de manutencao da Locabox.

## Stack

- React + Vite
- API Node/Express
- Supabase/Postgres como banco principal
- JSON local como fallback de desenvolvimento

## Rodar local

```powershell
npm install
npm run dev
```

Frontend:

```text
http://127.0.0.1:5174
```

API:

```text
http://127.0.0.1:4174/api/health
```

## Supabase

Configure um `.env` com:

```text
SUPABASE_URL=https://nyroltiqmkvxcujxapzf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
PORT=4174
```

Sem essas variaveis, a API usa `data/store.json`.

Migrations:

```text
supabase/migrations/20260701110000_initial_schema.sql
```

Seed:

```text
supabase/seed.sql
```

## GitHub

Repositorio alvo:

```text
manutencao_locabox
```
