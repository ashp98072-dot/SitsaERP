import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/clients")({
  head: () => ({ meta: [{ title: "Clientes" }] }),
  component: ClientsPage,
});

type ClientRow = {
  id: string; company: string; nit?: string|null; contact_name?: string|null;
  email?: string|null; phone?: string|null; address?: string|null; notes?: string|null; active: boolean;
};

function ClientsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey:["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("company");
      if (error) throw error; return data as ClientRow[];
    },
  });

  const save = useMutation({
    mutationFn: async (payload: Partial<ClientRow>) => {
      if (editing) {
        const { error } = await supabase.from("clients").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clients").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey:["clients"] }); setOpen(false); setEditing(null); toast.success("Guardado"); },
    onError: (e:any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey:["clients"] }); toast.success("Eliminado"); },
    onError: (e:any) => toast.error(e.message),
  });

  const filtered = clients.filter(c =>
    [c.company, c.nit, c.contact_name, c.email].some(v => v?.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">Gestión de clientes y receptores de despacho.</p>
        </div>
        <Dialog open={open} onOpenChange={(o)=>{ setOpen(o); if(!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={()=>setEditing(null)}><Plus className="h-4 w-4 mr-2" />Nuevo cliente</Button>
          </DialogTrigger>
          <ClientForm editing={editing} onSave={(v)=>save.mutate(v)} busy={save.isPending} />
        </Dialog>
      </div>

      <Card className="industrial-card p-4">
        <div className="relative max-w-sm mb-3">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por empresa, NIT, contacto…" className="pl-9" value={q} onChange={(e)=>setQ(e.target.value)} />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>NIT</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Cargando…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Sin resultados</TableCell></TableRow>
            ) : filtered.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.company}</TableCell>
                <TableCell>{c.nit || "—"}</TableCell>
                <TableCell>{c.contact_name || "—"}</TableCell>
                <TableCell>{c.email || "—"}</TableCell>
                <TableCell>{c.phone || "—"}</TableCell>
                <TableCell>{c.active ? <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">Activo</Badge> : <Badge variant="outline">Inactivo</Badge>}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={()=>{ setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={()=>{ if(confirm(`Eliminar ${c.company}?`)) del.mutate(c.id); }}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function ClientForm({ editing, onSave, busy }: { editing: ClientRow|null; onSave: (v:any)=>void; busy: boolean }) {
  const [v, setV] = useState({
    company: editing?.company ?? "",
    nit: editing?.nit ?? "",
    contact_name: editing?.contact_name ?? "",
    email: editing?.email ?? "",
    phone: editing?.phone ?? "",
    address: editing?.address ?? "",
    notes: editing?.notes ?? "",
    active: editing?.active ?? true,
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{editing ? "Editar cliente" : "Nuevo cliente"}</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5"><Label>Empresa *</Label><Input value={v.company} onChange={(e)=>setV({...v, company:e.target.value})} /></div>
        <div className="space-y-1.5"><Label>NIT</Label><Input value={v.nit||""} onChange={(e)=>setV({...v, nit:e.target.value})} /></div>
        <div className="space-y-1.5"><Label>Contacto</Label><Input value={v.contact_name||""} onChange={(e)=>setV({...v, contact_name:e.target.value})} /></div>
        <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={v.email||""} onChange={(e)=>setV({...v, email:e.target.value})} /></div>
        <div className="space-y-1.5"><Label>Teléfono</Label><Input value={v.phone||""} onChange={(e)=>setV({...v, phone:e.target.value})} /></div>
        <div className="col-span-2 space-y-1.5"><Label>Dirección</Label><Input value={v.address||""} onChange={(e)=>setV({...v, address:e.target.value})} /></div>
        <div className="col-span-2 space-y-1.5"><Label>Notas</Label><Input value={v.notes||""} onChange={(e)=>setV({...v, notes:e.target.value})} /></div>
      </div>
      <DialogFooter>
        <Button disabled={busy || !v.company} onClick={()=>onSave(v)}>Guardar</Button>
      </DialogFooter>
    </DialogContent>
  );
}
