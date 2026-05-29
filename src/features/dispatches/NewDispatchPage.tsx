import { useNavigate } from "@tanstack/react-router";
import { Plus, Save, Send, Trash2, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Navigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { usePermissions } from "@/hooks/use-permissions";
import { TableEmptyRow } from "@/components/common/TableStates";
import { useClients } from "@/hooks/use-clients";
import {
  useCreateDispatch,
  useCreateDispatchDraft,
  useTransitionDispatch,
} from "@/hooks/use-dispatches";
import { useProductMinimals } from "@/hooks/use-products";
import { useInventoryStockEnriched } from "@/hooks/use-inventory";
import { UNIT_TYPES } from "@/utils/constants";
import { indexById } from "@/utils/maps";
import { getErrorMessage } from "@/utils/errors";
import type { DispatchLineItem, NewDispatchHeader, UnitType } from "@/types";
import { BRAND } from "@/lib/brand";

const emptyLine: DispatchLineItem = {
  product_id: "",
  quantity: 0,
  weight: 0,
  unit: "lbs",
};

export function NewDispatchPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();

  if (!can("dispatches:write")) {
    return <Navigate to="/dispatches" replace />;
  }

  const { data: clients = [] } = useClients();
  const { data: products = [] } = useProductMinimals();
  const stock = useInventoryStockEnriched();
  const createDraft = useCreateDispatchDraft();
  const createDirect = useCreateDispatch();
  const transition = useTransitionDispatch();

  const [header, setHeader] = useState<NewDispatchHeader>({
    client_id: "",
    driver: "",
    vehicle: "",
    notes: "",
    destination: "",
    logistics_notes: "",
    dispatch_date: new Date().toISOString().slice(0, 10),
  });
  const [items, setItems] = useState<DispatchLineItem[]>([]);
  const [draft, setDraft] = useState<DispatchLineItem>(emptyLine);
  const [confirmDirect, setConfirmDirect] = useState(false);

  const productsById = indexById(products);
  const stockByProduct = new Map((stock.data ?? []).map((row) => [row.product_id, row]));

  function validateItems(): boolean {
    if (!header.client_id) {
      toast.error("Cliente requerido");
      return false;
    }
    if (items.length === 0) {
      toast.error("Agrega al menos un producto");
      return false;
    }
    const seen = new Set<string>();
    for (const item of items) {
      if (seen.has(item.product_id)) {
        toast.error("Hay productos duplicados. Use una sola línea por producto.");
        return false;
      }
      seen.add(item.product_id);
      if (item.quantity <= 0) {
        toast.error("Cantidades deben ser mayores a cero");
        return false;
      }
    }
    return true;
  }

  function addItem() {
    if (!draft.product_id || draft.quantity <= 0) {
      toast.error("Producto y cantidad requeridos");
      return;
    }
    if (items.some((i) => i.product_id === draft.product_id)) {
      toast.error("Producto ya agregado");
      return;
    }
    const available = stockByProduct.get(draft.product_id);
    if (available && draft.quantity > available.stock_quantity) {
      toast.error(`Stock insuficiente. Disponible: ${available.stock_quantity.toFixed(2)}`);
      return;
    }
    setItems((current) => [...current, draft]);
    setDraft(emptyLine);
  }

  async function saveDraft(submitAfter = false) {
    if (!validateItems()) return;
    try {
      const dispatch = await createDraft.mutateAsync({ ...header, items });
      if (submitAfter) {
        await transition.mutateAsync({ dispatchId: dispatch.id, action: "submit" });
        toast.success("Enviado a pendiente de aprobación");
      }
      navigate({ to: "/dispatches/$dispatchId", params: { dispatchId: dispatch.id } });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function saveDirect() {
    if (!validateItems()) return;
    try {
      const dispatch = await createDirect.mutateAsync({ header, items });
      toast.success(`Despacho ${dispatch.correlative ?? ""} completado`);
      navigate({ to: "/dispatches/$dispatchId", params: { dispatchId: dispatch.id } });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setConfirmDirect(false);
    }
  }

  const busy = createDraft.isPending || createDirect.isPending || transition.isPending;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Nuevo despacho"
        description={`Flujo borrador → aprobación → salida inventario · ${BRAND.company}`}
      />

      <Card className="industrial-card p-5 space-y-4">
        <div className="grid md:grid-cols-4 gap-3">
          <div className="md:col-span-2 space-y-1.5">
            <Label>Cliente *</Label>
            <Select
              value={header.client_id}
              onValueChange={(clientId) => setHeader({ ...header, client_id: clientId })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente…" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Fecha despacho</Label>
            <Input
              type="date"
              value={header.dispatch_date}
              onChange={(e) => setHeader({ ...header, dispatch_date: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Destino</Label>
            <Input
              value={header.destination ?? ""}
              onChange={(e) => setHeader({ ...header, destination: e.target.value })}
              placeholder="Puerto, planta, cliente final…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Piloto / Conductor</Label>
            <Input
              value={header.driver}
              onChange={(e) => setHeader({ ...header, driver: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Vehículo / Placa</Label>
            <Input
              value={header.vehicle}
              onChange={(e) => setHeader({ ...header, vehicle: e.target.value })}
            />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label>Observaciones generales</Label>
            <Input
              value={header.notes}
              onChange={(e) => setHeader({ ...header, notes: e.target.value })}
            />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label>Observaciones logísticas</Label>
            <Textarea
              value={header.logistics_notes ?? ""}
              onChange={(e) => setHeader({ ...header, logistics_notes: e.target.value })}
              rows={2}
            />
          </div>
        </div>
      </Card>

      <Card className="industrial-card p-5 space-y-4">
        <div className="text-sm font-semibold">Líneas de despacho</div>
        <div className="grid md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2 space-y-1.5">
            <Label>Producto</Label>
            <Select
              value={draft.product_id}
              onValueChange={(productId) => {
                const product = productsById.get(productId);
                setDraft({ ...draft, product_id: productId, unit: product?.unit ?? draft.unit });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Producto…" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => {
                  const st = stockByProduct.get(product.id);
                  return (
                    <SelectItem key={product.id} value={product.id}>
                      {product.code} · {product.name}
                      {st ? ` (disp. ${st.stock_quantity.toFixed(1)})` : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Cantidad</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={draft.quantity || ""}
              onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Peso</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={draft.weight || ""}
              onChange={(e) => setDraft({ ...draft, weight: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Unidad</Label>
            <Select
              value={draft.unit}
              onValueChange={(unit) => setDraft({ ...draft, unit: unit as UnitType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNIT_TYPES.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" onClick={addItem}>
            <Plus className="h-4 w-4 mr-1" />
            Agregar
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Cant.</TableHead>
              <TableHead className="text-right">Peso</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={`${item.product_id}-${index}`}>
                <TableCell>{productsById.get(item.product_id)?.name ?? "—"}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">{item.weight}</TableCell>
                <TableCell>{item.unit}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setItems(items.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && <TableEmptyRow colSpan={5} label="Aún no hay productos" />}
          </TableBody>
        </Table>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => navigate({ to: "/dispatches" })}>
          Cancelar
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => void saveDraft(false)}>
          <Save className="h-4 w-4 mr-2" />
          Guardar borrador
        </Button>
        <Button disabled={busy} onClick={() => void saveDraft(true)}>
          <Send className="h-4 w-4 mr-2" />
          Enviar a pendiente
        </Button>
        {can("dispatches:approve") && (
          <Button variant="outline" disabled={busy} onClick={() => setConfirmDirect(true)}>
            <Zap className="h-4 w-4 mr-2" />
            Despacho directo
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmDirect}
        onOpenChange={setConfirmDirect}
        title="Despacho directo"
        description="Crea, aprueba y despacha en un solo paso (descuenta inventario de inmediato). Use solo cuando el flujo de aprobación no aplique."
        confirmLabel="Confirmar despacho"
        onConfirm={() => void saveDirect()}
      />
    </div>
  );
}
