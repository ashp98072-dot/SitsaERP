import { createFileRoute, Outlet, Navigate, Link, useRouterState } from "@tanstack/react-router";
import { usePermissions } from "@/hooks/use-permissions";
import { Users, ShieldCheck, Globe, ClipboardList } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { can } = usePermissions();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!can("admin:access") && !can("audit:read")) {
    return <Navigate to="/dashboard" replace />;
  }

  if (
    (pathname.startsWith("/admin/users") || pathname.startsWith("/admin/access")) &&
    !can("admin:access")
  ) {
    return <Navigate to="/admin/audit" replace />;
  }

  const tabs = [
    { to: "/admin/users", label: "Usuarios", icon: Users, show: can("admin:access") },
    { to: "/admin/access", label: "Acceso autorizado", icon: Globe, show: can("admin:access") },
    { to: "/admin/audit", label: "Auditoría", icon: ClipboardList, show: can("audit:read") },
  ].filter((tab) => tab.show);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-primary">
        <ShieldCheck className="h-4 w-4" /> Administración
      </div>
      <div className="border-b flex gap-1 flex-wrap">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.to);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`px-4 py-2 text-sm flex items-center gap-2 border-b-2 transition-colors ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
