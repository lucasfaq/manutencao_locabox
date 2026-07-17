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

Para o GitHub Pages conectar direto no Supabase, configure no repositorio:

```text
Settings > Secrets and variables > Actions
Variables:
  VITE_SUPABASE_URL=https://nyroltiqmkvxcujxapzf.supabase.co

Secrets:
  VITE_SUPABASE_ANON_KEY=...
```

Migrations:

```text
supabase/migrations/20260701110000_initial_schema.sql
supabase/migrations/20260702120000_auth_perfis_rls.sql
supabase/migrations/20260702150000_core_schema_rules_rls.sql
```

Seed:

```text
supabase/seed.sql
```

### Auth e perfis

Quando `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estiverem configurados, o app exige login por Supabase Auth.

Perfis operacionais:

```text
tecnico: leitura operacional, criacao de OS/atendimento e baixa via atendimento
gestor: CRUD de cadastros, estoque, perfis, OS e relatorios
```

Para promover um usuario a gestor:

```sql
update public.perfis
set perfil = 'gestor'
where id = '<auth-user-id>';
```

### Schema canonico

A Fase 1 canonica adiciona as tabelas do fluxo Contratos -> Projetos -> Unidades -> OS -> Atendimentos, com status por catalogo, triggers de status derivado, estoque por movimentacoes e RLS por perfil.

As tabelas MVP antigas (`unidades`, `ordens`, `atendimentos`, `estoque`) permanecem temporariamente para compatibilidade do frontend atual. A Fase 2 deve migrar as telas de cadastros para as tabelas canonicas.

Cadastros canonicos ja migrados no frontend: `clientes`, `empresas` e `contratos`, restritos a gestores e com inativacao logica.

## GitHub

Repositorio alvo:

```text
manutencao_locabox
```
