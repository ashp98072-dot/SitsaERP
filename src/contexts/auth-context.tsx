import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserRoles, validateEmailAccess } from "@/services/auth.service";
import type { AppRole } from "@/types";
import { ROLE_LABELS } from "@/utils/constants";
import { toast } from "sonner";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  roles: [],
  loading: true,
  signOut: async () => {},
});

type SessionBootstrap = { session: Session | null; roles: AppRole[] };

async function bootstrapSession(session: Session | null): Promise<SessionBootstrap> {
  if (!session?.user) return { session: null, roles: [] };

  const allowed = await validateEmailAccess(session.user.email ?? "");
  if (!allowed) {
    await supabase.auth.signOut();
    toast.error("Tu cuenta no está autorizada para ingresar al sistema.");
    return { session: null, roles: [] };
  }

  const roles = await fetchUserRoles(session.user.id);
  return { session, roles };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void bootstrapSession(nextSession).then(({ session: activeSession, roles: nextRoles }) => {
        setSession(activeSession);
        setRoles(nextRoles);
      });
    });

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      void bootstrapSession(initialSession).then(({ session: activeSession, roles: nextRoles }) => {
        setSession(activeSession);
        setRoles(nextRoles);
        setLoading(false);
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        roles,
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
        },
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
