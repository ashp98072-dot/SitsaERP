import { Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Eye, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageLoader } from "@/components/common/PageLoader";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { useClientSummaries } from "@/hooks/use-clients";
import {
  useDispatch,
  useDispatchTimeline,
  useTransitionDispatch,
} from "@/hooks/use-dispatches";
import { useProductMinimals } from "@/hooks/use-products";
import { usePermissions } from "@/hooks/use-permissions";
import { formatDispatchCorrelative } from "@/services/dispatch/dispatch-pdf.service";
import { downloadDispatchPdfById } from "@/pdf";
import { fetchDispatchItems } from "@/services/dispatch";
import { useQuery } from "@tanstack/react-query";
import { getErrorMessage } from "@/utils/errors";
import { toast } from "sonner";
import { DISPATCH_ACTION_LABELS, type DispatchAction, type DispatchStatus } from "@/types/dispatch";
import { DispatchStatusBadge } from "./DispatchStatusBadge";
import { DispatchHistoryTimeline } from "./DispatchHistoryTimeline";
import { DispatchPdfPreviewDialog } from "./DispatchPdfPreviewDialog";
import { indexById } from "@/utils/maps";

export function DispatchDetailPage() {
  const { dispatchId } = useParams({ from: "/_authenticated/dispatches/$dispatchId" });
  const { can } = usePermissions();
  const dispatchQuery = useDispatch(dispatchId);
  const timelineQuery = useDispatchTimeline(dispatchId);
  const transition = useTransitionDispatch();
  const { data: clients = [] } = useClientSummaries();
  const { data: products = [] } = useProductMinimals();
  const productsById = indexById(products);

  const itemsQuery = useQuery({
    queryKey: ["dispatches", "items", dispatchId],
    queryFn: () => fetchDispatchItems(dispatchId),
  });

  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<DispatchAction | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const dispatch = dispatchQuery.data;
  const client = clients.find((c) => c.id === dispatch?.client_id);
  const status = (dispatch?.status ?? "borrador") as DispatchStatus;

  async function runAction(action: DispatchAction) {
    if (!dispatch) return;
    try {
      await transition.mutateAsync({
        dispatchId: dispatch.id,
        action,
        notes: action === "cancel" ? cancelReason : undefined,
      });
      setConfirmAction(null);
      setCancelReason("");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  if (dispatchQuery.isLoading) return <PageLoader />;
  if (!dispatch) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link to="/dispatches">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Link>
        </Button>
        <p className="text-muted-foreground">Despacho no encontrado.</p>
      </div>
    );
  }

  const correlative = formatDispatchCorrelative(dispatch);

  return (
    <div className="space-y-4">
      <PageHeader
        title={correlative}
        description={`Detalle logístico · ${client?.company ?? "—"}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/dispatches">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Lista
              </Link>
            </Button>
            <PermissionGate permission="dispatches:pdf">
              <Button size="sm" variant="outline" onClick={() => setPreviewOpen(true)}>
                <Eye className="h-4 w-4 mr-1" />
                Vista previa
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void downloadDispatchPdfById(dispatch).catch((e) => toast.error(getErrorMessage(e)))
                }
              >
                <FileDown className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </PermissionGate>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <DispatchStatusBadge status={status} />
        <span className="text-sm text-muted-foreground">Fecha: {dispatch.dispatch_date}</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="industrial-card p-4 lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Información
          </h3>
          <dl className="grid sm:grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Cliente</dt>
              <dd className="font-medium">{client?.company}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">NIT</dt>
              <dd>{client?.nit ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Contacto</dt>
              <dd>{client?.contact_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Teléfono</dt>
              <dd>{client?.phone ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Dirección</dt>
              <dd>{client?.address ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Piloto</dt>
              <dd>{dispatch.driver || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Vehículo</dt>
              <dd>{dispatch.vehicle || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Destino</dt>
              <dd>{dispatch.destination || "—"}</dd>
            </div>
          </dl>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cant.</TableHead>
                <TableHead className="text-right">Peso</TableHead>
                <TableHead>Unidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(itemsQuery.data ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">
                    {productsById.get(item.product_id)?.code}
                  </TableCell>
                  <TableCell>{productsById.get(item.product_id)?.name}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{item.weight}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <div className="space-y-4">
          <Card className="industrial-card p-4 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Acciones
            </h3>
            {status === "borrador" && can("dispatches:write") && (
              <Button className="w-full" onClick={() => setConfirmAction("submit")}>
                {DISPATCH_ACTION_LABELS.submit}
              </Button>
            )}
            {status === "pendiente" && can("dispatches:approve") && (
              <Button className="w-full" onClick={() => setConfirmAction("approve")}>
                {DISPATCH_ACTION_LABELS.approve}
              </Button>
            )}
            {status === "aprobado" && can("dispatches:write") && (
              <Button className="w-full" onClick={() => setConfirmAction("dispatch")}>
                {DISPATCH_ACTION_LABELS.dispatch}
              </Button>
            )}
            {["borrador", "pendiente", "aprobado"].includes(status) && can("dispatches:approve") && (
              <Button variant="destructive" className="w-full" onClick={() => setConfirmAction("cancel")}>
                {DISPATCH_ACTION_LABELS.cancel}
              </Button>
            )}
            {status === "despachado" && (
              <p className="text-xs text-muted-foreground">
                Despacho completado. Inventario actualizado.
              </p>
            )}
            {status === "cancelado" && dispatch.cancel_reason && (
              <p className="text-xs text-destructive">Motivo: {dispatch.cancel_reason}</p>
            )}
          </Card>

          <Card className="industrial-card p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Historial
            </h3>
            <DispatchHistoryTimeline entries={timelineQuery.data ?? []} />
          </Card>
        </div>
      </div>

      <DispatchPdfPreviewDialog
        dispatch={dispatch}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />

      <ConfirmDialog
        open={confirmAction !== null && confirmAction !== "cancel"}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmAction ? DISPATCH_ACTION_LABELS[confirmAction] : ""}
        description="¿Confirma esta acción? Quedará registrada en el historial del despacho."
        onConfirm={() => confirmAction && void runAction(confirmAction)}
      />

      <ConfirmDialog
        open={confirmAction === "cancel"}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title="Cancelar despacho"
        destructive
        description={
          <div className="space-y-2">
            <p>Indique el motivo de cancelación.</p>
            <Label>Motivo</Label>
            <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          </div>
        }
        onConfirm={() => void runAction("cancel")}
      />
    </div>
  );
}
