import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileDown } from "lucide-react";
import { toast } from "sonner";
import { generateDispatchPdf } from "@/lib/pdf";

export const Route = createFileRoute("/_authenticated/dispatches")({
  head: () => ({ meta: [{ title: "Despachos" }] }),
  component: DispatchesPage,
});

function DispatchesPage() {
  const { data: dispatches = [] } = useQuery({
    queryKey:["dispatches"],
    queryFn: async () => (await supabase.from("dispatches").select("*").order("created_at",{ascending:false})).data ?? [],
  });
  const { data: clients = [] } = useQuery({
    queryKey:["clients-min"],
    queryFn: async () => (await supabase.from("clients").select("id,company,nit,address,contact_name")).data ?? [],
  });
  const cById = new Map((clients as any[]).map(c => [c.id, c]));

  async function downloadPdf(d: any) {
    try {
      const [{ data: items }, { data: products }] = await Promise.all([
        supabase.from("dispatch_items").select("*").eq("dispatch_id", d.id),
        supabase.from("products").select("id,code,name"),
      ]);
      const pById = new Map((products ?? []).map(p => [p.id, p]));
      await generateDispatchPdf({
        folio: d.folio,
        date: d.dispatch_date,
        client: cById.get(d.client_id) ?? { company: "—" },
        driver: d.driver, vehicle: d.vehicle, notes: d.notes,
        items: (items ?? []).map((it:any) => ({
          code: pById.get(it.product_id)?.code ?? "",
          name: pById.get(it.product_id)?.name ?? "",
          quantity: it.quantity, weight: it.weight, unit: it.unit, notes: it.notes,
        })),
      });
    } catch (e:any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Despachos</h1>
          <p className="text-sm text-muted-foreground">Mercadería entregada a clientes con comprobante PDF.</p>
        </div>
        <Button asChild><Link to="/dispatches/new"><Plus className="h-4 w-4 mr-2"/>Nuevo despacho</Link></Button>
      </div>
      <Card className="industrial-card p-4">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Folio</TableHead><TableHead>Fecha</TableHead><TableHead>Cliente</TableHead>
            <TableHead>Piloto</TableHead><TableHead>Vehículo</TableHead><TableHead className="text-right">Acciones</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(dispatches as any[]).map(d => (
              <TableRow key={d.id}>
                <TableCell className="font-mono">DM-{String(d.folio).padStart(6,"0")}</TableCell>
                <TableCell>{d.dispatch_date}</TableCell>
                <TableCell>{cById.get(d.client_id)?.company ?? "—"}</TableCell>
                <TableCell>{d.driver || "—"}</TableCell>
                <TableCell>{d.vehicle || "—"}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={()=>downloadPdf(d)}><FileDown className="h-4 w-4 mr-1"/>PDF</Button>
                </TableCell>
              </TableRow>
            ))}
            {dispatches.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sin despachos</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
