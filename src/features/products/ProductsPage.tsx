import { useMemo, useState } from "react";
import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { useProductMutations, useProductsPage, type Product } from "@/hooks/use-products";
import { matchesSearch } from "@/utils/search";
import { ProductForm } from "./ProductForm";

export function ProductsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const { data, isLoading } = useProductsPage(page);
  const { save, remove } = useProductMutations();

  const filtered = useMemo(
    () =>
      (data?.rows ?? []).filter((product) =>
        matchesSearch(search, [product.name, product.code, product.category]),
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
        title="Productos"
        description="Catálogo de mercadería y materiales."
        actions={
          <PermissionGate permission="products:write">
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
                  Nuevo producto
                </Button>
              </DialogTrigger>
              <ProductForm
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
          placeholder="Buscar por nombre, código o categoría…"
        />
        {isLoading ? (
          <TableSkeleton columns={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Sin productos"
            description="No hay productos en esta página o coinciden con tu búsqueda."
          />
        ) : (
          <>
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
                {filtered.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-xs">{product.code}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.category || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.unit}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{Number(product.price).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{Number(product.min_stock).toFixed(2)}</TableCell>
                    <TableCell>
                      <StatusBadge active={product.active} />
                    </TableCell>
                    <TableCell className="text-right">
                      <PermissionGate permission="products:write">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditing(product);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteTarget(product)}
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
        title="Eliminar producto"
        description={<>¿Confirmas eliminar <strong>{deleteTarget?.name}</strong>?</>}
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
