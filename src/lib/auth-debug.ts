import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-env";
import {
  analyzeSupabaseAnonKey,
  extractProjectRefFromUrl,
  maskSecret,
  validateSupabaseEnvironment,
} from "@/lib/supabase-config";
import { isAuthDebugEnabled, serializeAuthError } from "@/lib/auth-errors";
// isAuthDebugEnabled lives in auth-errors to avoid circular imports

export type AuthHealthCheck = {
  ok: boolean;
  status: number;
  body: unknown;
  latencyMs: number;
};

export type PasswordTokenProbe = {
  ok: boolean;
  status: number;
  body: unknown;
  latencyMs: number;
};

export function logAuthDebug(scope: string, payload: Record<string, unknown>): void {
  if (!isAuthDebugEnabled()) return;
  console.info(`[auth:debug:${scope}]`, payload);
}

export async function probeSupabaseAuthHealth(): Promise<AuthHealthCheck> {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  const started = performance.now();

  if (!url || !key) {
    return {
      ok: false,
      status: 0,
      body: { error: "missing_env", url: Boolean(url), key: Boolean(key) },
      latencyMs: 0,
    };
  }

  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    return {
      ok: res.ok,
      status: res.status,
      body,
      latencyMs: Math.round(performance.now() - started),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: { network_error: serializeAuthError(error) },
      latencyMs: Math.round(performance.now() - started),
    };
  }
}

export async function probeSupabaseAuthSettings(): Promise<AuthHealthCheck> {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  const started = performance.now();

  if (!url || !key) {
    return { ok: false, status: 0, body: { error: "missing_env" }, latencyMs: 0 };
  }

  try {
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
    const body = await res.json().catch(() => res.text());
    return {
      ok: res.ok,
      status: res.status,
      body,
      latencyMs: Math.round(performance.now() - started),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: { network_error: serializeAuthError(error) },
      latencyMs: Math.round(performance.now() - started),
    };
  }
}

/** Llamada directa al endpoint de password grant — expone el payload REAL de Supabase (solo diagnóstico). */
export async function probePasswordToken(
  email: string,
  password: string,
): Promise<PasswordTokenProbe> {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  const started = performance.now();

  if (!url || !key) {
    return { ok: false, status: 0, body: { error: "missing_env" }, latencyMs: 0 };
  }

  try {
    const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ email, password }),
    });

    let body: unknown;
    const text = await res.text();
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }

    logAuthDebug("probePasswordToken", {
      status: res.status,
      ok: res.ok,
      body,
      email,
    });

    return {
      ok: res.ok,
      status: res.status,
      body,
      latencyMs: Math.round(performance.now() - started),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: { network_error: serializeAuthError(error) },
      latencyMs: Math.round(performance.now() - started),
    };
  }
}

export function getAuthDiagnosticsSnapshot() {
  const env = validateSupabaseEnvironment();
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  const keyInfo = analyzeSupabaseAnonKey(key);

  return {
    timestamp: new Date().toISOString(),
    origin: typeof window !== "undefined" ? window.location.origin : "server",
    mode: import.meta.env.MODE,
    authDebug: isAuthDebugEnabled(),
    env: {
      ...env,
      urlMasked: url,
      anonKeyMasked: maskSecret(key),
      keyRole: keyInfo.role,
      keyProjectRef: keyInfo.projectRef,
      urlProjectRef: url ? extractProjectRefFromUrl(url) : undefined,
    },
    vite: {
      VITE_SUPABASE_URL: Boolean(import.meta.env.VITE_SUPABASE_URL),
      VITE_SUPABASE_ANON_KEY: Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY),
      VITE_AUTH_DEBUG: import.meta.env.VITE_AUTH_DEBUG,
    },
  };
}
