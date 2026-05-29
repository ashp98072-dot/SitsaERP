import type { AuthError, Session, SignInWithPasswordCredentials } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logAuthDebug, probePasswordToken } from "@/lib/auth-debug";
import {
  getAuthErrorDetails,
  isAuthDebugEnabled,
  logAuthError,
  serializeAuthError,
} from "@/lib/auth-errors";
import { validateSupabaseEnvironment } from "@/lib/supabase-config";
import type { AppRole } from "@/types";
import {
  isBootstrapAdminUser,
  isCorporateEmailLocally,
  normalizeEmail,
} from "@/utils/constants";

export type EmailAccessResult = {
  allowed: boolean;
  reason?: string;
  source?: "rpc" | "local" | "bootstrap";
};

export type SignInResult = {
  session: Session;
};

export class AuthSignInError extends Error {
  readonly details: ReturnType<typeof getAuthErrorDetails>;
  readonly rawProbe?: unknown;

  constructor(message: string, details: ReturnType<typeof getAuthErrorDetails>, rawProbe?: unknown) {
    super(message);
    this.name = "AuthSignInError";
    this.details = details;
    this.rawProbe = rawProbe;
  }
}

function assertSupabaseEnv(): void {
  const validation = validateSupabaseEnvironment();
  if (!validation.ok) {
    throw new Error(validation.issues.join(" "));
  }
}

/**
 * Inicio de sesión — SOLO Supabase Auth API (auth.users + credenciales).
 * No consulta profiles, user_roles ni allowlists.
 */
export async function signInWithPassword(email: string, password: string): Promise<SignInResult> {
  assertSupabaseEnv();

  const normalizedEmail = normalizeEmail(email);
  const trimmedPassword = password;

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new AuthSignInError("Ingresa un correo corporativo válido.", {
      userMessage: "Ingresa un correo corporativo válido.",
      technicalJson: "{}",
    });
  }

  if (!trimmedPassword?.length) {
    throw new AuthSignInError("Ingresa tu contraseña.", {
      userMessage: "Ingresa tu contraseña.",
      technicalJson: "{}",
    });
  }

  const credentials: SignInWithPasswordCredentials = {
    email: normalizedEmail,
    password: trimmedPassword,
  };

  logAuthDebug("signIn.request", {
    email: normalizedEmail,
    grant: "password",
    passwordLength: trimmedPassword.length,
  });

  const { data, error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    let rawProbe: unknown;
    if (isAuthDebugEnabled()) {
      rawProbe = await probePasswordToken(normalizedEmail, trimmedPassword);
    }

    logAuthError("signInWithPassword", error as AuthError, {
      email: normalizedEmail,
      status: (error as AuthError).status,
      code: (error as AuthError).code,
      rawProbe,
    });

    const details = getAuthErrorDetails(error, rawProbe);
    throw new AuthSignInError(details.userMessage, details, rawProbe);
  }

  if (!data.session) {
    const rawProbe = isAuthDebugEnabled()
      ? await probePasswordToken(normalizedEmail, trimmedPassword)
      : undefined;
    const details = getAuthErrorDetails(
      new Error("missing_session_after_sign_in"),
      rawProbe,
    );
    throw new AuthSignInError(
      "Supabase no devolvió sesión. Revisa Site URL y variables en Vercel.",
      details,
      rawProbe,
    );
  }

  logAuthDebug("signIn.success", {
    userId: data.session.user.id,
    email: data.session.user.email,
    expiresAt: data.session.expires_at,
  });

  return { session: data.session };
}

/** Post-login: profile + roles. Nunca debe invalidar credenciales Auth. */
export async function ensureUserBootstrap(): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase.rpc("ensure_user_bootstrap");

  if (error) {
    logAuthError("ensureUserBootstrap", error);
    return null;
  }

  logAuthDebug("ensureUserBootstrap", { data });
  return (data as Record<string, unknown>) ?? null;
}

export async function validateEmailAccess(email: string): Promise<EmailAccessResult> {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return { allowed: false, reason: "Correo inválido", source: "local" };
  }

  if (isCorporateEmailLocally(normalized)) {
    const { data, error } = await supabase.rpc("is_email_allowed", { _email: normalized });
    if (!error && data === true) {
      return { allowed: true, source: "rpc" };
    }
    if (error) {
      logAuthError("is_email_allowed", error, { email: normalized });
      return { allowed: true, reason: "rpc_error_corporate_fallback", source: "local" };
    }
  }

  const { data: configured, error: configuredError } = await supabase.rpc("access_list_configured");
  if (configuredError) {
    logAuthError("access_list_configured", configuredError);
    return {
      allowed: isCorporateEmailLocally(normalized),
      reason: "allowlist_check_skipped",
      source: "local",
    };
  }

  if (configured !== true) {
    return { allowed: true, reason: "allowlist_not_configured", source: "bootstrap" };
  }

  const { data, error } = await supabase.rpc("is_email_allowed", { _email: normalized });

  if (error) {
    logAuthError("is_email_allowed", error, { email: normalized });
    return {
      allowed: isCorporateEmailLocally(normalized),
      reason: error.message,
      source: "local",
    };
  }

  if (data === true) {
    return { allowed: true, source: "rpc" };
  }

  return {
    allowed: false,
    reason: `El correo ${normalized} no está en la lista de acceso corporativo.`,
    source: "rpc",
  };
}

export async function completePostLoginSetup(session: Session): Promise<{
  roles: AppRole[];
  access: EmailAccessResult;
  bootstrap: Record<string, unknown> | null;
}> {
  const userId = session.user.id;
  const email = session.user.email ?? "";
  const isBootstrapAdmin = isBootstrapAdminUser(userId, email);

  let bootstrap = await ensureUserBootstrap();
  if (!bootstrap && isBootstrapAdmin) {
    bootstrap = await ensureUserBootstrap();
  }

  const access = isBootstrapAdmin
    ? { allowed: true as const, source: "bootstrap" as const, reason: "bootstrap_admin" }
    : await validateEmailAccess(email);

  if (!access.allowed) {
    return { roles: [], access, bootstrap };
  }

  let roles = await fetchUserRoles(userId);

  if (roles.length === 0) {
    bootstrap = await ensureUserBootstrap();
    roles = await fetchUserRoles(userId);
  }

  if (isBootstrapAdmin && !roles.includes("administrador")) {
    roles = ["administrador", ...roles.filter((r) => r !== "administrador")];
    logAuthDebug("completePostLoginSetup.bootstrapAdminFallback", { userId, email, roles });
  }

  return { roles, access, bootstrap };
}

export async function fetchUserRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);

  if (error) {
    logAuthError("fetchUserRoles", error, { userId });
    return [];
  }

  return (data ?? []).map((row) => row.role);
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) logAuthError("signOut", error);
}

export async function sendPasswordReset(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;

  const { error } = await supabase.auth.resetPasswordForEmail(normalized, { redirectTo });
  if (error) {
    logAuthError("resetPasswordForEmail", error);
    const details = getAuthErrorDetails(error);
    throw new AuthSignInError(details.userMessage, details);
  }
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) logAuthError("getSession", error);
  return data.session ?? null;
}

export async function refreshAuthSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) {
    logAuthError("refreshSession", error);
    return null;
  }
  return data.session ?? null;
}

export function exportAuthDiagnostics(error: unknown) {
  return serializeAuthError(error);
}
