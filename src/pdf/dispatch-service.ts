import {
  buildDispatchPdfFromRecord,
  buildDispatchPdfPayload,
} from "@/services/dispatch/dispatch-pdf.service";
import { fetchClientSummaries } from "@/services/clients.service";
import { fetchProductMinimals } from "@/services/products.service";
import type { Dispatch, DispatchLineItem } from "@/types";
import type { DispatchPdfData } from "./types";

async function renderPdfDownload(data: DispatchPdfData): Promise<void> {
  const { generateDispatchPdf } = await import("./dispatch-document");
  await generateDispatchPdf(data);
}

export async function downloadDispatchPdf(data: DispatchPdfData): Promise<void> {
  await renderPdfDownload(data);
}

export async function downloadDispatchPdfById(dispatch: Dispatch): Promise<void> {
  const payload = await buildDispatchPdfFromRecord(dispatch);
  await renderPdfDownload(payload);
}

export async function downloadDispatchPdfFromDraft(
  dispatch: Dispatch,
  items: DispatchLineItem[],
  clients: Awaited<ReturnType<typeof fetchClientSummaries>>,
  products: Awaited<ReturnType<typeof fetchProductMinimals>>,
  issuedBy?: string | null,
): Promise<void> {
  const client = clients.find((row) => row.id === dispatch.client_id);
  const payload = buildDispatchPdfPayload(dispatch, client, items, products, { issuedBy });
  await renderPdfDownload(payload);
}

export async function loadDispatchPdfBlob(dispatch: Dispatch): Promise<Blob> {
  const payload = await buildDispatchPdfFromRecord(dispatch);
  const { buildDispatchPdfBlob } = await import("./dispatch-document");
  return buildDispatchPdfBlob(payload);
}

export async function loadDispatchPdfPreviewData(dispatch: Dispatch): Promise<DispatchPdfData> {
  return buildDispatchPdfFromRecord(dispatch);
}
