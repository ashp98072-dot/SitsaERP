import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, KeyRound, UserX, UserCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { listAppUsers, createAppUser, setUserRole, setUserActive, resetUserPassword, deleteAppUser } from "@/lib/admin.functions";
import { roleLabel, type AppRole } from "@/contexts/auth-context";
import { APP_ROLES } from "@/utils/constants";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Usuarios" }] }),
  component: UsersPage,
});

const ROLES = APP_ROLES;

function UsersPage() {
  const qc = useQueryClient();
  const fnList = useServerFn(listAppUsers);
  const fnCreate = useServerFn(createAppUser);
  const fnRole = useServerFn(setUserRole);
  const fnActive = useServerFn(setUserActive);
  const fnReset = useServerFn(resetUserPassword);
  const fnDelete = useServerFn(deleteAppUser);

  const { data: users = [], isLoading } = useQuery({ queryKey:["app-users"], queryFn: () => fnList() });
  const [open, setOpen] = useState(false);

  const create = useMutation({
    mutationFn: (v:any) => fnCreate({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey:["app-users"] }); setOpen(false); toast.success("Usuario creado"); },
    onError: (e:any) => toast.error(e.message),
  });
  const role = useMutation({
    mutationFn: (v:any) => fnRole({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey:["app-users"] }); toast.success("Rol actualizado"); },
    onError: (e:any) => toast.error(e.message),
  });
  const active = useMutation({
    mutationFn: (v:any) => fnActive({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey:["app-users"] }); toast.success("Estado actualizado"); },
    onError: (e:any) => toast.error(e.message),
  });
  const reset = useMutation({
    mutationFn: (v:any) => fnReset({ data: v }),
    onSuccess: () => toast.success("Contraseña restablecida"),
    onError: (e:any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (v:any) => fnDelete({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey:["app-users"] }); toast.success("Usuario eliminado"); },
    onError: (e:any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-sm text-muted-foreground">Crea y gestiona accesos al sistema.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2"/>Nuevo usuario</Button></DialogTrigger>
          <CreateForm onSave={(v)=>create.mutate(v)} busy={create.isPending} />
        </Dialog>
      </div>
      <Card className="industrial-card p-4">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Usuario</TableHead><TableHead>Email</TableHead><TableHead>Rol</TableHead>
            <TableHead>Estado</TableHead><TableHead>Último ingreso</TableHead><TableHead className="text-right">Acciones</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Cargando…</TableCell></TableRow>}
            {(users as any[]).map(u => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Select value={u.roles[0] ?? ""} onValueChange={(r)=>role.mutate({ user_id: u.id, role: r })}>
                    <SelectTrigger className="w-40 h-8"><SelectValue placeholder="Sin rol" /></SelectTrigger>
                    <SelectContent>{ROLES.map(r=><SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{u.active ? <Badge className="bg-primary/10 text-primary border-primary/20" variant="secondary">Activo</Badge> : <Badge variant="destructive">Inactivo</Badge>}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "—"}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="icon" variant="ghost" title={u.active?"Desactivar":"Activar"} onClick={()=>active.mutate({ user_id:u.id, active: !u.active })}>
                    {u.active ? <UserX className="h-4 w-4"/> : <UserCheck className="h-4 w-4"/>}
                  </Button>
                  <Button size="icon" variant="ghost" title="Resetear contraseña" onClick={()=>{ const p = prompt("Nueva contraseña (mín 8):"); if (p && p.length>=8) reset.mutate({ user_id:u.id, password: p }); }}>
                    <KeyRound className="h-4 w-4"/>
                  </Button>
                  <Button size="icon" variant="ghost" title="Eliminar" onClick={()=>{ if (confirm(`Eliminar ${u.email}?`)) del.mutate({ user_id: u.id }); }}>
                    <Trash2 className="h-4 w-4"/>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function CreateForm({ onSave, busy }: { onSave:(v:any)=>void; busy:boolean }) {
  const [v, setV] = useState({ email:"", full_name:"", password:"", role: "bodega" as AppRole });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nuevo usuario</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5"><Label>Nombre completo</Label><Input value={v.full_name} onChange={(e)=>setV({...v, full_name:e.target.value})} /></div>
        <div className="space-y-1.5"><Label>Correo corporativo</Label><Input type="email" value={v.email} onChange={(e)=>setV({...v, email:e.target.value})} placeholder="usuario@grupo.sitsa.com" /></div>
        <div className="space-y-1.5"><Label>Contraseña inicial</Label><Input type="text" value={v.password} onChange={(e)=>setV({...v, password:e.target.value})} minLength={8} /></div>
        <div className="space-y-1.5"><Label>Rol</Label>
          <Select value={v.role} onValueChange={(r)=>setV({...v, role: r as AppRole})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ROLES.map(r=><SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">Solo correos de dominios autorizados pueden registrarse. Configura dominios en la pestaña Acceso autorizado.</p>
      </div>
      <DialogFooter>
        <Button disabled={busy || !v.email || !v.full_name || v.password.length<8} onClick={()=>onSave(v)}>Crear usuario</Button>
      </DialogFooter>
    </DialogContent>
  );
}
