import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, KeyRound, UserX, UserCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  listAppUsers,
  createAppUser,
  setUserRole,
  setUserActive,
  resetUserPassword,
  deleteAppUser,
  type AppUserRow,
} from "@/services/admin-api.service";
import { roleLabel, type AppRole } from "@/contexts/auth-context";
import { APP_ROLES } from "@/utils/constants";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPage,
});

const ROLES = APP_ROLES;

function UsersPage() {
  const queryClient = useQueryClient();
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["app-users"],
    queryFn: listAppUsers,
  });
  const [open, setOpen] = useState(false);

  const create = useMutation({
    mutationFn: createAppUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["app-users"] });
      setOpen(false);
      toast.success("Usuario creado");
    },
    onError: (error) => toast.error(error.message),
  });

  const role = useMutation({
    mutationFn: setUserRole,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["app-users"] });
      toast.success("Rol actualizado");
    },
    onError: (error) => toast.error(error.message),
  });

  const active = useMutation({
    mutationFn: setUserActive,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["app-users"] });
      toast.success("Estado actualizado");
    },
    onError: (error) => toast.error(error.message),
  });

  const reset = useMutation({
    mutationFn: resetUserPassword,
    onSuccess: () => toast.success("Contraseña restablecida"),
    onError: (error) => toast.error(error.message),
  });

  const del = useMutation({
    mutationFn: deleteAppUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["app-users"] });
      toast.success("Usuario eliminado");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-sm text-muted-foreground">Crea y gestiona accesos al sistema.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo usuario
            </Button>
          </DialogTrigger>
          <CreateForm onSave={(values) => create.mutate(values)} busy={create.isPending} />
        </Dialog>
      </div>
      <Card className="industrial-card p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Último ingreso</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Cargando…
                </TableCell>
              </TableRow>
            )}
            {users.map((user: AppUserRow) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.full_name || "—"}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Select
                    value={user.roles[0] ?? ""}
                    onValueChange={(nextRole) => role.mutate({ user_id: user.id, role: nextRole })}
                  >
                    <SelectTrigger className="w-40 h-8">
                      <SelectValue placeholder="Sin rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {roleLabel(role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {user.active ? (
                    <Badge className="bg-primary/10 text-primary border-primary/20" variant="secondary">
                      Activo
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Inactivo</Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "—"}
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    title={user.active ? "Desactivar" : "Activar"}
                    onClick={() => active.mutate({ user_id: user.id, active: !user.active })}
                  >
                    {user.active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Resetear contraseña"
                    onClick={() => {
                      const password = prompt("Nueva contraseña (mín 8):");
                      if (password && password.length >= 8) {
                        reset.mutate({ user_id: user.id, password });
                      }
                    }}
                  >
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Eliminar"
                    onClick={() => {
                      if (confirm(`Eliminar ${user.email}?`)) {
                        del.mutate({ user_id: user.id });
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
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

function CreateForm({
  onSave,
  busy,
}: {
  onSave: (values: {
    email: string;
    full_name: string;
    password: string;
    role: AppRole;
  }) => void;
  busy: boolean;
}) {
  const [values, setValues] = useState({
    email: "",
    full_name: "",
    password: "",
    role: "bodega" as AppRole,
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nuevo usuario</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Nombre completo</Label>
          <Input
            value={values.full_name}
            onChange={(event) => setValues({ ...values, full_name: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Correo corporativo</Label>
          <Input
            type="email"
            value={values.email}
            onChange={(event) => setValues({ ...values, email: event.target.value })}
            placeholder="usuario@grupo.sitsa.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Contraseña inicial</Label>
          <Input
            type="text"
            value={values.password}
            onChange={(event) => setValues({ ...values, password: event.target.value })}
            minLength={8}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Rol</Label>
          <Select
            value={values.role}
            onValueChange={(role) => setValues({ ...values, role: role as AppRole })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {roleLabel(role)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">
          Solo correos de dominios autorizados pueden registrarse. Configura dominios en Acceso
          autorizado.
        </p>
      </div>
      <DialogFooter>
        <Button
          disabled={busy || !values.email || !values.full_name || values.password.length < 8}
          onClick={() => onSave(values)}
        >
          Crear usuario
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
