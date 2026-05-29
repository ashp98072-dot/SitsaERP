import { useState } from "react";
import { ArrowDownToLine, Plus } from "lucide-react";
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
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { PaginationControls } from "@/components/common/PaginationControls";
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { useCreateEntry, useEntryFormData, useWarehouseEntriesPage } from "@/hooks/use-entries";
import { indexById } from "@/utils/maps";
import { EntryForm } from "./EntryForm";

export function EntriesPage() {
  const [page, setPage] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data, isLoading } = useWarehouseEntriesPage(page);
  const { products, suppliers } = useEntryFormData();
  const create = useCreateEntry();

  const productById = indexById(products.data ?? []);
  const rows = data?.rows ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ingresos a Bodega"
        description="Registro de mercadería que entra al almacén."
        actions={
          <PermissionGate permission="entries:write">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo ingreso
                </Button>
              </DialogTrigger>
              <EntryForm
                products={products.data ?? []}
                suppliers={suppliers.data ?? []}
                busy={create.isPending}
                onSave={(payload) =>
                  create.mutate(payload, { onSuccess: () => setDialogOpen(false) })
                }
              />
            </Dialog>
          </PermissionGate>
        }
      />

      <Card className="industrial-card p-4">
        {isLoading ? (
          <TableSkeleton columns={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ArrowDownToLine}
            title="Sin ingresos"
            description="Registra el primer ingreso de mercadería a bodega."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Folio</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Peso</TableHead>
                  <TableHead>Unidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono">#{entry.folio}</TableCell>
                    <TableCell>{entry.entry_date}</TableCell>
                    <TableCell>{productById.get(entry.product_id)?.name ?? "—"}</TableCell>
                    <TableCell className="text-right">{Number(entry.quantity).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{Number(entry.weight).toFixed(2)}</TableCell>
                    <TableCell>{entry.unit}</TableCell>
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
    </div>
  );
}
