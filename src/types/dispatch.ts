export type DispatchStatus = "borrador" | "pendiente" | "aprobado" | "despachado" | "cancelado";

export type DispatchAction = "submit" | "approve" | "dispatch" | "cancel";

export type DispatchTimelineEntry = {
  id: string;
  dispatch_id: string;
  from_status: DispatchStatus | null;
  to_status: DispatchStatus;
  notes: string | null;
  created_at: string;
  changed_by: string | null;
  changed_by_email: string | null;
  changed_by_name: string | null;
};

export type DispatchDashboardStats = {
  dispatches_today: number;
  tons_dispatched_today: number;
  pending: number;
  approved: number;
  cancelled: number;
};

export const DISPATCH_STATUS_LABELS: Record<DispatchStatus, string> = {
  borrador: "Borrador",
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  despachado: "Despachado",
  cancelado: "Cancelado",
};

export const DISPATCH_ACTION_LABELS: Record<DispatchAction, string> = {
  submit: "Enviar a pendiente",
  approve: "Aprobar",
  dispatch: "Despachar (salida inventario)",
  cancel: "Cancelar",
};
