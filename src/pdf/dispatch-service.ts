import {
  buildDispatchPdfFromRecord,
  buildDispatchPdfPayload,
} from "@/services/dispatches.service";
import { fetchClientSummaries } from "@/services/clients.service";
import { fetchProductMinimals } from "@/services/products.service";
import type { Dispatch, DispatchLineItem } from "@/types";
import type { DispatchPdfData } from "./types";

async function renderPdf(data: DispatchPdfData): Promise<void> {
  const { generateDispatchPdf } = await import("./dispatch-document");
  await generateDispatchPdf(data);
}

export async function downloadDispatchPdf(data: DispatchPdfData): Promise<void> {
  await renderPdf(data);
}

export async function downloadDispatchPdfById(dispatch: Dispatch): Promise<void> {
  const [clients, products] = await Promise.all([
    fetchClientSummaries(),
    fetchProductMinimals(),
  ]);
  const payload = await buildDispatchPdfFromRecord(dispatch, clients, products);
  await renderPdf(payload);
}

export async function downloadDispatchPdfFromDraft(
  dispatch: Dispatch,
  items: DispatchLineItem[],
  clients: Awaited<ReturnType<typeof fetchClientSummaries>>,
  products: Awaited<ReturnType<typeof fetchProductMinimals>>,
): Promise<void> {
  const client = clients.find((row) => row.id === dispatch.client_id);
  const payload = buildDispatchPdfPayload(dispatch, client, items, products);
  await renderPdf(payload);
}
