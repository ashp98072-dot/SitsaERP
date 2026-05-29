import { createFileRoute, Outlet, Navigate, Link, useRouterState } from "@tanstack/react-router";
import { useAuth, hasRole } from "@/lib/auth";
import { Users, ShieldCheck, Globe } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { roles } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (!hasRole(roles, "administrador")) return <Navigate to="/dashboard" replace />;

  const tabs = [
    { to: "/admin/users", label: "Usuarios", icon: Users },
    { to: "/admin/access", label: "Acceso autorizado", icon: Globe },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-primary">
        <ShieldCheck className="h-4 w-4" /> Administración
      </div>
      <div className="border-b flex gap-1">
        {tabs.map(t => {
          const active = pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link key={t.to} to={t.to} className={`px-4 py-2 text-sm flex items-center gap-2 border-b-2 transition-colors ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <Icon className="h-4 w-4" />{t.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
