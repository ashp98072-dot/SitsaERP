import { useState } from "react";
import { Card } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { TableEmptyRow, TableLoadingRow } from "@/components/common/TableStates";
import { useProductKardex } from "@/hooks/use-inventory";
import { useProductMinimals } from "@/hooks/use-products";
import { KARDEX_KIND_LABELS, type KardexRow } from "@/types/inventory";
import { format } from "date-fns";
import { es } from "date-fns/locale";

function formatDate(iso: string) {
  try {
    return format(new Date(iso), "dd/MM/yyyy HH:mm", { locale: es });
  } catch {
    return iso;
  }
}

function kindLabel(row: KardexRow) {
  return KARDEX_KIND_LABELS[row.movement_kind] ?? row.movement_kind;
}

export function InventoryKardexPanel() {
  const [productId, setProductId] = useState<string>("");
  const products = useProductMinimals();
  const kardex = useProductKardex(productId || null);

  return (
    <Card className="industrial-card p-4 space-y-4">
      <div className="max-w-md space-y-1.5">
        <Label>Producto (Kardex)</Label>
        <Select value={productId} onValueChange={setProductId}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccione un producto…" />
          </SelectTrigger>
          <SelectContent>
            {(products.data ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.code} · {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!productId ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Seleccione un producto para ver el historial de movimientos y saldos.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Entrada</TableHead>
                <TableHead className="text-right">Salida</TableHead>
                <TableHead className="text-right">Saldo cant.</TableHead>
                <TableHead className="text-right">Saldo peso</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Observaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kardex.isLoading ? (
                <TableLoadingRow colSpan={8} />
              ) : (kardex.data ?? []).length === 0 ? (
                <TableEmptyRow colSpan={8} label="Sin movimientos" />
              ) : (
                (kardex.data ?? []).map((row) => (
                  <TableRow key={row.movement_id}>
                    <TableCell className="text-xs whitespace-nowrap">{formatDate(row.created_at)}</TableCell>
                    <TableCell className="text-xs font-medium">{kindLabel(row)}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-700">
                      {row.qty_in > 0 ? row.qty_in.toFixed(2) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-red-700">
                      {row.qty_out > 0 ? row.qty_out.toFixed(2) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {Number(row.balance_qty).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(row.balance_weight).toFixed(2)} {row.unit}
                    </TableCell>
                    <TableCell className="text-xs max-w-[140px] truncate" title={row.created_by_email ?? undefined}>
                      {row.created_by_name ?? row.created_by_email ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate" title={row.notes ?? undefined}>
                      {row.notes ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
