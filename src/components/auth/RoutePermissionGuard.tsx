import type { ReactNode } from "react";
import { Navigate, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/use-permissions";
import { permissionForPath } from "@/lib/permissions";

type RoutePermissionGuardProps = {
  children: ReactNode;
};

export function RoutePermissionGuard({ children }: RoutePermissionGuardProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { can } = usePermissions();
  const required = permissionForPath(pathname);

  if (required && !can(required)) {
    toast.error("No tienes permiso para acceder a esta sección.");
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
