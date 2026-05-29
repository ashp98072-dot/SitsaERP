import { TableCell, TableRow } from "@/components/ui/table";

type TableStatesProps = {
  colSpan: number;
  isLoading?: boolean;
  isEmpty?: boolean;
  loadingLabel?: string;
  emptyLabel?: string;
};

export function TableLoadingRow({
  colSpan,
  label = "Cargando…",
}: {
  colSpan: number;
  label?: string;
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center text-muted-foreground">
        {label}
      </TableCell>
    </TableRow>
  );
}

export function TableEmptyRow({
  colSpan,
  label = "Sin resultados",
}: {
  colSpan: number;
  label?: string;
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center text-muted-foreground">
        {label}
      </TableCell>
    </TableRow>
  );
}

export function TableStates({
  colSpan,
  isLoading,
  isEmpty,
  loadingLabel,
  emptyLabel,
}: TableStatesProps) {
  if (isLoading) return <TableLoadingRow colSpan={colSpan} label={loadingLabel} />;
  if (isEmpty) return <TableEmptyRow colSpan={colSpan} label={emptyLabel} />;
  return null;
}
