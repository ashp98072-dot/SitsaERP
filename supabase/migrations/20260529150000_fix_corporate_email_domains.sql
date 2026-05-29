-- Corrige dominio legacy grupo.sitsa.com → grupo-sitsa.com (correos reales @grupo-sitsa.com)

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

DELETE FROM public.allowed_email_domains
WHERE lower(trim(domain)) = 'grupo.sitsa.com';

INSERT INTO public.allowed_email_domains (domain, note)
VALUES
  ('grupo-sitsa.com', 'Dominio corporativo GRUPO SITSA (@grupo-sitsa.com)'),
  ('sitsa.com', 'Dominio corporativo SITSA'),
  ('ecoplanet.com', 'Dominio corporativo ECOPLANET')
ON CONFLICT (domain) DO UPDATE
SET note = EXCLUDED.note;
