-- =============================================================================
-- ECOPLANET / GRUPO SITSA — Reparación SAFE del sistema de autenticación
-- Ejecutar en Supabase SQL Editor (proyecto qymofbbwgbxkosuzqwpt o el tuyo).
-- Idempotente: se puede ejecutar más de una vez sin duplicar datos críticos.
-- =============================================================================

BEGIN;

-- 1) Dominios corporativos
INSERT INTO public.allowed_email_domains (domain, note)
VALUES
  ('grupo-sitsa.com', 'Dominio corporativo GRUPO SITSA'),
  ('sitsa.com', 'Dominio corporativo SITSA'),
  ('ecoplanet.com', 'Dominio corporativo ECOPLANET')
ON CONFLICT (domain) DO UPDATE SET note = EXCLUDED.note;

DELETE FROM public.allowed_email_domains
WHERE lower(trim(domain)) = 'grupo.sitsa.com';

-- 2) Perfiles faltantes desde auth.users
INSERT INTO public.profiles (id, full_name, email, active)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  u.email,
  true
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

-- 3) Activar perfiles y desbloquear usuarios (ban → login 400)
UPDATE public.profiles
SET active = true, disabled_at = NULL
WHERE active IS false OR disabled_at IS NOT NULL;

UPDATE auth.users
SET banned_until = NULL
WHERE banned_until IS NOT NULL;

-- 4) Roles faltantes → bodega por defecto
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'bodega'::public.app_role
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id);

-- 5) Administrador IT corporativo
DO $$
DECLARE
  target_id uuid;
BEGIN
  SELECT id INTO target_id
  FROM auth.users
  WHERE lower(trim(email)) = 'it@grupo-sitsa.com'
  LIMIT 1;

  IF target_id IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = target_id;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_id, 'administrador'::public.app_role);
  END IF;
END;
$$;

-- 6) Verificación rápida
SELECT
  u.email,
  u.email_confirmed_at IS NOT NULL AS email_confirmed,
  u.banned_until,
  p.active AS profile_active,
  (
    SELECT array_agg(ur.role::text ORDER BY ur.role)
    FROM public.user_roles ur
    WHERE ur.user_id = u.id
  ) AS roles,
  public.is_email_allowed(u.email) AS email_allowed
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at;

COMMIT;
