import type { ReactNode } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import type { Permission } from "@/lib/permissions";

type PermissionGateProps = {
  permission: Permission | Permission[];
  children: ReactNode;
  fallback?: ReactNode;
};

export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const { can, canAny } = usePermissions();
  const allowed = Array.isArray(permission) ? canAny(permission) : can(permission);
  return allowed ? <>{children}</> : <>{fallback}</>;
}
