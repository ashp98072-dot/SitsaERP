-- Corporate email allowlist (domains only). Runs after base schema.

CREATE TABLE IF NOT EXISTS public.allowed_email_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL UNIQUE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.allowed_email_domains TO authenticated;
GRANT ALL ON public.allowed_email_domains TO service_role;

ALTER TABLE public.allowed_email_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS domains_select ON public.allowed_email_domains;
DROP POLICY IF EXISTS domains_admin_all ON public.allowed_email_domains;

CREATE POLICY domains_select ON public.allowed_email_domains
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid()));

CREATE POLICY domains_admin_all ON public.allowed_email_domains
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'::public.app_role));

-- Profile active flag
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS disabled_at timestamptz;

-- Validación por dominio (complementada con allowed_emails en migración híbrida)
CREATE OR REPLACE FUNCTION public.is_email_allowed(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.allowed_email_domains d
    WHERE lower(trim(split_part(lower(trim(_email)), '@', 2))) = lower(trim(d.domain))
  );
$$;

CREATE OR REPLACE FUNCTION public.access_list_configured()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.allowed_email_domains);
$$;

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

DROP TRIGGER IF EXISTS enforce_email_allowlist_trg ON auth.users;
CREATE TRIGGER enforce_email_allowlist_trg
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_email_allowlist();

INSERT INTO public.allowed_email_domains (domain, note)
VALUES
  ('grupo-sitsa.com', 'Dominio corporativo GRUPO SITSA (@grupo-sitsa.com)'),
  ('sitsa.com', 'Dominio corporativo SITSA'),
  ('ecoplanet.com', 'Dominio corporativo ECOPLANET')
ON CONFLICT (domain) DO NOTHING;
