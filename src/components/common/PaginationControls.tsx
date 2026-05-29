import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type PaginationControlsProps = {
  page: number;
  pageCount: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function PaginationControls({
  page,
  pageCount,
  total,
  onPageChange,
}: PaginationControlsProps) {
  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between pt-3 text-sm text-muted-foreground">
      <span>
        Página {page + 1} de {pageCount} · {total} registros
      </span>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= pageCount - 1}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
