import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/common/PageHeader";
import { TableEmptyRow } from "@/components/common/TableStates";
import { queryKeys } from "@/lib/query-keys";
import {
  createAllowedDomain,
  deleteAllowedDomain,
  fetchAllowedDomains,
} from "@/services/access.service";

export const Route = createFileRoute("/_authenticated/admin/access")({
  head: () => ({ meta: [{ title: "Acceso autorizado" }] }),
  component: AccessPage,
});

function AccessPage() {
  const queryClient = useQueryClient();
  const [domain, setDomain] = useState("");

  const { data: domains = [], isLoading } = useQuery({
    queryKey: queryKeys.admin.domains,
    queryFn: fetchAllowedDomains,
  });

  const addDomain = useMutation({
    mutationFn: (value: string) => createAllowedDomain(value),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.domains });
      setDomain("");
      toast.success("Dominio autorizado");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeDomain = useMutation({
    mutationFn: deleteAllowedDomain,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.domains });
      toast.success("Dominio eliminado");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-4 max-w-2xl">
      <PageHeader
        title="Acceso autorizado"
        description="Solo correos de dominios corporativos registrados pueden crear cuenta. La validación también se aplica en Supabase (RLS + trigger)."
      />

      <Card className="industrial-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Dominios corporativos</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Ejemplo: <span className="font-mono">ecoplanet.com</span> autoriza cualquier usuario
          @ecoplanet.com. Si no hay dominios configurados, el sistema permite el primer registro
          (bootstrap).
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="grupo.sitsa.com"
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
          />
          <Button
            disabled={!domain.trim() || addDomain.isPending}
            onClick={() => addDomain.mutate(domain)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dominio</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableEmptyRow colSpan={3} label="Cargando…" />
            ) : domains.length === 0 ? (
              <TableEmptyRow colSpan={3} label="Sin dominios configurados" />
            ) : (
              domains.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono">@{row.domain}</TableCell>
                  <TableCell className="text-muted-foreground">{row.note || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeDomain.mutate(row.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
