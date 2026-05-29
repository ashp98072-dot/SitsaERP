import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({ meta: [{ title: "Productos" }] }),
  component: ProductsPage,
});

const UNITS = ["lbs","kg","ton","unidad"] as const;
type Prod = { id:string; code:string; name:string; category?:string|null; description?:string|null; unit:typeof UNITS[number]; price:number; min_stock:number; unit_weight:number; active:boolean };

function ProductsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Prod|null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey:["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error; return data as Prod[];
    },
  });

  const save = useMutation({
    mutationFn: async (p: Partial<Prod>) => {
      if (editing) {
        const { error } = await supabase.from("products").update(p).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(p as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey:["products"] }); setOpen(false); setEditing(null); toast.success("Guardado"); },
    onError: (e:any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id:string) => { const { error } = await supabase.from("products").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey:["products"] }); toast.success("Eliminado"); },
    onError: (e:any) => toast.error(e.message),
  });

  const filtered = products.filter(p => [p.name, p.code, p.category].some(v => v?.toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="text-sm text-muted-foreground">Catálogo de mercadería y materiales.</p>
        </div>
        <Dialog open={open} onOpenChange={(o)=>{ setOpen(o); if(!o) setEditing(null); }}>
          <DialogTrigger asChild><Button onClick={()=>setEditing(null)}><Plus className="h-4 w-4 mr-2"/>Nuevo producto</Button></DialogTrigger>
          <ProductForm editing={editing} onSave={(v)=>save.mutate(v)} busy={save.isPending} />
        </Dialog>
      </div>

      <Card className="industrial-card p-4">
        <div className="relative max-w-sm mb-3">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, código o categoría…" className="pl-9" value={q} onChange={(e)=>setQ(e.target.value)} />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Stock mín.</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Cargando…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Sin resultados</TableCell></TableRow>
            ) : filtered.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.code}</TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.category || "—"}</TableCell>
                <TableCell><Badge variant="outline">{p.unit}</Badge></TableCell>
                <TableCell className="text-right">{Number(p.price).toFixed(2)}</TableCell>
                <TableCell className="text-right">{Number(p.min_stock).toFixed(2)}</TableCell>
                <TableCell>{p.active ? <Badge className="bg-primary/10 text-primary border-primary/20" variant="secondary">Activo</Badge> : <Badge variant="outline">Inactivo</Badge>}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={()=>{ setEditing(p); setOpen(true); }}><Pencil className="h-4 w-4"/></Button>
                  <Button size="icon" variant="ghost" onClick={()=>{ if(confirm(`Eliminar ${p.name}?`)) del.mutate(p.id); }}><Trash2 className="h-4 w-4"/></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function ProductForm({ editing, onSave, busy }: { editing: Prod|null; onSave:(v:any)=>void; busy:boolean }) {
  const [v, setV] = useState({
    code: editing?.code ?? "",
    name: editing?.name ?? "",
    category: editing?.category ?? "",
    description: editing?.description ?? "",
    unit: (editing?.unit ?? "lbs") as Prod["unit"],
    price: editing?.price ?? 0,
    min_stock: editing?.min_stock ?? 0,
    unit_weight: editing?.unit_weight ?? 0,
    active: editing?.active ?? true,
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{editing?"Editar producto":"Nuevo producto"}</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Código *</Label><Input value={v.code} onChange={(e)=>setV({...v, code:e.target.value})} /></div>
        <div className="space-y-1.5"><Label>Unidad</Label>
          <Select value={v.unit} onValueChange={(u)=>setV({...v, unit: u as Prod["unit"]})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{UNITS.map(u=><SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-1.5"><Label>Nombre *</Label><Input value={v.name} onChange={(e)=>setV({...v, name:e.target.value})} /></div>
        <div className="space-y-1.5"><Label>Categoría</Label><Input value={v.category||""} onChange={(e)=>setV({...v, category:e.target.value})} /></div>
        <div className="space-y-1.5"><Label>Precio</Label><Input type="number" step="0.01" value={v.price} onChange={(e)=>setV({...v, price:Number(e.target.value)})} /></div>
        <div className="space-y-1.5"><Label>Stock mínimo</Label><Input type="number" step="0.01" value={v.min_stock} onChange={(e)=>setV({...v, min_stock:Number(e.target.value)})} /></div>
        <div className="space-y-1.5"><Label>Peso por unidad</Label><Input type="number" step="0.01" value={v.unit_weight} onChange={(e)=>setV({...v, unit_weight:Number(e.target.value)})} /></div>
        <div className="col-span-2 space-y-1.5"><Label>Descripción</Label><Input value={v.description||""} onChange={(e)=>setV({...v, description:e.target.value})} /></div>
      </div>
      <DialogFooter>
        <Button disabled={busy || !v.code || !v.name} onClick={()=>onSave(v)}>Guardar</Button>
      </DialogFooter>
    </DialogContent>
  );
}
