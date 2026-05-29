import { ArrowDownToLine, Boxes, Scale, Truck, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInventoryDashboard } from "@/hooks/use-inventory";

type KpiProps = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
};

function KpiCard({ icon: Icon, label, value, hint }: KpiProps) {
  return (
    <Card className="industrial-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground truncate">
              {label}
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
            {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
          </div>
          <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function InventoryKpiCards() {
  const { data, isLoading } = useInventoryDashboard();

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-lg" />
        ))}
      </div>
    );
  }

  const stats = data!;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <KpiCard icon={Scale} label="Toneladas totales" value={stats.total_tons.toFixed(3)} hint="Peso acumulado / 1000" />
      <KpiCard icon={Boxes} label="Productos críticos" value={stats.products_critical} />
      <KpiCard icon={Boxes} label="Stock bajo" value={stats.products_low} />
      <KpiCard icon={Boxes} label="Agotados" value={stats.products_out} />
      <KpiCard icon={ArrowDownToLine} label="Ingresos hoy" value={stats.entries_today} />
      <KpiCard icon={Truck} label="Despachos hoy" value={stats.dispatches_today} hint={`${stats.movements_today} movimientos`} />
    </div>
  );
}
