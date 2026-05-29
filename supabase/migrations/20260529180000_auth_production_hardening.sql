-- Producción: auth desacoplado, bootstrap tolerante, grants completos.

GRANT EXECUTE ON FUNCTION public.is_email_allowed(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.access_list_configured() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.ensure_user_bootstrap() TO authenticated;

-- Bootstrap: nunca falla por perfil duplicado; IT siempre administrador si sin roles
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
  roles_count int;
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
    COALESCE(user_meta->>'full_name', user_email),
    user_email,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    active = true,
    disabled_at = NULL;

  SELECT COUNT(*)::int INTO roles_count FROM public.user_roles WHERE user_id = uid;

  IF roles_count = 0 THEN
    IF lower(trim(COALESCE(user_email, ''))) = 'it@grupo-sitsa.com' THEN
      assigned_role := 'administrador';
    END IF;
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, assigned_role);
  ELSIF lower(trim(COALESCE(user_email, ''))) = 'it@grupo-sitsa.com' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = uid AND role = 'administrador'::public.app_role
    ) THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'administrador');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'user_id', uid,
    'email', user_email,
    'roles', (
      SELECT COALESCE(jsonb_agg(role::text ORDER BY role), '[]'::jsonb)
      FROM public.user_roles
      WHERE user_id = uid
    )
  );
END;
$$;

-- Trigger signup: no bloquear si profile ya existe
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count int;
  assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    true
  )
  ON CONFLICT (id) DO NOTHING;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO user_count FROM auth.users;

  IF lower(trim(COALESCE(NEW.email, ''))) = 'it@grupo-sitsa.com' THEN
    assigned_role := 'administrador';
  ELSIF user_count <= 1 THEN
    assigned_role := 'administrador';
  ELSE
    assigned_role := 'bodega';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);

  RETURN NEW;
END;
$$;

-- Allowlist solo al CREAR usuario (nunca en login/token)
CREATE OR REPLACE FUNCTION public.enforce_email_allowlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.access_list_configured() AND NOT public.is_email_allowed(NEW.email) THEN
    RAISE EXCEPTION 'Tu cuenta no está autorizada para ingresar al sistema.'
      USING ERRCODE = '28000';
  END IF;

  RETURN NEW;
END;
$$;
