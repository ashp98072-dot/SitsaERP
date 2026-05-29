import { useState } from "react";
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
import { TableEmptyRow, TableLoadingRow } from "@/components/common/TableStates";
import {
  useInventoryAdjustments,
  useInventoryStockEnriched,
  useRegisterInventoryAdjustment,
} from "@/hooks/use-inventory";
import { usePermissions } from "@/hooks/use-permissions";
import { UNIT_TYPES } from "@/utils/constants";
import type { UnitType } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function InventoryAdjustmentsPanel() {
  const { can } = usePermissions();
  const canAdjust = can("inventory:adjust");
  const stock = useInventoryStockEnriched();
  const adjustments = useInventoryAdjustments();
  const mutation = useRegisterInventoryAdjustment();

  const [values, setValues] = useState({
    product_id: "",
    direction: "increase" as "increase" | "decrease",
    quantity: "",
    weight: "",
    unit: "lbs" as UnitType,
    reason: "",
  });

  const selected = (stock.data ?? []).find((r) => r.product_id === values.product_id);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!values.product_id || !values.reason.trim()) return;
    mutation.mutate({
      product_id: values.product_id,
      direction: values.direction,
      quantity: Number(values.quantity),
      weight: Number(values.weight) || 0,
      unit: values.unit,
      reason: values.reason.trim(),
    });
  }

  return (
    <div className="space-y-4">
      {canAdjust ? (
        <Card className="industrial-card p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Nuevo ajuste manual
          </h3>
          <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2 space-y-1.5">
              <Label>Producto *</Label>
              <Select
                value={values.product_id}
                onValueChange={(productId) => {
                  const row = (stock.data ?? []).find((r) => r.product_id === productId);
                  setValues({
                    ...values,
                    product_id: productId,
                    unit: row?.unit ?? values.unit,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar…" />
                </SelectTrigger>
                <SelectContent>
                  {(stock.data ?? []).map((row) => (
                    <SelectItem key={row.product_id} value={row.product_id}>
                      {row.code} · {row.name} (disp: {row.stock_quantity.toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Select
                value={values.direction}
                onValueChange={(direction) =>
                  setValues({ ...values, direction: direction as "increase" | "decrease" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">Aumentar stock</SelectItem>
                  <SelectItem value="decrease">Disminuir stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Unidad</Label>
              <Select
                value={values.unit}
                onValueChange={(unit) => setValues({ ...values, unit: unit as UnitType })}
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
            <div className="space-y-1.5">
              <Label>Cantidad *</Label>
              <Input
                type="number"
                min={0}
                step="any"
                required
                value={values.quantity}
                onChange={(e) => setValues({ ...values, quantity: e.target.value })}
              />
              {selected && values.direction === "decrease" && (
                <p className="text-xs text-muted-foreground">
                  Disponible: {selected.stock_quantity.toFixed(2)} {selected.unit}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Peso</Label>
              <Input
                type="number"
                min={0}
                step="any"
                value={values.weight}
                onChange={(e) => setValues({ ...values, weight: e.target.value })}
              />
              {selected && values.direction === "decrease" && (
                <p className="text-xs text-muted-foreground">
                  Peso disponible: {selected.stock_weight.toFixed(2)}
                </p>
              )}
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Motivo / observaciones *</Label>
              <Textarea
                required
                minLength={3}
                placeholder="Motivo del ajuste (auditoría)…"
                value={values.reason}
                onChange={(e) => setValues({ ...values, reason: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Registrando…" : "Registrar ajuste"}
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Card className="industrial-card p-4 text-sm text-muted-foreground">
          Los ajustes manuales están restringidos a administrador y supervisor.
        </Card>
      )}

      <Card className="industrial-card p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Historial de ajustes
        </h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Peso</TableHead>
              <TableHead>Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {adjustments.isLoading ? (
              <TableLoadingRow colSpan={5} />
            ) : (adjustments.data ?? []).length === 0 ? (
              <TableEmptyRow colSpan={5} label="Sin ajustes registrados" />
            ) : (
              (adjustments.data ?? []).map((adj) => (
                <TableRow key={adj.id}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {format(new Date(adj.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                  </TableCell>
                  <TableCell className="text-xs">
                    {adj.direction === "increase" ? "Aumento" : "Disminución"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(adj.quantity).toFixed(2)} {adj.unit}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(adj.weight).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-xs max-w-[280px] truncate" title={adj.reason}>
                    {adj.reason}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
