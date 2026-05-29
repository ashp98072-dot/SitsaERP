import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { PaginationControls } from "@/components/common/PaginationControls";
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { queryKeys } from "@/lib/query-keys";
import { fetchAuditLogsPage } from "@/services/audit.service";
import { DEFAULT_PAGE_SIZE } from "@/utils/pagination";

export function AuditLogPage() {
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.admin.audit, page],
    queryFn: () => fetchAuditLogsPage({ page, pageSize: DEFAULT_PAGE_SIZE }),
  });

  const rows = data?.rows ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Auditoría del sistema"
        description="Registro de acciones sobre inventario, despachos, entradas y administración."
      />

      <Card className="industrial-card p-4">
        {isLoading ? (
          <TableSkeleton columns={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Sin registros de auditoría"
            description="Los eventos aparecerán aquí después de aplicar la migración y realizar operaciones."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Usuario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("es-GT")}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.action}</TableCell>
                    <TableCell>{log.entity_type}</TableCell>
                    <TableCell className="font-mono text-xs truncate max-w-[120px]">
                      {log.entity_id?.slice(0, 8) ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs truncate max-w-[140px]">
                      {log.user_id?.slice(0, 8) ?? "—"}
                    </TableCell>
                  </TableRow>
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
