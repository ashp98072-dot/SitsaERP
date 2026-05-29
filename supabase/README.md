# Supabase — ECOPLANET ERP

**Project ID:** `qymofbbwgbxkosuzqwpt`  
**URL:** https://qymofbbwgbxkosuzqwpt.supabase.co

## Orden de migraciones (ejecutar en este orden)

| # | Archivo | Contenido |
|---|---------|-----------|
| 1 | `20260529131904_619b2c42-9922-489d-ab5a-66e15642c3ab.sql` | Esquema base (tablas, RLS inicial, inventario) |
| 2 | `20260529132745_access_domains.sql` | Dominios corporativos + `is_email_allowed` |
| 3 | `20260529140000_enterprise_hardening.sql` | RBAC, auditoría, RPCs transaccionales |
| 4 | `20260529150000_fix_corporate_email_domains.sql` | Dominio `grupo-sitsa.com` (corrige legacy) |
| 5 | `20260529160000_hybrid_access_allowlist.sql` | `allowed_emails` + validación híbrida + admin IT |
| 6 | `20260529170000_auth_bootstrap_repair.sql` | `ensure_user_bootstrap`, grants RPC, auth repair |
| 7 | `20260529180000_auth_production_hardening.sql` | Auth producción: bootstrap tolerante, IT admin |

### Diagnóstico login (400 /token)

1. Abre `/debug/auth` en la app (muestra env, health, probe raw Supabase).
2. Activa `VITE_AUTH_DEBUG=true` en Vercel y redeploy.
3. Ejecuta `supabase/scripts/repair_auth_system.sql` si faltan roles o hay ban.

### Reparación manual (login 400 / perfiles / roles)

Ejecutar `supabase/scripts/repair_auth_system.sql` en SQL Editor si un usuario existe en Auth pero no puede entrar.

### Aplicar en proyecto nuevo

**SQL Editor** (recomendado): pegar y ejecutar cada archivo en orden.

**CLI:**

```bash
npx supabase link --project-ref qymofbbwgbxkosuzqwpt
npx supabase db push
```

## Acceso por correo

**Validación híbrida** (`is_email_allowed`):

1. Dominio en `allowed_email_domains` (corporativo automático), **o**
2. Correo exacto en `allowed_emails` (excepción manual administrada)

Dominios corporativos por defecto: `grupo-sitsa.com`, `sitsa.com`, `ecoplanet.com`.

Administrador inicial: `it@grupo-sitsa.com` (rol `administrador` al registrarse).

- UI: Administración → Acceso autorizado (dominios + excepciones)
- DB: trigger `enforce_email_allowlist_trg` en `auth.users`
- Cliente: RPC `is_email_allowed`
- Sin registro público: usuarios creados solo por administradores

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
