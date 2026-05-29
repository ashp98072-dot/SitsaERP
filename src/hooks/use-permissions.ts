import { useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  canAccess,
  canAccessAny,
  type Permission,
} from "@/lib/permissions";

export function usePermissions() {
  const { roles } = useAuth();

  return useMemo(
    () => ({
      roles,
      can: (permission: Permission) => canAccess(roles, permission),
      canAny: (permissions: Permission[]) => canAccessAny(roles, permissions),
    }),
    [roles],
  );
}
