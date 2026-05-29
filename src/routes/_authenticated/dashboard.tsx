import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, Truck, ArrowDownToLine, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { inventoryStock } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · ECOPLANET" }] }),
  component: Dashboard,
});

function Kpi({ icon: Icon, label, value, hint }: any) {
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

function Dashboard() {
  const { data: clientCount = 0 } = useQuery({
    queryKey: ["count","clients"],
    queryFn: async () => (await supabase.from("clients").select("*",{count:"exact",head:true})).count ?? 0,
  });
  const { data: productCount = 0 } = useQuery({
    queryKey: ["count","products"],
    queryFn: async () => (await supabase.from("products").select("*",{count:"exact",head:true})).count ?? 0,
  });
  const { data: dispatchCount = 0 } = useQuery({
    queryKey: ["count","dispatches"],
    queryFn: async () => (await supabase.from("dispatches").select("*",{count:"exact",head:true})).count ?? 0,
  });
  const { data: entryCount = 0 } = useQuery({
    queryKey: ["count","entries"],
    queryFn: async () => (await supabase.from("warehouse_entries").select("*",{count:"exact",head:true})).count ?? 0,
  });
  const { data: stockMap = new Map() } = useQuery({ queryKey:["stock"], queryFn: inventoryStock });
  const { data: products = [] } = useQuery({
    queryKey:["products-min"],
    queryFn: async () => (await supabase.from("products").select("id,name,unit")).data ?? [],
  });

  const chartData = products.map((p:any) => ({
    name: p.name.length > 12 ? p.name.slice(0,12)+"…" : p.name,
    weight: Number((stockMap.get(p.id)?.weight ?? 0).toFixed(2)),
  })).slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumen general de operaciones de bodega.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Users} label="Clientes" value={clientCount} />
        <Kpi icon={Package} label="Productos" value={productCount} />
        <Kpi icon={ArrowDownToLine} label="Ingresos a bodega" value={entryCount} />
        <Kpi icon={Truck} label="Despachos" value={dispatchCount} />
      </div>

      <Card className="industrial-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" /> Stock por producto (peso)
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
                <Bar dataKey="weight" fill="oklch(0.55 0.17 145)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
