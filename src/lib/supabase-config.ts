import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-env";

export type SupabaseKeyRole = "anon" | "service_role" | "unknown" | "non_jwt";

export type SupabaseEnvValidation = {
  ok: boolean;
  issues: string[];
  url?: string;
  urlProjectRef?: string;
  keyRole: SupabaseKeyRole;
  keyProjectRef?: string;
  keyIssuer?: string;
  projectMatch: boolean;
};

const STORAGE_KEY = "ecoplanet.supabase.auth";

export function getSupabaseStorageKey(): string {
  return STORAGE_KEY;
}

export function extractProjectRefFromUrl(url: string): string | undefined {
  const match = url.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co/i);
  return match?.[1];
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function analyzeSupabaseAnonKey(key: string | undefined): {
  role: SupabaseKeyRole;
  projectRef?: string;
  issuer?: string;
} {
  if (!key?.trim()) return { role: "unknown" };

  if (key.startsWith("sb_publishable_") || key.startsWith("sb_")) {
    return { role: "anon", projectRef: undefined };
  }

  const payload = decodeJwtPayload(key);
  if (!payload) return { role: "non_jwt" };

  const role =
    payload.role === "anon"
      ? "anon"
      : payload.role === "service_role"
        ? "service_role"
        : "unknown";

  const ref = typeof payload.ref === "string" ? payload.ref : undefined;
  const iss = typeof payload.iss === "string" ? payload.iss : undefined;
  const issuerRef = iss?.match(/supabase\.co\/auth\/v1(?:\/([^/]+))?/)?.[1];

  return {
    role,
    projectRef: ref ?? issuerRef,
    issuer: iss,
  };
}

export function validateSupabaseEnvironment(): SupabaseEnvValidation {
  const issues: string[] = [];
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url) issues.push("Falta VITE_SUPABASE_URL (o SUPABASE_URL en servidor).");
  if (!key) issues.push("Falta VITE_SUPABASE_ANON_KEY (usa la clave anon/public, NO service_role).");

  if (url && !url.includes(".supabase.co")) {
    issues.push(`VITE_SUPABASE_URL no parece un host Supabase válido: ${url}`);
  }

  const urlProjectRef = url ? extractProjectRefFromUrl(url) : undefined;
  const keyInfo = analyzeSupabaseAnonKey(key);
  const keyProjectRef = keyInfo.projectRef;

  if (keyInfo.role === "service_role") {
    issues.push(
      "VITE_SUPABASE_ANON_KEY tiene role service_role. El frontend debe usar la anon key.",
    );
  }

  if (keyInfo.role === "non_jwt") {
    issues.push(
      "La anon key no es JWT reconocible. Verifica que copiaste la clave anon/public del proyecto correcto.",
    );
  }

  const projectMatch =
    !urlProjectRef || !keyProjectRef ? true : urlProjectRef === keyProjectRef;

  if (!projectMatch) {
    issues.push(
      `Proyecto cruzado: URL ref=${urlProjectRef} pero JWT ref=${keyProjectRef}.`,
    );
  }

  const ok = issues.length === 0;

  return {
    ok,
    issues,
    url,
    urlProjectRef,
    keyRole: keyInfo.role,
    keyProjectRef,
    keyIssuer: keyInfo.issuer,
    projectMatch,
  };
}

export function maskSecret(value: string | undefined, visible = 8): string {
  if (!value) return "(vacío)";
  if (value.length <= visible * 2) return `${value.slice(0, 3)}…`;
  return `${value.slice(0, visible)}…${value.slice(-visible)}`;
}

export function logSupabaseEnvValidation(): void {
  const result = validateSupabaseEnvironment();
  if (result.ok) {
    console.info("[supabase:env] OK", {
      url: result.url,
      projectRef: result.urlProjectRef,
      keyRole: result.keyRole,
      keyProjectRef: result.keyProjectRef,
    });
    return;
  }
  console.error("[supabase:env] INVALID", result);
}
