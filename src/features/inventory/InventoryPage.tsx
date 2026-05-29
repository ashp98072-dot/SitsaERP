import { useState } from "react";
import { AlertTriangle } from "lucide-react";
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
import { PageHeader } from "@/components/common/PageHeader";
import { SearchField } from "@/components/common/SearchField";
import { TableEmptyRow, TableLoadingRow } from "@/components/common/TableStates";
import { useInventoryRows } from "@/hooks/use-inventory";

export function InventoryPage() {
  const [search, setSearch] = useState("");
  const { rows, isLoading } = useInventoryRows(search);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventario"
        description="Stock actual basado en movimientos de bodega."
      />

      <Card className="industrial-card p-4">
        <SearchField value={search} onChange={setSearch} placeholder="Buscar producto…" />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead className="text-right">Stock (cant.)</TableHead>
              <TableHead className="text-right">Stock (peso)</TableHead>
              <TableHead className="text-right">Mínimo</TableHead>
              <TableHead>Alerta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoadingRow colSpan={7} />
            ) : rows.length === 0 ? (
              <TableEmptyRow colSpan={7} label="Sin productos" />
            ) : (
              rows.map((row) => {
                const isLow = row.qty <= row.min_stock;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.code}</TableCell>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.unit}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{Number(row.qty).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{Number(row.weight).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{Number(row.min_stock).toFixed(2)}</TableCell>
                    <TableCell>
                      {isLow ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Bajo
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary border-primary/20"
                        >
                          OK
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
