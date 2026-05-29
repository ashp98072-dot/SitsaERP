import { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Package, Boxes, ArrowDownToLine, Truck, LogOut, ShieldCheck, UserCog,
} from "lucide-react";
import { useAuth, roleLabel, hasRole } from "@/lib/auth";
import { BrandLockup } from "@/components/brand/Logos";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clients", label: "Clientes", icon: Users },
  { to: "/products", label: "Productos", icon: Package },
  { to: "/inventory", label: "Inventario", icon: Boxes },
  { to: "/entries", label: "Ingresos a Bodega", icon: ArrowDownToLine },
  { to: "/dispatches", label: "Despachos", icon: Truck },
];
const ADMIN_NAV = [
  { to: "/admin/users", label: "Usuarios", icon: UserCog },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, roles, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const primaryRole = roles[0];
  const isAdmin = hasRole(roles, "administrador");

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="h-16 px-4 flex items-center border-b border-sidebar-border bg-black/20">
          <BrandLockup />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[var(--shadow-elevated)]"
                    : "hover:bg-sidebar-accent text-sidebar-foreground/85"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
          {isAdmin && (
            <>
              <div className="pt-4 pb-1 px-3 text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/40">Administración</div>
              {ADMIN_NAV.map((item) => {
                const active = pathname.startsWith("/admin");
                const Icon = item.icon;
                return (
                  <Link key={item.to} to={item.to}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                      active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent text-sidebar-foreground/85"
                    }`}>
                    <Icon className="h-4 w-4 shrink-0" /><span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>
        <div className="px-3 py-3 border-t border-sidebar-border">
          <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50 px-2">v1.0 · ERP</div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-card flex items-center justify-between px-4 md:px-6">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">ECOPLANET · GRUPO SITSA</div>
            <div className="text-base font-semibold">Control de Bodega y Despacho</div>
          </div>
          <div className="flex items-center gap-3">
            {primaryRole && (
              <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-primary/20">
                <ShieldCheck className="h-3 w-3" />
                {roleLabel(primaryRole)}
              </Badge>
            )}
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-medium leading-none">{user?.email}</span>
              <span className="text-[11px] text-muted-foreground mt-1">Sesión activa</span>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} title="Cerrar sesión">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 max-w-[1600px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}