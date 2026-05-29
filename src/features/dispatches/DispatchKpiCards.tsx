import { CheckCircle2, Clock, Scale, Truck, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDispatchDashboard } from "@/hooks/use-dispatches";

export function DispatchKpiCards() {
  const { data, isLoading } = useDispatchDashboard();

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] rounded-lg" />
        ))}
      </div>
    );
  }

  const s = data!;
  const items = [
    { icon: Truck, label: "Despachos hoy", value: s.dispatches_today },
    { icon: Scale, label: "Toneladas hoy", value: s.tons_dispatched_today.toFixed(3) },
    { icon: Clock, label: "Pendientes", value: s.pending },
    { icon: CheckCircle2, label: "Aprobados", value: s.approved },
    { icon: XCircle, label: "Cancelados", value: s.cancelled },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map(({ icon: Icon, label, value }) => (
        <Card key={label} className="industrial-card">
          <CardContent className="p-4 flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
              <div className="text-2xl font-bold tabular-nums mt-0.5">{value}</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
