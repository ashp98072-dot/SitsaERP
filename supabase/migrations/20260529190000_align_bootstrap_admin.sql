-- Alineación administrador bootstrap: it@grupo-sitsa.com / UID be4c2092-728f-4ebc-a291-d3841fd780f3

-- ---------------------------------------------------------------------------
-- Helper canónico (email + UID)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_bootstrap_admin(p_user_id uuid, p_email text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT p_user_id = 'be4c2092-728f-4ebc-a291-d3841fd780f3'::uuid
      OR lower(trim(COALESCE(p_email, ''))) = 'it@grupo-sitsa.com';
$$;

GRANT EXECUTE ON FUNCTION public.is_bootstrap_admin(uuid, text) TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- Post-login bootstrap: profile + rol (nunca bloquea Auth token)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_user_bootstrap()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  user_email text;
  user_meta jsonb;
  assigned_role public.app_role := 'bodega';
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Sesión requerida' USING ERRCODE = '42501';
  END IF;

  SELECT email, raw_user_meta_data
  INTO user_email, user_meta
  FROM auth.users
  WHERE id = uid;

  INSERT INTO public.profiles (id, full_name, email, active)
  VALUES (
    uid,
    COALESCE(user_meta->>'full_name', user_email, 'Usuario'),
    user_email,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    active = true,
    disabled_at = NULL;

  IF public.is_bootstrap_admin(uid, user_email) THEN
    DELETE FROM public.user_roles WHERE user_id = uid;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (uid, 'administrador'::public.app_role);
  ELSIF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = uid) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, assigned_role);
  END IF;

  RETURN jsonb_build_object(
    'user_id', uid,
    'email', user_email,
    'is_bootstrap_admin', public.is_bootstrap_admin(uid, user_email),
    'roles', (
      SELECT COALESCE(jsonb_agg(role::text ORDER BY role), '[]'::jsonb)
      FROM public.user_roles
      WHERE user_id = uid
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_bootstrap() TO authenticated;

-- ---------------------------------------------------------------------------
-- Signup: primer usuario / IT bootstrap → administrador
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_role public.app_role := 'bodega';
BEGIN
  INSERT INTO public.profiles (id, full_name, email, active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    active = true;

  IF public.is_bootstrap_admin(NEW.id, NEW.email) THEN
    DELETE FROM public.user_roles WHERE user_id = NEW.id;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'administrador');
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Limpieza huérfanos + bootstrap IT (idempotente, proyecto limpio)
-- ---------------------------------------------------------------------------
DELETE FROM public.user_roles ur
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = ur.user_id);

DELETE FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id);

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
    RAISE NOTICE 'Bootstrap admin UID no encontrado en auth.users — créalo en Supabase Auth primero.';
    RETURN;
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

  UPDATE auth.users SET banned_until = NULL WHERE id = admin_id;
END;
$$;

INSERT INTO public.allowed_email_domains (domain, note)
VALUES
  ('grupo-sitsa.com', 'Dominio corporativo GRUPO SITSA'),
  ('sitsa.com', 'Dominio corporativo SITSA'),
  ('ecoplanet.com', 'Dominio corporativo ECOPLANET')
ON CONFLICT (domain) DO UPDATE SET note = EXCLUDED.note;

DELETE FROM public.allowed_email_domains
WHERE lower(trim(domain)) = 'grupo.sitsa.com';
