import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { RoutePermissionGuard } from "@/components/auth/RoutePermissionGuard";
import { PageLoader } from "@/components/common/PageLoader";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { session, loading, bootstrapping, roles, refreshSession } = useAuth();
  if (loading || bootstrapping) {
    return <PageLoader label="Verificando sesión…" />;
  }
  if (!session) return <Navigate to="/login" replace />;
  if (roles.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="industrial-card p-8 max-w-md space-y-4">
          <h2 className="text-lg font-semibold">Cuenta sin rol asignado</h2>
          <p className="text-sm text-muted-foreground">
            Tu sesión es válida pero falta asignar rol. Intenta reparar la cuenta o contacta a TI.
          </p>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            onClick={() => void refreshSession()}
          >
            Reintentar configuración
          </button>
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
