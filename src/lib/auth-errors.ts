import type { AuthError } from "@supabase/supabase-js";

export function isAuthDebugEnabled(): boolean {
  return import.meta.env.DEV || import.meta.env.VITE_AUTH_DEBUG === "true";
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials:
    "Correo o contraseña incorrectos. Si el usuario fue creado en el panel, usa «Reset password» en Supabase Auth.",
  invalid_grant:
    "Credenciales rechazadas por Supabase (invalid_grant). Revisa contraseña, confirmación de email y que el usuario no esté baneado.",
  email_not_confirmed:
    "El correo no está confirmado. En Supabase → Authentication → Users marca el email como confirmado.",
  user_banned: "Usuario baneado o desactivado. Ejecuta repair_auth_system.sql o desbloquea en Supabase.",
  too_many_requests: "Demasiados intentos. Espera unos minutos.",
  weak_password: "Contraseña demasiado débil según la política de Supabase.",
};

export function serializeAuthError(error: unknown): Record<string, unknown> {
  if (error == null) return { type: "null" };

  if (typeof error === "string") return { type: "string", message: error };

  if (error instanceof Error) {
    const base: Record<string, unknown> = {
      type: "Error",
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
    if ("cause" in error && error.cause) {
      base.cause = serializeAuthError(error.cause);
    }
    const extra = error as Error & Record<string, unknown>;
    for (const key of ["code", "status", "error_description", "details", "hint", "__isAuthError"]) {
      if (key in extra && extra[key] !== undefined) base[key] = extra[key];
    }
    return base;
  }

  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    const out: Record<string, unknown> = { type: "object" };
    for (const key of [
      "name",
      "message",
      "code",
      "status",
      "error",
      "error_description",
      "msg",
      "details",
      "hint",
      "raw",
      "body",
    ]) {
      if (record[key] !== undefined) out[key] = record[key];
    }
    return out;
  }

  return { type: typeof error, value: String(error) };
}

export function formatAuthError(error: unknown): string {
  if (!error) return "Error de autenticación desconocido";

  const serialized = serializeAuthError(error);
  const code = String(serialized.code ?? "");
  if (code && AUTH_ERROR_MESSAGES[code]) return AUTH_ERROR_MESSAGES[code];

  const authError = error as AuthError & {
    error_description?: string;
    msg?: string;
    body?: unknown;
  };

  const description = authError.error_description?.trim();
  if (description) return description;

  const bodyMsg =
    authError.body &&
    typeof authError.body === "object" &&
    authError.body !== null &&
    "error_description" in (authError.body as object)
      ? String((authError.body as { error_description?: string }).error_description)
      : null;
  if (bodyMsg) return bodyMsg;

  if (authError.message?.trim()) {
    const lower = authError.message.toLowerCase();
    if (lower.includes("invalid login credentials")) return AUTH_ERROR_MESSAGES.invalid_credentials;
    if (lower.includes("email not confirmed")) return AUTH_ERROR_MESSAGES.email_not_confirmed;
    return authError.message;
  }

  if (serialized.message && typeof serialized.message === "string") return serialized.message;

  return "No se pudo iniciar sesión. Revisa /debug/auth para diagnóstico completo.";
}

export type AuthErrorDetails = {
  userMessage: string;
  technicalJson: string;
  status?: number;
  code?: string;
};

export function getAuthErrorDetails(error: unknown, rawProbe?: unknown): AuthErrorDetails {
  const serialized = serializeAuthError(error);
  const merged =
    rawProbe && typeof rawProbe === "object"
      ? { ...serialized, supabaseRaw: rawProbe }
      : serialized;

  const authError = error as AuthError;
  return {
    userMessage: formatAuthError(error),
    technicalJson: JSON.stringify(merged, null, 2),
    status: authError?.status ?? (merged.status as number | undefined),
    code: authError?.code ?? (merged.code as string | undefined),
  };
}

export function logAuthError(scope: string, error: unknown, extra?: Record<string, unknown>): void {
  console.error(`[auth:${scope}]`, serializeAuthError(error), extra ?? "");
}

export function formatAuthErrorVerbose(error: unknown, rawProbe?: unknown): string {
  const { userMessage, technicalJson } = getAuthErrorDetails(error, rawProbe);
  if (!isAuthDebugEnabled()) return userMessage;
  return `${userMessage}\n\n--- Supabase (técnico) ---\n${technicalJson}`;
}
