import {
  ArrowDownToLine,
  Package,
  TrendingUp,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { useDashboardStats, useStockChartData } from "@/hooks/use-dashboard";

type KpiProps = {
  icon: LucideIcon;
  label: string;
  value: number;
  hint?: string;
};

function KpiCard({ icon: Icon, label, value, hint }: KpiProps) {
  return (
    <Card className="industrial-card">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
            <div className="mt-2 text-3xl font-bold">{value}</div>
            {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
          </div>
          <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { clientCount, productCount, dispatchCount, entryCount } = useDashboardStats();
  const { chartData } = useStockChartData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Resumen general de operaciones de bodega."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Users} label="Clientes" value={clientCount} />
        <KpiCard icon={Package} label="Productos" value={productCount} />
        <KpiCard icon={ArrowDownToLine} label="Ingresos a bodega" value={entryCount} />
        <KpiCard icon={Truck} label="Despachos" value={dispatchCount} />
      </div>

      <Card className="industrial-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            Stock por producto (peso)
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Sin movimientos registrados aún.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="weight" fill="oklch(0.55 0.17 145)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
