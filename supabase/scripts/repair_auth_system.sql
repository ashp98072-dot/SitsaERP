-- =============================================================================
-- ECOPLANET / GRUPO SITSA — Reparación SAFE auth (proyecto limpio)
-- Administrador bootstrap:
--   Email: it@grupo-sitsa.com
--   UID:   be4c2092-728f-4ebc-a291-d3841fd780f3
-- Idempotente — ejecutar en Supabase SQL Editor.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- A) Limpiar huérfanos (usuarios eliminados en Auth)
-- ---------------------------------------------------------------------------
DELETE FROM public.user_roles ur
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = ur.user_id);

DELETE FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id);

-- ---------------------------------------------------------------------------
-- B) Dominios corporativos + eliminar legacy
-- ---------------------------------------------------------------------------
INSERT INTO public.allowed_email_domains (domain, note)
VALUES
  ('grupo-sitsa.com', 'Dominio corporativo GRUPO SITSA'),
  ('sitsa.com', 'Dominio corporativo SITSA'),
  ('ecoplanet.com', 'Dominio corporativo ECOPLANET')
ON CONFLICT (domain) DO UPDATE SET note = EXCLUDED.note;

DELETE FROM public.allowed_email_domains
WHERE lower(trim(domain)) = 'grupo.sitsa.com';

-- ---------------------------------------------------------------------------
-- C) Bootstrap administrador IT (UID canónico)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  admin_id uuid := 'be4c2092-728f-4ebc-a291-d3841fd780f3';
  admin_email text;
  admin_meta jsonb;
BEGIN
  SELECT email, raw_user_meta_data INTO admin_email, admin_meta
  FROM auth.users
  WHERE id = admin_id;

  IF admin_email IS NULL THEN
    RAISE EXCEPTION 'UID % no existe en auth.users. Crea it@grupo-sitsa.com en Supabase Auth primero.', admin_id;
  END IF;

  IF lower(trim(admin_email)) <> 'it@grupo-sitsa.com' THEN
    RAISE WARNING 'UID % tiene email % (esperado it@grupo-sitsa.com)', admin_id, admin_email;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, active)
  VALUES (
    admin_id,
    COALESCE(admin_meta->>'full_name', 'IT Administrador', admin_email),
    admin_email,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    active = true,
    disabled_at = NULL;

  DELETE FROM public.user_roles WHERE user_id = admin_id;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_id, 'administrador'::public.app_role);

  UPDATE auth.users
  SET banned_until = NULL
  WHERE id = admin_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- D) Resto de usuarios Auth: profile + rol bodega si falta
-- ---------------------------------------------------------------------------
INSERT INTO public.profiles (id, full_name, email, active)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  u.email,
  true
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

UPDATE public.profiles
SET active = true, disabled_at = NULL
WHERE active IS NOT TRUE OR disabled_at IS NOT NULL;

UPDATE auth.users SET banned_until = NULL WHERE banned_until IS NOT NULL;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'bodega'::public.app_role
FROM auth.users u
WHERE u.id <> 'be4c2092-728f-4ebc-a291-d3841fd780f3'::uuid
  AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id);

-- ---------------------------------------------------------------------------
-- E) Verificación
-- ---------------------------------------------------------------------------
SELECT
  u.id,
  u.email,
  u.email_confirmed_at IS NOT NULL AS email_confirmed,
  u.banned_until,
  p.active AS profile_active,
  (
    SELECT array_agg(ur.role::text ORDER BY ur.role)
    FROM public.user_roles ur
    WHERE ur.user_id = u.id
  ) AS roles,
  public.is_email_allowed(u.email) AS email_allowed,
  (
    u.id = 'be4c2092-728f-4ebc-a291-d3841fd780f3'::uuid
    OR lower(trim(u.email)) = 'it@grupo-sitsa.com'
  ) AS is_bootstrap_admin
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at;

COMMIT;
