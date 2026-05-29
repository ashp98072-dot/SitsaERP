import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { FileDown, Plus, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { useClientSummaries } from "@/hooks/use-clients";
import { useDispatchesPage } from "@/hooks/use-dispatches";
import { downloadDispatchPdfById } from "@/pdf";
import { indexById } from "@/utils/maps";
import { getErrorMessage } from "@/utils/errors";
import type { Dispatch } from "@/types";

export function DispatchesPage() {
  const [page, setPage] = useState(0);
  const { data, isLoading } = useDispatchesPage(page);
  const { data: clients = [] } = useClientSummaries();
  const clientsById = indexById(clients);

  async function handleDownload(dispatch: Dispatch) {
    try {
      await downloadDispatchPdfById(dispatch);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const rows = data?.rows ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Despachos"
        description="Mercadería entregada a clientes con comprobante PDF."
        actions={
          <PermissionGate permission="dispatches:write">
            <Button asChild>
              <Link to="/dispatches/new">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo despacho
              </Link>
            </Button>
          </PermissionGate>
        }
      />

      <Card className="industrial-card p-4">
        {isLoading ? (
          <TableSkeleton columns={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="Sin despachos"
            description="Aún no hay despachos registrados en el sistema."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Folio</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Piloto</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((dispatch) => (
                  <TableRow key={dispatch.id}>
                    <TableCell className="font-mono">
                      DM-{String(dispatch.folio).padStart(6, "0")}
                    </TableCell>
                    <TableCell>{dispatch.dispatch_date}</TableCell>
                    <TableCell>{clientsById.get(dispatch.client_id)?.company ?? "—"}</TableCell>
                    <TableCell>{dispatch.driver || "—"}</TableCell>
                    <TableCell>{dispatch.vehicle || "—"}</TableCell>
                    <TableCell className="text-right">
                      <PermissionGate permission="dispatches:pdf">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleDownload(dispatch)}
                        >
                          <FileDown className="h-4 w-4 mr-1" />
                          PDF
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
    </div>
  );
}
