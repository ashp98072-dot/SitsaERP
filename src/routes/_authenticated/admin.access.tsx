import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Mail, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  createAllowedEmail,
  deleteAllowedDomain,
  deleteAllowedEmail,
  fetchAllowedDomains,
  fetchAllowedEmails,
} from "@/services/access.service";
import {
  CORPORATE_EMAIL_DOMAINS,
  DEFAULT_CORPORATE_EMAIL_DOMAIN,
  INITIAL_ADMIN_EMAIL,
} from "@/utils/constants";

export const Route = createFileRoute("/_authenticated/admin/access")({
  head: () => ({ meta: [{ title: "Acceso autorizado" }] }),
  component: AccessPage,
});

function AccessPage() {
  const queryClient = useQueryClient();
  const [domain, setDomain] = useState("");
  const [exceptionEmail, setExceptionEmail] = useState("");
  const [exceptionNote, setExceptionNote] = useState("");

  const { data: domains = [], isLoading: domainsLoading } = useQuery({
    queryKey: queryKeys.admin.domains,
    queryFn: fetchAllowedDomains,
  });

  const { data: emails = [], isLoading: emailsLoading } = useQuery({
    queryKey: queryKeys.admin.emails,
    queryFn: fetchAllowedEmails,
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

  const addEmail = useMutation({
    mutationFn: ({ email, note }: { email: string; note?: string }) => createAllowedEmail(email, note),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.emails });
      setExceptionEmail("");
      setExceptionNote("");
      toast.success("Correo autorizado");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeEmail = useMutation({
    mutationFn: deleteAllowedEmail,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.emails });
      toast.success("Correo eliminado de excepciones");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Acceso autorizado"
        description="Acceso controlado: dominios corporativos automáticos y excepciones manuales. No hay registro público; solo administradores crean usuarios o autorizan correos externos."
      />

      <Card className="industrial-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Dominios corporativos</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Cualquier correo en{" "}
          <span className="font-mono">
            {CORPORATE_EMAIL_DOMAINS.map((d) => `@${d}`).join(", ")}
          </span>{" "}
          puede ingresar automáticamente (ej.{" "}
          <span className="font-mono">usuario@{DEFAULT_CORPORATE_EMAIL_DOMAIN}</span>,{" "}
          <span className="font-mono">logistica@{DEFAULT_CORPORATE_EMAIL_DOMAIN}</span>). El
          administrador inicial del sistema es{" "}
          <span className="font-mono">{INITIAL_ADMIN_EMAIL}</span>.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder={DEFAULT_CORPORATE_EMAIL_DOMAIN}
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
            {domainsLoading ? (
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

      <Card className="industrial-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Excepciones de correo</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Autoriza correos externos puntuales (auditor, proveedor, consultor). No habilita registro
          público: el usuario debe ser creado por un administrador después de agregar la excepción.
        </p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Correo externo</Label>
            <Input
              type="email"
              placeholder="auditor@gmail.com"
              value={exceptionEmail}
              onChange={(event) => setExceptionEmail(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nota (opcional)</Label>
            <Input
              placeholder="Auditoría externa Q2"
              value={exceptionNote}
              onChange={(event) => setExceptionNote(event.target.value)}
            />
          </div>
          <Button
            disabled={!exceptionEmail.trim() || addEmail.isPending}
            onClick={() =>
              addEmail.mutate({
                email: exceptionEmail,
                note: exceptionNote || undefined,
              })
            }
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar excepción
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Correo</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {emailsLoading ? (
              <TableEmptyRow colSpan={3} label="Cargando…" />
            ) : emails.length === 0 ? (
              <TableEmptyRow colSpan={3} label="Sin excepciones configuradas" />
            ) : (
              emails.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono">{row.email}</TableCell>
                  <TableCell className="text-muted-foreground">{row.note || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeEmail.mutate(row.id)}
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
