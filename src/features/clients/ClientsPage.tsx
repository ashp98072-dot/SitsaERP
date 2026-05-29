import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { PaginationControls } from "@/components/common/PaginationControls";
import { SearchField } from "@/components/common/SearchField";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { useClientMutations, useClientsPage, type Client } from "@/hooks/use-clients";
import { matchesSearch } from "@/utils/search";
import { ClientForm } from "./ClientForm";

export function ClientsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  const { data, isLoading } = useClientsPage(page);
  const { save, remove } = useClientMutations();

  const filtered = useMemo(
    () =>
      (data?.rows ?? []).filter((client) =>
        matchesSearch(search, [client.company, client.nit, client.contact_name, client.email]),
      ),
    [data?.rows, search],
  );

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clientes"
        description="Gestión de clientes y receptores de despacho."
        actions={
          <PermissionGate permission="clients:write">
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) setEditing(null);
              }}
            >
              <DialogTrigger asChild>
                <Button onClick={() => setEditing(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo cliente
                </Button>
              </DialogTrigger>
              <ClientForm
                editing={editing}
                busy={save.isPending}
                onSave={(values) =>
                  save.mutate(
                    { editingId: editing?.id, payload: values },
                    { onSuccess: closeDialog },
                  )
                }
              />
            </Dialog>
          </PermissionGate>
        }
      />

      <Card className="industrial-card p-4">
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Buscar por empresa, NIT, contacto…"
        />
        {isLoading ? (
          <TableSkeleton columns={7} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Sin clientes"
            description="No hay clientes en esta página o coinciden con tu búsqueda."
          />
        ) : (
          <>
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
                {filtered.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.company}</TableCell>
                    <TableCell>{client.nit || "—"}</TableCell>
                    <TableCell>{client.contact_name || "—"}</TableCell>
                    <TableCell>{client.email || "—"}</TableCell>
                    <TableCell>{client.phone || "—"}</TableCell>
                    <TableCell>
                      <StatusBadge active={client.active} />
                    </TableCell>
                    <TableCell className="text-right">
                      <PermissionGate permission="clients:write">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditing(client);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteTarget(client)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </PermissionGate>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {data && (
              <PaginationControls
                page={data.page}
                pageCount={data.pageCount}
                total={data.total}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar cliente"
        description={<>¿Confirmas eliminar <strong>{deleteTarget?.company}</strong>? Esta acción no se puede deshacer.</>}
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => {
          if (deleteTarget) remove.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
