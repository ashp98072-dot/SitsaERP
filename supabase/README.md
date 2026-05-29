# Supabase — ECOPLANET ERP

**Project ID:** `qymofbbwgbxkosuzqwpt`  
**URL:** https://qymofbbwgbxkosuzqwpt.supabase.co

## Orden de migraciones (ejecutar en este orden)

| # | Archivo | Contenido |
|---|---------|-----------|
| 1 | `20260529131904_619b2c42-9922-489d-ab5a-66e15642c3ab.sql` | Esquema base (tablas, RLS inicial, inventario) |
| 2 | `20260529132745_access_domains.sql` | Dominios corporativos + `is_email_allowed` |
| 3 | `20260529140000_enterprise_hardening.sql` | RBAC, auditoría, RPCs transaccionales |

### Aplicar en proyecto nuevo

**SQL Editor** (recomendado): pegar y ejecutar cada archivo en orden.

**CLI:**

```bash
npx supabase link --project-ref qymofbbwgbxkosuzqwpt
npx supabase db push
```

## Acceso por correo

Solo se usa **`allowed_email_domains`** (sin tabla `allowed_emails`).

- UI: Administración → Acceso autorizado
- DB: trigger `enforce_email_allowlist_trg` en `auth.users`
- Cliente: RPC `is_email_allowed`

## Variables de entorno

Ver `.env.example`. En **Vercel** configurar:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (solo servidor, admin de usuarios)

## Regenerar tipos TypeScript

```bash
npx supabase gen types typescript --project-id qymofbbwgbxkosuzqwpt > src/integrations/supabase/types.ts
```
