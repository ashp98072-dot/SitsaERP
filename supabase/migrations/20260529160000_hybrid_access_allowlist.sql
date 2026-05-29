-- Acceso híbrido: dominios corporativos OR correos externos autorizados manualmente.

-- ---------------------------------------------------------------------------
-- Tabla de excepciones por correo individual
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.allowed_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT allowed_emails_email_lowercase CHECK (email = lower(trim(email))),
  CONSTRAINT allowed_emails_email_format CHECK (email ~* '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$'),
  CONSTRAINT allowed_emails_email_unique UNIQUE (email)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.allowed_emails TO authenticated;
GRANT ALL ON public.allowed_emails TO service_role;

ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS emails_select ON public.allowed_emails;
DROP POLICY IF EXISTS emails_admin_all ON public.allowed_emails;

CREATE POLICY emails_select ON public.allowed_emails
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid()));

CREATE POLICY emails_admin_all ON public.allowed_emails
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'::public.app_role));

-- ---------------------------------------------------------------------------
-- Validación híbrida
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_email_allowed(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT EXISTS (
        SELECT 1
        FROM public.allowed_email_domains d
        WHERE lower(trim(split_part(lower(trim(_email)), '@', 2))) = lower(trim(d.domain))
      )
      OR EXISTS (
        SELECT 1
        FROM public.allowed_emails e
        WHERE lower(trim(e.email)) = lower(trim(_email))
      )
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.access_list_configured()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.allowed_email_domains)
      OR EXISTS (SELECT 1 FROM public.allowed_emails);
$$;

-- ---------------------------------------------------------------------------
-- Rol del usuario inicial IT
-- ---------------------------------------------------------------------------
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
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);

  SELECT COUNT(*) INTO user_count FROM auth.users;

  IF lower(trim(COALESCE(NEW.email, ''))) = 'it@grupo-sitsa.com' THEN
    assigned_role := 'administrador';
  ELSIF user_count = 1 THEN
    assigned_role := 'administrador';
  ELSE
    assigned_role := 'bodega';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);

  RETURN NEW;
END;
$$;

-- Asegurar administrador para IT corporativo (usuarios ya existentes)
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

-- Auditoría en cambios de excepciones de correo
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'allowed_emails'
  )
  AND EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'audit_row_change'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS audit_allowed_emails ON public.allowed_emails';
    EXECUTE '
      CREATE TRIGGER audit_allowed_emails
      AFTER UPDATE OR DELETE ON public.allowed_emails
      FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()';
  END IF;
END;
$$;
