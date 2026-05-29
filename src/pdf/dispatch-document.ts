import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { loadBrandImages, PDF_BRAND, PDF_COPY } from "./branding";
import type { DispatchPdfData } from "./types";

export async function generateDispatchPdf(data: DispatchPdfData): Promise<void> {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_BRAND.margin;

  const { eco, sitsa } = await loadBrandImages();
  drawHeader(doc, pageWidth, margin, eco, sitsa);

  let y = drawMetaBox(doc, pageWidth, margin, data);
  y = drawClientSection(doc, pageWidth, margin, y, data);
  y = drawTransportSection(doc, pageWidth, margin, y, data);
  y = drawItemsTable(doc, pageWidth, margin, y, data);
  drawTotals(doc, pageWidth, margin, y, data);
  drawSignatures(doc, pageWidth, margin, data);
  drawFooter(doc, pageWidth);

  doc.save(`Despacho-DM-${String(data.folio).padStart(6, "0")}.pdf`);
}

function drawHeader(
  doc: jsPDF,
  pageWidth: number,
  margin: number,
  eco: string,
  sitsa: string,
): void {
  doc.setFillColor(...PDF_BRAND.primary);
  doc.rect(0, 0, pageWidth, PDF_BRAND.headerHeight, "F");
  doc.setFillColor(...PDF_BRAND.accent);
  doc.rect(0, PDF_BRAND.headerHeight, pageWidth, 4, "F");

  doc.addImage(eco, "PNG", margin, 18, 56, 56);
  doc.addImage(sitsa, "PNG", pageWidth - margin - 56, 18, 56, 56);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(PDF_COPY.title, pageWidth / 2, 42, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(PDF_COPY.brand, pageWidth / 2, 60, { align: "center" });
  doc.setFontSize(9);
  doc.text(PDF_COPY.subtitle, pageWidth / 2, 74, { align: "center" });
}

function drawMetaBox(doc: jsPDF, pageWidth: number, margin: number, data: DispatchPdfData): number {
  let y = 115;
  doc.setTextColor(20, 20, 20);
  doc.setDrawColor(180);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 56, 4, 4);

  doc.setFontSize(8);
  doc.setTextColor(110);
  doc.text("COMPROBANTE No.", margin + 12, y + 16);
  doc.text("FECHA", margin + 180, y + 16);
  doc.text("EMITIDO POR", margin + 320, y + 16);

  doc.setTextColor(20);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(`DM-${String(data.folio).padStart(6, "0")}`, margin + 12, y + 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(data.date, margin + 180, y + 36);
  doc.text(data.issuedBy || "—", margin + 320, y + 36);

  return y + 70;
}

function drawClientSection(
  doc: jsPDF,
  pageWidth: number,
  margin: number,
  y: number,
  data: DispatchPdfData,
): number {
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text("CLIENTE / RECEPTOR", margin, y);
  y += 4;
  doc.setDrawColor(220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 14;

  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(data.client.company, margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y += 14;

  if (data.client.nit) {
    doc.text(`NIT: ${data.client.nit}`, margin, y);
    y += 12;
  }
  if (data.client.contact_name) {
    doc.text(`Contacto: ${data.client.contact_name}`, margin, y);
    y += 12;
  }
  if (data.client.address) {
    doc.text(`Dirección: ${data.client.address}`, margin, y);
    y += 12;
  }

  return y;
}

function drawTransportSection(
  doc: jsPDF,
  pageWidth: number,
  margin: number,
  y: number,
  data: DispatchPdfData,
): number {
  if (!data.driver && !data.vehicle) return y;

  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text("TRANSPORTE", margin, y);
  y += 4;
  doc.line(margin, y, pageWidth - margin, y);
  y += 14;
  doc.setTextColor(20);
  doc.setFontSize(10);
  if (data.driver) doc.text(`Piloto: ${data.driver}`, margin, y);
  if (data.vehicle) doc.text(`Vehículo / Placa: ${data.vehicle}`, margin + 220, y);
  return y + 14;
}

function drawItemsTable(
  doc: jsPDF,
  pageWidth: number,
  margin: number,
  y: number,
  data: DispatchPdfData,
): number {
  y += 8;
  autoTable(doc, {
    startY: y,
    head: [["Código", "Descripción", "Cant.", "Peso", "Unidad"]],
    body: data.items.map((item) => [
      item.code,
      item.name,
      Number(item.quantity).toFixed(2),
      Number(item.weight).toFixed(2),
      item.unit,
    ]),
    styles: { font: "helvetica", fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: PDF_BRAND.primary, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: PDF_BRAND.rowAlt },
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "center" } },
    margin: { left: margin, right: margin },
  });

  const lastTable = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable;
  return (lastTable?.finalY ?? y) + 10;
}

function drawTotals(
  doc: jsPDF,
  pageWidth: number,
  margin: number,
  y: number,
  data: DispatchPdfData,
): void {
  const totalQty = data.items.reduce((sum, item) => sum + Number(item.quantity), 0);
  const totalWeight = data.items.reduce((sum, item) => sum + Number(item.weight), 0);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL CANTIDAD: ${totalQty.toFixed(2)}`, pageWidth - margin - 220, y);
  doc.text(`TOTAL PESO: ${totalWeight.toFixed(2)}`, pageWidth - margin, y, { align: "right" });

  if (data.notes) {
    y += 20;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text("OBSERVACIONES:", margin, y);
    doc.text(data.notes, margin + 90, y, { maxWidth: pageWidth - margin * 2 - 90 });
  }
}

function drawSignatures(doc: jsPDF, pageWidth: number, margin: number, _data: DispatchPdfData): void {
  const signatureY = doc.internal.pageSize.getHeight() - 120;
  doc.setDrawColor(40);
  doc.line(margin, signatureY, margin + 200, signatureY);
  doc.line(pageWidth - margin - 200, signatureY, pageWidth - margin, signatureY);
  doc.setTextColor(20);
  doc.setFontSize(9);
  doc.text("ENTREGADO POR", margin + 100, signatureY + 14, { align: "center" });
  doc.text("RECIBIDO POR", pageWidth - margin - 100, signatureY + 14, { align: "center" });
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("Nombre, firma y sello", margin + 100, signatureY + 26, { align: "center" });
  doc.text("Nombre, firma y sello", pageWidth - margin - 100, signatureY + 26, { align: "center" });
}

function drawFooter(doc: jsPDF, pageWidth: number): void {
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text(PDF_COPY.footer, pageWidth / 2, doc.internal.pageSize.getHeight() - 30, {
    align: "center",
  });
}
