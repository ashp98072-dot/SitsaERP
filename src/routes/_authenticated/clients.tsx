import { createFileRoute } from "@tanstack/react-router";
import { FeatureRoute } from "@/components/layout/FeatureRoute";
import { ClientsPage } from "@/features/clients/ClientsPage";

export const Route = createFileRoute("/_authenticated/clients")({
  head: () => ({ meta: [{ title: "Clientes" }] }),
  component: () => (
    <FeatureRoute title="Clientes">
      <ClientsPage />
    </FeatureRoute>
  ),
});
