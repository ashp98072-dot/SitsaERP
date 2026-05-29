import { createFileRoute } from "@tanstack/react-router";
import { EntriesPage } from "@/features/entries/EntriesPage";

export const Route = createFileRoute("/_authenticated/entries")({
  head: () => ({ meta: [{ title: "Ingresos a Bodega" }] }),
  component: EntriesPage,
});
