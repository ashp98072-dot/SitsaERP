import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logAuthDebug } from "@/lib/auth-debug";
import { logAuthError } from "@/lib/auth-errors";
import {
  completePostLoginSetup,
  refreshAuthSession,
  signOut as authSignOut,
} from "@/services/auth.service";
import type { AppRole } from "@/types";
import { ROLE_LABELS } from "@/utils/constants";
import { toast } from "sonner";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  bootstrapping: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  roles: [],
  loading: true,
  bootstrapping: false,
  signOut: async () => {},
  refreshSession: async () => {},
});

type SessionBootstrap = { session: Session | null; roles: AppRole[] };

/**
 * Post-login únicamente. Auth API ya validó credenciales.
 * No hace signOut salvo allowlist explícitamente denegado tras RPC+local.
 */
async function bootstrapSession(session: Session | null): Promise<SessionBootstrap> {
  if (!session?.user) return { session: null, roles: [] };

  const { roles, access } = await completePostLoginSetup(session);

  if (!access.allowed) {
    logAuthError("bootstrapSession.accessDenied", new Error(access.reason ?? "denied"), {
      email: session.user.email,
      source: access.source,
    });
    await authSignOut();
    toast.error(access.reason ?? "Tu cuenta no está autorizada para ingresar al sistema.");
    return { session: null, roles: [] };
  }

  if (roles.length === 0) {
    logAuthError("bootstrapSession.noRoles", new Error("no roles after bootstrap"), {
      userId: session.user.id,
      email: session.user.email,
    });
  }

  logAuthDebug("bootstrapSession.ok", {
    userId: session.user.id,
    roles,
    accessSource: access.source,
  });

  return { session, roles };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [bootstrapping, setBootstrapping] = useState(false);
  const bootstrapRun = useRef(0);

  const runBootstrap = async (nextSession: Session | null, markReady = false) => {
    const runId = ++bootstrapRun.current;
    setBootstrapping(Boolean(nextSession));

    try {
      const { session: activeSession, roles: nextRoles } = await bootstrapSession(nextSession);
      if (runId !== bootstrapRun.current) return;
      setSession(activeSession);
      setRoles(nextRoles);
    } finally {
      if (runId === bootstrapRun.current) {
        setBootstrapping(false);
        if (markReady) setLoading(false);
      }
    }
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      logAuthDebug("onAuthStateChange", {
        event,
        hasSession: Boolean(nextSession),
        userId: nextSession?.user.id,
      });

      if (event === "SIGNED_OUT") {
        setSession(null);
        setRoles([]);
        setBootstrapping(false);
        return;
      }

      if (event === "TOKEN_REFRESHED" && nextSession) {
        setSession(nextSession);
        return;
      }

      void runBootstrap(nextSession);
    });

    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (error) logAuthError("getSession.initial", error);
      void runBootstrap(initialSession, true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshSession = async () => {
    const refreshed = await refreshAuthSession();
    await runBootstrap(refreshed);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        roles,
        loading,
        bootstrapping,
        signOut: async () => {
          await authSignOut();
          setSession(null);
          setRoles([]);
        },
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export function hasRole(roles: AppRole[], ...check: AppRole[]): boolean {
  return roles.some((role) => check.includes(role));
}

export function roleLabel(role: AppRole): string {
  return ROLE_LABELS[role];
}

export type { AppRole };
