import { AlertTriangle, Ban, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { StockAlertLevel } from "@/types/inventory";

const CONFIG: Record<
  StockAlertLevel,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string; icon?: typeof AlertTriangle }
> = {
  ok: {
    label: "Disponible",
    variant: "secondary",
    className: "bg-primary/10 text-primary border-primary/20",
    icon: CheckCircle2,
  },
  bajo: { label: "Stock bajo", variant: "outline", className: "border-amber-500/50 text-amber-700 bg-amber-500/10", icon: AlertTriangle },
  critico: { label: "Crítico", variant: "destructive", icon: AlertTriangle },
  agotado: { label: "Agotado", variant: "destructive", icon: Ban },
};

export function StockAlertBadge({ level }: { level: StockAlertLevel }) {
  const cfg = CONFIG[level];
  const Icon = cfg.icon;

  return (
    <Badge variant={cfg.variant} className={`gap-1 ${cfg.className ?? ""}`}>
      {Icon && <Icon className="h-3 w-3" />}
      {cfg.label}
    </Badge>
  );
}
