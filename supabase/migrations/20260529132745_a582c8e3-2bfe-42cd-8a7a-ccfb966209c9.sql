
-- Allowed domains
CREATE TABLE public.allowed_email_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL UNIQUE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.allowed_email_domains TO authenticated;
GRANT ALL ON public.allowed_email_domains TO service_role;
ALTER TABLE public.allowed_email_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY domains_select ON public.allowed_email_domains FOR SELECT TO authenticated USING (has_any_role(auth.uid()));
CREATE POLICY domains_admin_all ON public.allowed_email_domains FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- Allowed emails whitelist
CREATE TABLE public.allowed_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.allowed_emails TO authenticated;
GRANT ALL ON public.allowed_emails TO service_role;
ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY emails_select ON public.allowed_emails FOR SELECT TO authenticated USING (has_any_role(auth.uid()));
CREATE POLICY emails_admin_all ON public.allowed_emails FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- Profile active flag
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS disabled_at timestamptz;

-- Validation function
CREATE OR REPLACE FUNCTION public.is_email_allowed(_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.allowed_emails WHERE lower(email) = lower(_email))
    OR EXISTS (
      SELECT 1 FROM public.allowed_email_domains
      WHERE lower(_email) LIKE '%@' || lower(domain)
    );
$$;

-- Bootstrap allowance: if no domains/emails configured, allow everything (first admin setup).
CREATE OR REPLACE FUNCTION public.access_list_configured()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.allowed_email_domains)
      OR EXISTS(SELECT 1 FROM public.allowed_emails);
$$;

-- Block unauthorized signups via trigger on auth.users
CREATE OR REPLACE FUNCTION public.enforce_email_allowlist()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL THEN RETURN NEW; END IF;
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
  FOR EACH ROW EXECUTE FUNCTION public.enforce_email_allowlist();

-- Seed allowed domains
INSERT INTO public.allowed_email_domains (domain, note) VALUES
  ('grupo.sitsa.com', 'Dominio corporativo GRUPO SITSA'),
  ('sitsa.com', 'Dominio corporativo SITSA'),
  ('ecoplanet.com', 'Dominio corporativo ECOPLANET')
ON CONFLICT (domain) DO NOTHING;
