import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { loadBrandImages, PDF_BRAND, PDF_COPY } from "./branding";
import { createQrDataUrl } from "./qr";
import type { DispatchPdfData } from "./types";

export async function buildDispatchPdfDoc(data: DispatchPdfData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = PDF_BRAND.margin;

  const { sitsa, ecoplanet } = await loadBrandImages();
  const qr = await createQrDataUrl(data.qrPayload, 96);

  drawWatermark(doc, pageWidth, pageHeight);
  drawHeader(doc, pageWidth, margin, sitsa, ecoplanet);

  let y = drawMetaBox(doc, pageWidth, margin, data);
  y = drawClientSection(doc, pageWidth, margin, y, data);
  y = drawLogisticsSection(doc, pageWidth, margin, y, data);
  y = drawItemsTable(doc, pageWidth, margin, y, data);
  y = drawTotalsAndNotes(doc, pageWidth, margin, y, data);
  drawSignatures(doc, pageWidth, margin, pageHeight);
  drawFooter(doc, pageWidth, pageHeight, margin, data, qr);

  return doc;
}

export async function generateDispatchPdf(data: DispatchPdfData): Promise<void> {
  const doc = await buildDispatchPdfDoc(data);
  doc.save(`Despacho-${data.correlative}.pdf`);
}

export async function buildDispatchPdfBlob(data: DispatchPdfData): Promise<Blob> {
  const doc = await buildDispatchPdfDoc(data);
  return doc.output("blob");
}

function drawWatermark(doc: jsPDF, pageWidth: number, pageHeight: number): void {
  doc.saveGraphicsState();
  doc.setTextColor(230, 235, 232);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(52);
  doc.text("GRUPO SITSA", pageWidth / 2, pageHeight / 2, {
    align: "center",
    angle: 35,
  });
  doc.restoreGraphicsState();
}

function drawHeader(
  doc: jsPDF,
  pageWidth: number,
  margin: number,
  sitsa: string,
  ecoplanet: string,
): void {
  doc.setFillColor(...PDF_BRAND.headerBg);
  doc.rect(0, 0, pageWidth, PDF_BRAND.headerHeight, "F");
  doc.setFillColor(...PDF_BRAND.headerAccent);
  doc.rect(0, PDF_BRAND.headerHeight, pageWidth, 5, "F");

  doc.addImage(sitsa, "PNG", margin, 12, 72, 72);
  doc.addImage(ecoplanet, "PNG", pageWidth - margin - 48, 24, 44, 44);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(PDF_COPY.title, pageWidth / 2, 38, { align: "center" });
  doc.setFontSize(10);
  doc.text(PDF_COPY.brand, pageWidth / 2, 56, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(200, 210, 205);
  doc.text(PDF_COPY.subtitle, pageWidth / 2, 70, { align: "center" });
  doc.text(PDF_COPY.division, pageWidth - margin - 48, 74, { align: "left" });
}

function drawMetaBox(doc: jsPDF, pageWidth: number, margin: number, data: DispatchPdfData): number {
  let y = PDF_BRAND.headerHeight + 20;
  const boxH = 68;
  doc.setDrawColor(160);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, y, pageWidth - margin * 2, boxH, 4, 4);

  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text("CORRELATIVO", margin + 12, y + 14);
  doc.text("FECHA DESPACHO", margin + 200, y + 14);
  doc.text("ESTADO", margin + 340, y + 14);
  doc.text("EMITIDO POR", margin + 430, y + 14);

  doc.setTextColor(15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(data.correlative, margin + 12, y + 36);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(data.date, margin + 200, y + 36);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const statusColor =
    data.status === "despachado"
      ? PDF_BRAND.primary
      : data.status === "cancelado"
        ? [180, 40, 40]
        : [90, 90, 90];
  doc.setTextColor(...(statusColor as [number, number, number]));
  doc.text(data.statusLabel, margin + 340, y + 36);

  doc.setTextColor(20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(data.issuedBy || "—", margin + 430, y + 36, { maxWidth: 120 });

  doc.setFontSize(7);
  doc.setTextColor(120);
  const genDate = new Date(data.generatedAt).toLocaleString("es-GT", {
    dateStyle: "short",
    timeStyle: "short",
  });
  doc.text(`Generado: ${genDate}`, margin + 12, y + 54);

  return y + boxH + 14;
}

function drawClientSection(
  doc: jsPDF,
  pageWidth: number,
  margin: number,
  y: number,
  data: DispatchPdfData,
): number {
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_BRAND.primary);
  doc.text("CLIENTE / RECEPTOR", margin, y);
  y += 6;
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  const colMid = margin + (pageWidth - margin * 2) / 2;
  doc.setTextColor(20);
  doc.setFontSize(11);
  doc.text(data.client.company, margin, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const left: string[] = [];
  const right: string[] = [];
  if (data.client.nit) left.push(`NIT: ${data.client.nit}`);
  if (data.client.contact_name) left.push(`Contacto: ${data.client.contact_name}`);
  if (data.client.phone) left.push(`Teléfono: ${data.client.phone}`);
  if (data.client.address) right.push(`Dirección: ${data.client.address}`);
  if (data.warehouseName) right.push(`Bodega origen: ${data.warehouseName}`);

  const maxLines = Math.max(left.length, right.length);
  for (let i = 0; i < maxLines; i++) {
    if (left[i]) doc.text(left[i], margin, y);
    if (right[i]) doc.text(right[i], colMid, y, { maxWidth: pageWidth / 2 - margin });
    y += 11;
  }

  return y + 4;
}

function drawLogisticsSection(
  doc: jsPDF,
  pageWidth: number,
  margin: number,
  y: number,
  data: DispatchPdfData,
): number {
  if (!data.driver && !data.vehicle && !data.destination && !data.logisticsNotes) return y;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_BRAND.primary);
  doc.text("DATOS LOGÍSTICOS", margin, y);
  y += 6;
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30);
  if (data.driver) {
    doc.text(`Piloto / Conductor: ${data.driver}`, margin, y);
    y += 11;
  }
  if (data.vehicle) {
    doc.text(`Vehículo / Placa: ${data.vehicle}`, margin, y);
    y += 11;
  }
  if (data.destination) {
    doc.text(`Destino: ${data.destination}`, margin, y);
    y += 11;
  }
  if (data.logisticsNotes) {
    doc.text(`Obs. logísticas: ${data.logisticsNotes}`, margin, y, {
      maxWidth: pageWidth - margin * 2,
    });
    y += 14;
  }

  return y + 4;
}

function drawItemsTable(
  doc: jsPDF,
  pageWidth: number,
  margin: number,
  y: number,
  data: DispatchPdfData,
): number {
  y += 4;
  autoTable(doc, {
    startY: y,
    head: [["Código", "Producto", "Cant.", "Peso", "Unidad", "Obs."]],
    body: data.items.map((item) => [
      item.code,
      item.name,
      Number(item.quantity).toFixed(2),
      Number(item.weight).toFixed(2),
      item.unit,
      item.notes?.trim() ? item.notes : "—",
    ]),
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 5, overflow: "linebreak" },
    headStyles: {
      fillColor: PDF_BRAND.primary,
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: PDF_BRAND.rowAlt },
    columnStyles: {
      0: { cellWidth: 52 },
      2: { halign: "right", cellWidth: 42 },
      3: { halign: "right", cellWidth: 42 },
      4: { halign: "center", cellWidth: 38 },
      5: { cellWidth: 72, fontSize: 7.5 },
    },
    margin: { left: margin, right: margin },
  });

  const lastTable = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable;
  return (lastTable?.finalY ?? y) + 8;
}

function drawTotalsAndNotes(
  doc: jsPDF,
  pageWidth: number,
  margin: number,
  y: number,
  data: DispatchPdfData,
): number {
  const totalQty = data.items.reduce((sum, item) => sum + Number(item.quantity), 0);
  const totalWeight = data.items.reduce((sum, item) => sum + Number(item.weight), 0);

  doc.setFillColor(...PDF_BRAND.rowAlt);
  doc.rect(margin, y, pageWidth - margin * 2, 28, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20);
  doc.text(`TOTAL CANTIDAD: ${totalQty.toFixed(2)}`, margin + 10, y + 18);
  doc.text(`TOTAL PESO: ${totalWeight.toFixed(2)}`, pageWidth - margin - 10, y + 18, {
    align: "right",
  });
  y += 36;

  if (data.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(80);
    doc.text("OBSERVACIONES GENERALES:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.notes, margin + 120, y, { maxWidth: pageWidth - margin * 2 - 120 });
    y += 20;
  }

  return y;
}

function drawSignatures(
  doc: jsPDF,
  pageWidth: number,
  margin: number,
  pageHeight: number,
): void {
  const baseY = pageHeight - 148;
  const blockW = (pageWidth - margin * 2 - 24) / 4;

  const labels = [
    { title: "ENTREGA", sub: "Quien entrega" },
    { title: "SUPERVISOR", sub: "Vo.Bo." },
    { title: "RECIBE", sub: "Quien recibe" },
    { title: "SELLO", sub: "Empresa" },
  ];

  labels.forEach((label, index) => {
    const x = margin + index * (blockW + 8);
    doc.setDrawColor(60);
    doc.setLineWidth(0.6);
    doc.line(x, baseY + 28, x + blockW, baseY + 28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(40);
    doc.text(label.title, x + blockW / 2, baseY + 40, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(110);
    doc.text(label.sub, x + blockW / 2, baseY + 50, { align: "center" });
    doc.text("Nombre · Firma · Fecha", x + blockW / 2, baseY + 58, { align: "center" });
  });
}

function drawFooter(
  doc: jsPDF,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  data: DispatchPdfData,
  qr: string,
): void {
  const footerY = pageHeight - 52;
  doc.setDrawColor(200);
  doc.line(margin, footerY - 8, pageWidth - margin, footerY - 8);

  doc.addImage(qr, "PNG", margin, footerY - 4, 44, 44);

  doc.setFontSize(7);
  doc.setTextColor(90);
  doc.text(PDF_COPY.footer, margin + 52, footerY + 6);
  doc.text(`ID: ${data.dispatchId}`, margin + 52, footerY + 16);
  doc.text(`Correlativo: ${data.correlative}`, margin + 52, footerY + 26);
  doc.text(
    data.issuedBy ? `Usuario: ${data.issuedBy}` : "",
    pageWidth - margin,
    footerY + 6,
    { align: "right" },
  );
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_BRAND.primary);
  doc.text("GRUPO SITSA ERP", pageWidth - margin, footerY + 20, { align: "right" });
}
