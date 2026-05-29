import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AppRole = "administrador" | "bodega" | "despacho" | "supervisor";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  roles: [],
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  async function validateAccess(s: Session | null) {
    if (!s?.user?.email) return true;
    const { data, error } = await supabase.rpc("is_email_allowed", { _email: s.user.email });
    if (error) return true; // fail-open on RPC error to avoid lockout
    if (data === false) {
      await supabase.auth.signOut();
      toast.error("Tu cuenta no está autorizada para ingresar al sistema.");
      return false;
    }
    return true;
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(async () => {
          const ok = await validateAccess(s);
          if (!ok) { setSession(null); setRoles([]); return; }
          const { data } = await supabase.from("user_roles").select("role").eq("user_id", s.user.id);
          setRoles((data ?? []).map((r) => r.role as AppRole));
        }, 0);
      } else {
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        (async () => {
          const ok = await validateAccess(s);
          if (!ok) { setSession(null); setRoles([]); setLoading(false); return; }
          const { data } = await supabase.from("user_roles").select("role").eq("user_id", s.user.id);
          setRoles((data ?? []).map((r) => r.role as AppRole));
          setLoading(false);
        })();
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        roles,
        loading,
        signOut: async () => { await supabase.auth.signOut(); },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

export function hasRole(roles: AppRole[], ...check: AppRole[]) {
  return roles.some((r) => check.includes(r));
}

export function roleLabel(r: AppRole): string {
  return { administrador: "Administrador", bodega: "Bodega", despacho: "Despacho", supervisor: "Supervisor" }[r];
}