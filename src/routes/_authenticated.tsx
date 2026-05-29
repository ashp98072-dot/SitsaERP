import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { RoutePermissionGuard } from "@/components/auth/RoutePermissionGuard";
import { PageLoader } from "@/components/common/PageLoader";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { session, loading, roles } = useAuth();
  if (loading) {
    return <PageLoader label="Verificando sesión…" />;
  }
  if (!session) return <Navigate to="/login" replace />;
  if (roles.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="industrial-card p-8 max-w-md">
          <h2 className="text-lg font-semibold">Cuenta sin rol asignado</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Tu cuenta existe pero no tiene roles asignados. Contacta a un administrador.
          </p>
        </div>
      </div>
    );
  }
  return (
    <AppShell>
      <RoutePermissionGuard>
        <Outlet />
      </RoutePermissionGuard>
    </AppShell>
  );
}
