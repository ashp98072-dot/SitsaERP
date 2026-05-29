import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { inventoryStock } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({ meta: [{ title: "Inventario" }] }),
  component: InventoryPage,
});

function InventoryPage() {
  const [q, setQ] = useState("");
  const { data: products = [] } = useQuery({
    queryKey:["products"],
    queryFn: async () => (await supabase.from("products").select("*").order("name")).data ?? [],
  });
  const { data: stock = new Map() } = useQuery({ queryKey:["stock"], queryFn: inventoryStock });

  const rows = (products as any[])
    .filter(p => [p.name, p.code].some(v => v?.toLowerCase().includes(q.toLowerCase())))
    .map(p => ({
      ...p,
      qty: stock.get(p.id)?.qty ?? 0,
      weight: stock.get(p.id)?.weight ?? 0,
    }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Inventario</h1>
        <p className="text-sm text-muted-foreground">Stock actual basado en movimientos de bodega.</p>
      </div>
      <Card className="industrial-card p-4">
        <div className="relative max-w-sm mb-3">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar producto…" className="pl-9" value={q} onChange={(e)=>setQ(e.target.value)} />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead className="text-right">Stock (cant.)</TableHead>
              <TableHead className="text-right">Stock (peso)</TableHead>
              <TableHead className="text-right">Mínimo</TableHead>
              <TableHead>Alerta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => {
              const low = r.qty <= r.min_stock;
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.code}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell><Badge variant="outline">{r.unit}</Badge></TableCell>
                  <TableCell className="text-right">{Number(r.qty).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{Number(r.weight).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{Number(r.min_stock).toFixed(2)}</TableCell>
                  <TableCell>{low ? <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3"/>Bajo</Badge> : <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">OK</Badge>}</TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Sin productos</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
