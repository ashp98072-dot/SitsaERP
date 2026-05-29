import { createFileRoute } from "@tanstack/react-router";
import { DispatchesPage } from "@/features/dispatches/DispatchesPage";

export const Route = createFileRoute("/_authenticated/dispatches")({
  head: () => ({ meta: [{ title: "Despachos" }] }),
  component: DispatchesPage,
});
