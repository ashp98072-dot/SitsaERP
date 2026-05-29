import { createFileRoute } from "@tanstack/react-router";
import { NewDispatchPage } from "@/features/dispatches/NewDispatchPage";

export const Route = createFileRoute("/_authenticated/dispatches/new")({
  head: () => ({ meta: [{ title: "Nuevo despacho" }] }),
  component: NewDispatchPage,
});
