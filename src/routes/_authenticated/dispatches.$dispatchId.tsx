import { createFileRoute } from "@tanstack/react-router";
import { DispatchDetailPage } from "@/features/dispatches/DispatchDetailPage";

export const Route = createFileRoute("/_authenticated/dispatches/$dispatchId")({
  head: () => ({ meta: [{ title: "Detalle despacho" }] }),
  component: DispatchDetailPage,
});
