import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, Plus, Truck } from "lucide-react";
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
import { formatDispatchCorrelative } from "@/services/dispatch/dispatch-pdf.service";
import { BRAND } from "@/lib/brand";
import { indexById } from "@/utils/maps";
import type { Dispatch } from "@/types";
import type { DispatchStatus } from "@/types/dispatch";
import { DispatchKpiCards } from "./DispatchKpiCards";
import { DispatchStatusBadge } from "./DispatchStatusBadge";

export function DispatchesPage() {
  const [page, setPage] = useState(0);
  const { data, isLoading } = useDispatchesPage(page);
  const { data: clients = [] } = useClientSummaries();
  const clientsById = indexById(clients);

  const rows = data?.rows ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Despachos"
        description={`Control logístico y comprobantes · ${BRAND.company}`}
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

      <DispatchKpiCards />

      <Card className="industrial-card p-4">
        {isLoading ? (
          <TableSkeleton columns={7} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="Sin despachos"
            description="Cree un borrador para iniciar el flujo de aprobación y salida de inventario."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Correlativo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Piloto</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((dispatch) => (
                  <DispatchRow
                    key={dispatch.id}
                    dispatch={dispatch}
                    clientName={clientsById.get(dispatch.client_id)?.company ?? "—"}
                  />
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

function DispatchRow({ dispatch, clientName }: { dispatch: Dispatch; clientName: string }) {
  const correlative = formatDispatchCorrelative(dispatch);

  return (
    <TableRow>
      <TableCell className="font-mono text-xs font-semibold">{correlative}</TableCell>
      <TableCell>
        <DispatchStatusBadge status={dispatch.status as DispatchStatus} />
      </TableCell>
      <TableCell>{dispatch.dispatch_date}</TableCell>
      <TableCell>{clientName}</TableCell>
      <TableCell>{dispatch.driver || "—"}</TableCell>
      <TableCell>{dispatch.vehicle || "—"}</TableCell>
      <TableCell className="text-right">
        <Button size="sm" variant="outline" asChild>
          <Link to="/dispatches/$dispatchId" params={{ dispatchId: dispatch.id }}>
            <Eye className="h-4 w-4 mr-1" />
            Detalle
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}
