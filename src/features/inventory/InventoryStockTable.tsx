import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchField } from "@/components/common/SearchField";
import { TableEmptyRow, TableLoadingRow } from "@/components/common/TableStates";
import { useInventoryStockEnriched } from "@/hooks/use-inventory";
import { formatTonsFromWeight, UNIT_LABELS } from "@/utils/units";
import { StockAlertBadge } from "./StockAlertBadge";
import { useState } from "react";

export function InventoryStockTable() {
  const [search, setSearch] = useState("");
  const { data: rows = [], isLoading } = useInventoryStockEnriched(search);

  return (
    <Card className="industrial-card p-4 space-y-3">
      <SearchField value={search} onChange={setSearch} placeholder="Buscar por código o producto…" />
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead className="text-right">Stock actual</TableHead>
              <TableHead className="text-right">Peso acumulado</TableHead>
              <TableHead className="text-right">Equiv. ton</TableHead>
              <TableHead className="text-right">Mínimo</TableHead>
              <TableHead>Disponibilidad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoadingRow colSpan={8} />
            ) : rows.length === 0 ? (
              <TableEmptyRow colSpan={8} label="Sin productos en inventario" />
            ) : (
              rows.map((row) => (
                <TableRow key={row.product_id}>
                  <TableCell className="font-mono text-xs">{row.code}</TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" title={UNIT_LABELS[row.unit]}>
                      {row.unit}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(row.stock_quantity).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(row.stock_weight).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground text-xs">
                    {formatTonsFromWeight(row.stock_weight, row.unit)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(row.min_stock).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <StockAlertBadge level={row.alert_level} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
