import { Badge } from "@/components/ui/badge";
import { DISPATCH_STATUS_LABELS, type DispatchStatus } from "@/types/dispatch";

const VARIANT: Record<
  DispatchStatus,
  { className: string }
> = {
  borrador: { className: "bg-muted text-muted-foreground" },
  pendiente: { className: "bg-amber-500/15 text-amber-800 border-amber-500/30" },
  aprobado: { className: "bg-blue-500/15 text-blue-800 border-blue-500/30" },
  despachado: { className: "bg-primary/15 text-primary border-primary/30" },
  cancelado: { className: "bg-destructive/15 text-destructive border-destructive/30" },
};

export function DispatchStatusBadge({ status }: { status: DispatchStatus | string }) {
  const key = status as DispatchStatus;
  const label = DISPATCH_STATUS_LABELS[key] ?? status;
  const style = VARIANT[key] ?? VARIANT.borrador;

  return (
    <Badge variant="outline" className={style.className}>
      {label}
    </Badge>
  );
}
