import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/entries")({
  head: () => ({ meta: [{ title: "Ingresos a Bodega" }] }),
  component: EntriesPage,
});

function EntriesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: entries = [] } = useQuery({
    queryKey:["entries"],
    queryFn: async () => (await supabase.from("warehouse_entries").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: products = [] } = useQuery({
    queryKey:["products"],
    queryFn: async () => (await supabase.from("products").select("id,code,name,unit").order("name")).data ?? [],
  });
  const { data: suppliers = [] } = useQuery({
    queryKey:["suppliers"],
    queryFn: async () => (await supabase.from("suppliers").select("id,name").order("name")).data ?? [],
  });
  const productById = new Map((products as any[]).map(p => [p.id, p]));

  const create = useMutation({
    mutationFn: async (v:any) => { const { error } = await supabase.from("warehouse_entries").insert(v); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey:["entries"] }); qc.invalidateQueries({ queryKey:["stock"] }); setOpen(false); toast.success("Ingreso registrado"); },
    onError: (e:any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ingresos a Bodega</h1>
          <p className="text-sm text-muted-foreground">Registro de mercadería que entra al almacén.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2"/>Nuevo ingreso</Button></DialogTrigger>
          <EntryForm products={products as any} suppliers={suppliers as any} onSave={(v)=>create.mutate(v)} busy={create.isPending} />
        </Dialog>
      </div>
      <Card className="industrial-card p-4">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Folio</TableHead><TableHead>Fecha</TableHead><TableHead>Producto</TableHead>
            <TableHead className="text-right">Cantidad</TableHead><TableHead className="text-right">Peso</TableHead><TableHead>Unidad</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(entries as any[]).map(e => (
              <TableRow key={e.id}>
                <TableCell className="font-mono">#{e.folio}</TableCell>
                <TableCell>{e.entry_date}</TableCell>
                <TableCell>{productById.get(e.product_id)?.name ?? "—"}</TableCell>
                <TableCell className="text-right">{Number(e.quantity).toFixed(2)}</TableCell>
                <TableCell className="text-right">{Number(e.weight).toFixed(2)}</TableCell>
                <TableCell>{e.unit}</TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sin ingresos</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function EntryForm({ products, suppliers, onSave, busy }:{ products:any[]; suppliers:any[]; onSave:(v:any)=>void; busy:boolean }) {
  const [v, setV] = useState({
    product_id: "", supplier_id: "", quantity: 0, weight: 0, unit: "lbs",
    entry_date: new Date().toISOString().slice(0,10), notes: "",
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nuevo ingreso a bodega</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5"><Label>Producto *</Label>
          <Select value={v.product_id} onValueChange={(id)=>{ const p = products.find(p=>p.id===id); setV({...v, product_id:id, unit: p?.unit ?? v.unit}); }}>
            <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
            <SelectContent>{products.map(p=><SelectItem key={p.id} value={p.id}>{p.code} · {p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-1.5"><Label>Proveedor</Label>
          <Select value={v.supplier_id} onValueChange={(id)=>setV({...v, supplier_id:id})}>
            <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
            <SelectContent>{suppliers.map(s=><SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Fecha</Label><Input type="date" value={v.entry_date} onChange={(e)=>setV({...v, entry_date:e.target.value})} /></div>
        <div className="space-y-1.5"><Label>Unidad</Label>
          <Select value={v.unit} onValueChange={(u)=>setV({...v, unit:u})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["lbs","kg","ton","unidad"].map(u=><SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Cantidad *</Label><Input type="number" step="0.01" value={v.quantity} onChange={(e)=>setV({...v, quantity:Number(e.target.value)})} /></div>
        <div className="space-y-1.5"><Label>Peso *</Label><Input type="number" step="0.01" value={v.weight} onChange={(e)=>setV({...v, weight:Number(e.target.value)})} /></div>
        <div className="col-span-2 space-y-1.5"><Label>Notas</Label><Input value={v.notes} onChange={(e)=>setV({...v, notes:e.target.value})} /></div>
      </div>
      <DialogFooter>
        <Button disabled={busy || !v.product_id || v.quantity<=0} onClick={()=>onSave({
          ...v, supplier_id: v.supplier_id || null,
        })}>Guardar ingreso</Button>
      </DialogFooter>
    </DialogContent>
  );
}
