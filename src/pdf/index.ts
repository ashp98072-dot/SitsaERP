export type { DispatchPdfData, DispatchPdfClient, DispatchPdfLine } from "./types";

/** Lazy-loaded PDF generation (splits ~400kb jsPDF chunk from main bundle). */
export async function downloadDispatchPdfById(
  ...args: Parameters<(typeof import("./dispatch-service"))["downloadDispatchPdfById"]>
) {
  const { downloadDispatchPdfById: download } = await import("./dispatch-service");
  return download(...args);
}

export async function downloadDispatchPdfFromDraft(
  ...args: Parameters<(typeof import("./dispatch-service"))["downloadDispatchPdfFromDraft"]>
) {
  const { downloadDispatchPdfFromDraft: download } = await import("./dispatch-service");
  return download(...args);
}

export async function generateDispatchPdf(
  ...args: Parameters<(typeof import("./dispatch-document"))["generateDispatchPdf"]>
) {
  const { generateDispatchPdf: generate } = await import("./dispatch-document");
  return generate(...args);
}

export async function loadDispatchPdfBlob(
  ...args: Parameters<(typeof import("./dispatch-service"))["loadDispatchPdfBlob"]>
) {
  const { loadDispatchPdfBlob: load } = await import("./dispatch-service");
  return load(...args);
}

export async function loadDispatchPdfPreviewData(
  ...args: Parameters<(typeof import("./dispatch-service"))["loadDispatchPdfPreviewData"]>
) {
  const { loadDispatchPdfPreviewData: load } = await import("./dispatch-service");
  return load(...args);
}
