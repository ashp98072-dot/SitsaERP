import type { AppRole, UnitType } from "@/types";

export const UNIT_TYPES: readonly UnitType[] = ["lbs", "kg", "ton", "unidad"];

export const APP_ROLES = [
  "administrador",
  "bodega",
  "despacho",
  "supervisor",
] as const satisfies readonly AppRole[];

export const ROLE_LABELS: Record<AppRole, string> = {
  administrador: "Administrador",
  bodega: "Bodega",
  despacho: "Despacho",
  supervisor: "Supervisor",
};
