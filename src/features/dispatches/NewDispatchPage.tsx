import { useNavigate } from "@tanstack/react-router";
import { FileDown, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { usePermissions } from "@/hooks/use-permissions";
import { TableEmptyRow } from "@/components/common/TableStates";
import { useClients } from "@/hooks/use-clients";
import { useCreateDispatch } from "@/hooks/use-dispatches";
import { useProductMinimals } from "@/hooks/use-products";
import { downloadDispatchPdfFromDraft } from "@/pdf";
import { UNIT_TYPES } from "@/utils/constants";
import { indexById } from "@/utils/maps";
import { getErrorMessage } from "@/utils/errors";
import type { DispatchLineItem, NewDispatchHeader, UnitType } from "@/types";

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
  const create = useCreateDispatch();

  const [header, setHeader] = useState<NewDispatchHeader>({
    client_id: "",
    driver: "",
    vehicle: "",
    notes: "",
    dispatch_date: new Date().toISOString().slice(0, 10),
  });
  const [items, setItems] = useState<DispatchLineItem[]>([]);
  const [draft, setDraft] = useState<DispatchLineItem>(emptyLine);

  const productsById = indexById(products);

  function addItem() {
    if (!draft.product_id || draft.quantity <= 0) {
      toast.error("Producto y cantidad requeridos");
      return;
    }
    setItems((current) => [...current, draft]);
    setDraft(emptyLine);
  }

  async function handleSave() {
    try {
      if (!header.client_id) throw new Error("Cliente requerido");
      if (items.length === 0) throw new Error("Agrega al menos un producto");

      const dispatch = await create.mutateAsync({ header, items });
      toast.success(`Despacho DM-${String(dispatch.folio).padStart(6, "0")} creado`);
      await downloadDispatchPdfFromDraft(dispatch, items, clients, products);
      navigate({ to: "/dispatches" });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Nuevo despacho"
        description="Genera el comprobante de salida de mercadería."
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
            <Label>Fecha</Label>
            <Input
              type="date"
              value={header.dispatch_date}
              onChange={(event) => setHeader({ ...header, dispatch_date: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Vehículo / Placa</Label>
            <Input
              value={header.vehicle}
              onChange={(event) => setHeader({ ...header, vehicle: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Piloto</Label>
            <Input
              value={header.driver}
              onChange={(event) => setHeader({ ...header, driver: event.target.value })}
            />
          </div>
          <div className="md:col-span-3 space-y-1.5">
            <Label>Observaciones</Label>
            <Input
              value={header.notes}
              onChange={(event) => setHeader({ ...header, notes: event.target.value })}
            />
          </div>
        </div>
      </Card>

      <Card className="industrial-card p-5 space-y-4">
        <div className="text-sm font-semibold">Productos a despachar</div>
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
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.code} · {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Cantidad</Label>
            <Input
              type="number"
              step="0.01"
              value={draft.quantity}
              onChange={(event) => setDraft({ ...draft, quantity: Number(event.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Peso</Label>
            <Input
              type="number"
              step="0.01"
              value={draft.weight}
              onChange={(event) => setDraft({ ...draft, weight: Number(event.target.value) })}
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
                    onClick={() => setItems(items.filter((_, rowIndex) => rowIndex !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableEmptyRow colSpan={5} label="Aún no hay productos" />
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate({ to: "/dispatches" })}>
          Cancelar
        </Button>
        <Button disabled={create.isPending} onClick={() => void handleSave()}>
          <FileDown className="h-4 w-4 mr-2" />
          Guardar y generar PDF
        </Button>
      </div>
    </div>
  );
}
