import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LogOut, ShieldCheck } from "lucide-react";
import { BrandLockup } from "@/components/brand/Logos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { roleLabel, useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { ADMIN_NAV_ITEMS, MAIN_NAV_ITEMS, type NavItem } from "@/lib/permissions";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { roles, can } = usePermissions();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const primaryRole = roles[0];

  const mainNav = MAIN_NAV_ITEMS.filter((item) => can(item.permission));
  const adminNav = ADMIN_NAV_ITEMS.filter((item) => can(item.permission));

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-[inset_-1px_0_0_oklch(1_0_0/0.04)]">
        <div className="h-[4.5rem] px-4 flex items-center border-b border-sidebar-border bg-black/30">
          <BrandLockup />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {mainNav.map((item) => (
            <NavLink key={item.to} item={item} pathname={pathname} />
          ))}
          {adminNav.length > 0 && (
            <>
              <div className="pt-4 pb-1 px-3 text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/40">
                Administración
              </div>
              {adminNav.map((item) => (
                <NavLink key={item.to} item={item} pathname={pathname} adminGroup />
              ))}
            </>
          )}
        </nav>
        <div className="px-3 py-3 border-t border-sidebar-border bg-black/20">
          <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/45 px-2">
            {BRAND.productName}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-card flex items-center justify-between px-4 md:px-6">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {BRAND.company} · {BRAND.systemName}
            </div>
            <div className="text-base font-semibold text-foreground">
              Control de bodega y despacho industrial
            </div>
          </div>
          <div className="flex items-center gap-3">
            {primaryRole && (
              <Badge
                variant="secondary"
                className="gap-1 bg-primary/10 text-primary border-primary/25"
              >
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

function NavLink({
  item,
  pathname,
  adminGroup = false,
}: {
  item: NavItem;
  pathname: string;
  adminGroup?: boolean;
}) {
  const Icon = item.icon;
  const active = adminGroup
    ? pathname.startsWith("/admin") && pathname.startsWith(item.to)
    : pathname.startsWith(item.to);

  return (
    <Link
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
}
