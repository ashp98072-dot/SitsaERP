import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, FileDown } from "lucide-react";
import { toast } from "sonner";
import { generateDispatchPdf } from "@/lib/pdf";

export const Route = createFileRoute("/_authenticated/dispatches/new")({
  head: () => ({ meta: [{ title: "Nuevo despacho" }] }),
  component: NewDispatch,
});

type Item = { product_id: string; quantity: number; weight: number; unit: string; notes?: string };

function NewDispatch() {
  const navigate = useNavigate();
  const { data: clients = [] } = useQuery({ queryKey:["clients-min"], queryFn: async () => (await supabase.from("clients").select("*")).data ?? [] });
  const { data: products = [] } = useQuery({ queryKey:["products-min"], queryFn: async () => (await supabase.from("products").select("id,code,name,unit")).data ?? [] });
  const [head, setHead] = useState({
    client_id: "", driver: "", vehicle: "", notes: "",
    dispatch_date: new Date().toISOString().slice(0,10),
  });
  const [items, setItems] = useState<Item[]>([]);
  const [draft, setDraft] = useState<Item>({ product_id:"", quantity:0, weight:0, unit:"lbs" });

  function addItem() {
    if (!draft.product_id || draft.quantity <= 0) return toast.error("Producto y cantidad requeridos");
    setItems([...items, draft]);
    setDraft({ product_id:"", quantity:0, weight:0, unit:"lbs" });
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!head.client_id) throw new Error("Cliente requerido");
      if (items.length === 0) throw new Error("Agrega al menos un producto");
      const { data: disp, error } = await supabase.from("dispatches").insert(head as any).select().single();
      if (error) throw error;
      const rows = items.map(it => ({ ...it, dispatch_id: disp.id }));
      const { error: e2 } = await supabase.from("dispatch_items").insert(rows as any);
      if (e2) throw e2;
      return disp;
    },
    onSuccess: async (disp: any) => {
      toast.success(`Despacho DM-${String(disp.folio).padStart(6,"0")} creado`);
      const client = (clients as any[]).find(c=>c.id===disp.client_id);
      const pById = new Map((products as any[]).map(p=>[p.id,p]));
      await generateDispatchPdf({
        folio: disp.folio, date: disp.dispatch_date,
        client: client ?? { company:"—" }, driver: disp.driver, vehicle: disp.vehicle, notes: disp.notes,
        items: items.map(it => ({ code: pById.get(it.product_id)?.code ?? "", name: pById.get(it.product_id)?.name ?? "", quantity: it.quantity, weight: it.weight, unit: it.unit })),
      });
      navigate({ to: "/dispatches" });
    },
    onError: (e:any) => toast.error(e.message),
  });

  const pById = new Map((products as any[]).map(p=>[p.id,p]));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Nuevo despacho</h1>
        <p className="text-sm text-muted-foreground">Genera el comprobante de salida de mercadería.</p>
      </div>

      <Card className="industrial-card p-5 space-y-4">
        <div className="grid md:grid-cols-4 gap-3">
          <div className="md:col-span-2 space-y-1.5"><Label>Cliente *</Label>
            <Select value={head.client_id} onValueChange={(v)=>setHead({...head, client_id:v})}>
              <SelectTrigger><SelectValue placeholder="Seleccionar cliente…" /></SelectTrigger>
              <SelectContent>{(clients as any[]).map(c=><SelectItem key={c.id} value={c.id}>{c.company}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Fecha</Label><Input type="date" value={head.dispatch_date} onChange={(e)=>setHead({...head, dispatch_date:e.target.value})} /></div>
          <div className="space-y-1.5"><Label>Vehículo / Placa</Label><Input value={head.vehicle} onChange={(e)=>setHead({...head, vehicle:e.target.value})} /></div>
          <div className="space-y-1.5"><Label>Piloto</Label><Input value={head.driver} onChange={(e)=>setHead({...head, driver:e.target.value})} /></div>
          <div className="md:col-span-3 space-y-1.5"><Label>Observaciones</Label><Input value={head.notes} onChange={(e)=>setHead({...head, notes:e.target.value})} /></div>
        </div>
      </Card>

      <Card className="industrial-card p-5 space-y-4">
        <div className="text-sm font-semibold">Productos a despachar</div>
        <div className="grid md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2 space-y-1.5"><Label>Producto</Label>
            <Select value={draft.product_id} onValueChange={(id)=>{ const p:any = pById.get(id); setDraft({...draft, product_id:id, unit: p?.unit ?? draft.unit}); }}>
              <SelectTrigger><SelectValue placeholder="Producto…" /></SelectTrigger>
              <SelectContent>{(products as any[]).map(p=><SelectItem key={p.id} value={p.id}>{p.code} · {p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Cantidad</Label><Input type="number" step="0.01" value={draft.quantity} onChange={(e)=>setDraft({...draft, quantity:Number(e.target.value)})} /></div>
          <div className="space-y-1.5"><Label>Peso</Label><Input type="number" step="0.01" value={draft.weight} onChange={(e)=>setDraft({...draft, weight:Number(e.target.value)})} /></div>
          <div className="space-y-1.5"><Label>Unidad</Label>
            <Select value={draft.unit} onValueChange={(u)=>setDraft({...draft, unit:u})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["lbs","kg","ton","unidad"].map(u=><SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button type="button" onClick={addItem}><Plus className="h-4 w-4 mr-1"/>Agregar</Button>
        </div>

        <Table>
          <TableHeader><TableRow>
            <TableHead>Producto</TableHead><TableHead className="text-right">Cant.</TableHead>
            <TableHead className="text-right">Peso</TableHead><TableHead>Unidad</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.map((it, i) => (
              <TableRow key={i}>
                <TableCell>{(pById.get(it.product_id) as any)?.name ?? "—"}</TableCell>
                <TableCell className="text-right">{it.quantity}</TableCell>
                <TableCell className="text-right">{it.weight}</TableCell>
                <TableCell>{it.unit}</TableCell>
                <TableCell className="text-right"><Button size="icon" variant="ghost" onClick={()=>setItems(items.filter((_,j)=>j!==i))}><Trash2 className="h-4 w-4"/></Button></TableCell>
              </TableRow>
            ))}
            {items.length===0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Aún no hay productos</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={()=>navigate({ to:"/dispatches" })}>Cancelar</Button>
        <Button disabled={save.isPending} onClick={()=>save.mutate()}><FileDown className="h-4 w-4 mr-2"/>Guardar y generar PDF</Button>
      </div>
    </div>
  );
}
