import type { AppRole, UnitType } from "@/types";

export const UNIT_TYPES: readonly UnitType[] = ["lbs", "kg", "ton", "unidad"];

export const APP_ROLES = [
  "administrador",
  "bodega",
  "despacho",
  "supervisor",
] as const satisfies readonly AppRole[];

export const ROLE_LABELS: Record<AppRole, string> = {
  administrador: "Administrador",
  bodega: "Bodega",
  despacho: "Despacho",
  supervisor: "Supervisor",
};

/** Dominios corporativos autorizados (deben existir en `allowed_email_domains`). */
export const CORPORATE_EMAIL_DOMAINS = [
  "grupo-sitsa.com",
  "sitsa.com",
  "ecoplanet.com",
] as const;

export const DEFAULT_CORPORATE_EMAIL_DOMAIN = "grupo-sitsa.com";

/** Administrador principal / bootstrap IT (Supabase Auth). */
export const INITIAL_ADMIN_EMAIL = "it@grupo-sitsa.com";

/** UID fijo del administrador bootstrap en Supabase Auth. */
export const INITIAL_ADMIN_USER_ID = "be4c2092-728f-4ebc-a291-d3841fd780f3";

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function normalizeEmailDomain(input: string): string {
  return normalizeEmail(input).replace(/^@+/, "");
}

export function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export function extractEmailDomain(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at <= 0 || at === normalized.length - 1) return null;
  return normalized.slice(at + 1);
}

/** Usuario bootstrap IT: por UID (canónico) o por correo corporativo. */
export function isBootstrapAdminUser(
  userId: string | undefined | null,
  email: string | undefined | null,
): boolean {
  if (userId === INITIAL_ADMIN_USER_ID) return true;
  if (email && normalizeEmail(email) === INITIAL_ADMIN_EMAIL) return true;
  return false;
}

/** Fallback cliente si RPC allowlist no responde (NO sustituye política servidor en signup). */
export function isCorporateEmailLocally(email: string): boolean {
  const normalized = normalizeEmail(email);
  if (normalized === INITIAL_ADMIN_EMAIL) return true;
  const domain = extractEmailDomain(normalized);
  if (!domain) return false;
  return (CORPORATE_EMAIL_DOMAINS as readonly string[]).includes(domain);
}
