import { createFileRoute } from "@tanstack/react-router";
import { AuditLogPage } from "@/features/admin/AuditLogPage";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({ meta: [{ title: "Auditoría" }] }),
  component: AuditLogPage,
});
