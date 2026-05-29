import type { LucideIcon } from "lucide-react";
import {
  ArrowDownToLine,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Package,
  Truck,
  UserCog,
  Users,
  Globe,
} from "lucide-react";
import type { AppRole } from "@/types";

export type Permission =
  | "dashboard:view"
  | "clients:read"
  | "clients:write"
  | "products:read"
  | "products:write"
  | "inventory:read"
  | "inventory:adjust"
  | "entries:read"
  | "entries:write"
  | "dispatches:read"
  | "dispatches:write"
  | "dispatches:approve"
  | "dispatches:pdf"
  | "admin:access"
  | "audit:read";

const ROLE_PERMISSIONS: Record<AppRole, ReadonlySet<Permission>> = {
  administrador: new Set<Permission>([
    "dashboard:view",
    "clients:read",
    "clients:write",
    "products:read",
    "products:write",
    "inventory:read",
    "inventory:adjust",
    "entries:read",
    "entries:write",
    "dispatches:read",
    "dispatches:write",
    "dispatches:approve",
    "dispatches:pdf",
    "admin:access",
    "audit:read",
  ]),
  supervisor: new Set<Permission>([
    "dashboard:view",
    "clients:read",
    "products:read",
    "inventory:read",
    "inventory:adjust",
    "entries:read",
    "dispatches:read",
    "dispatches:approve",
    "dispatches:pdf",
    "audit:read",
  ]),
  bodega: new Set<Permission>([
    "dashboard:view",
    "clients:read",
    "products:read",
    "inventory:read",
    "entries:read",
    "entries:write",
  ]),
  despacho: new Set<Permission>([
    "dashboard:view",
    "clients:read",
    "products:read",
    "inventory:read",
    "dispatches:read",
    "dispatches:write",
    "dispatches:pdf",
  ]),
};

export function canAccess(roles: AppRole[], permission: Permission): boolean {
  return roles.some((role) => ROLE_PERMISSIONS[role]?.has(permission));
}

export function canAccessAny(roles: AppRole[], permissions: Permission[]): boolean {
  return permissions.some((permission) => canAccess(roles, permission));
}

export const ROUTE_PERMISSIONS: Record<string, Permission> = {
  "/dashboard": "dashboard:view",
  "/clients": "clients:read",
  "/products": "products:read",
  "/inventory": "inventory:read",
  "/entries": "entries:read",
  "/dispatches": "dispatches:read",
  "/dispatches/new": "dispatches:write",
  "/dispatches/$dispatchId": "dispatches:read",
  "/admin": "admin:access",
  "/admin/users": "admin:access",
  "/admin/access": "admin:access",
  "/admin/audit": "audit:read",
};

export function permissionForPath(pathname: string): Permission | null {
  const match = Object.entries(ROUTE_PERMISSIONS)
    .sort(([a], [b]) => b.length - a.length)
    .find(([route]) => pathname === route || pathname.startsWith(`${route}/`));
  return match?.[1] ?? null;
}

export type NavItem = {
  to: string;
  label: string;
  permission: Permission;
  icon: LucideIcon;
};

export const MAIN_NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", permission: "dashboard:view", icon: LayoutDashboard },
  { to: "/clients", label: "Clientes", permission: "clients:read", icon: Users },
  { to: "/products", label: "Productos", permission: "products:read", icon: Package },
  { to: "/inventory", label: "Inventario", permission: "inventory:read", icon: Boxes },
  { to: "/entries", label: "Ingresos a Bodega", permission: "entries:read", icon: ArrowDownToLine },
  { to: "/dispatches", label: "Despachos", permission: "dispatches:read", icon: Truck },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { to: "/admin/users", label: "Usuarios", permission: "admin:access", icon: UserCog },
  { to: "/admin/access", label: "Acceso autorizado", permission: "admin:access", icon: Globe },
  { to: "/admin/audit", label: "Auditoría", permission: "audit:read", icon: ClipboardList },
];
