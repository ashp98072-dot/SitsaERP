import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ecoUrl from "@/assets/ecoplanet-mark.png";
import sitsaUrl from "@/assets/sitsa-mark.png";

async function loadDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise<string>((resolve) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.readAsDataURL(blob);
  });
}

export type DispatchPdfData = {
  folio: number;
  date: string;
  client: { company: string; nit?: string|null; address?: string|null; contact_name?: string|null };
  driver?: string|null;
  vehicle?: string|null;
  notes?: string|null;
  items: Array<{ code: string; name: string; quantity: number; weight: number; unit: string; notes?: string|null }>;
  issuedBy?: string|null;
};

export async function generateDispatchPdf(d: DispatchPdfData) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;

  const [eco, sitsa] = await Promise.all([loadDataUrl(ecoUrl), loadDataUrl(sitsaUrl)]);

  // Header band
  doc.setFillColor(20, 65, 40);
  doc.rect(0, 0, W, 90, "F");
  doc.setFillColor(110, 180, 90);
  doc.rect(0, 90, W, 4, "F");

  doc.addImage(eco, "PNG", M, 18, 56, 56);
  doc.addImage(sitsa, "PNG", W - M - 56, 18, 56, 56);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("DESPACHO DE MERCADERÍA", W / 2, 42, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("ECOPLANET · GRUPO SITSA", W / 2, 60, { align: "center" });
  doc.setFontSize(9);
  doc.text("Sistema corporativo de control de bodega y despacho", W / 2, 74, { align: "center" });

  // Folio + fecha box
  doc.setTextColor(20, 20, 20);
  doc.setDrawColor(180);
  doc.setLineWidth(0.6);
  let y = 115;
  doc.roundedRect(M, y, W - M * 2, 56, 4, 4);
  doc.setFontSize(8);
  doc.setTextColor(110);
  doc.text("COMPROBANTE No.", M + 12, y + 16);
  doc.text("FECHA", M + 180, y + 16);
  doc.text("EMITIDO POR", M + 320, y + 16);
  doc.setTextColor(20);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(`DM-${String(d.folio).padStart(6, "0")}`, M + 12, y + 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(d.date, M + 180, y + 36);
  doc.text(d.issuedBy || "—", M + 320, y + 36);

  // Cliente
  y += 70;
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text("CLIENTE / RECEPTOR", M, y);
  y += 4;
  doc.setDrawColor(220);
  doc.line(M, y, W - M, y);
  y += 14;
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(d.client.company, M, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y += 14;
  if (d.client.nit) { doc.text(`NIT: ${d.client.nit}`, M, y); y += 12; }
  if (d.client.contact_name) { doc.text(`Contacto: ${d.client.contact_name}`, M, y); y += 12; }
  if (d.client.address) { doc.text(`Dirección: ${d.client.address}`, M, y); y += 12; }

  // Transporte
  if (d.driver || d.vehicle) {
    y += 8;
    doc.setFontSize(9); doc.setTextColor(110);
    doc.text("TRANSPORTE", M, y);
    y += 4;
    doc.line(M, y, W - M, y);
    y += 14;
    doc.setTextColor(20); doc.setFontSize(10);
    if (d.driver) { doc.text(`Piloto: ${d.driver}`, M, y); }
    if (d.vehicle) { doc.text(`Vehículo / Placa: ${d.vehicle}`, M + 220, y); }
    y += 14;
  }

  // Tabla productos
  y += 8;
  autoTable(doc, {
    startY: y,
    head: [["Código", "Descripción", "Cant.", "Peso", "Unidad"]],
    body: d.items.map(i => [i.code, i.name, Number(i.quantity).toFixed(2), Number(i.weight).toFixed(2), i.unit]),
    styles: { font: "helvetica", fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [20, 65, 40], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 248, 245] },
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "center" } },
    margin: { left: M, right: M },
  });
  // @ts-ignore
  y = (doc as any).lastAutoTable.finalY + 10;

  // Totales
  const totalQty = d.items.reduce((s, i) => s + Number(i.quantity), 0);
  const totalW = d.items.reduce((s, i) => s + Number(i.weight), 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL CANTIDAD: ${totalQty.toFixed(2)}`, W - M - 220, y);
  doc.text(`TOTAL PESO: ${totalW.toFixed(2)}`, W - M, y, { align: "right" });

  if (d.notes) {
    y += 20;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text("OBSERVACIONES:", M, y);
    doc.text(d.notes, M + 90, y, { maxWidth: W - M * 2 - 90 });
  }

  // Firmas
  const sigY = doc.internal.pageSize.getHeight() - 120;
  doc.setDrawColor(40);
  doc.line(M, sigY, M + 200, sigY);
  doc.line(W - M - 200, sigY, W - M, sigY);
  doc.setTextColor(20);
  doc.setFontSize(9);
  doc.text("ENTREGADO POR", M + 100, sigY + 14, { align: "center" });
  doc.text("RECIBIDO POR", W - M - 100, sigY + 14, { align: "center" });
  doc.setFontSize(8); doc.setTextColor(120);
  doc.text("Nombre, firma y sello", M + 100, sigY + 26, { align: "center" });
  doc.text("Nombre, firma y sello", W - M - 100, sigY + 26, { align: "center" });

  // Pie
  doc.setFontSize(8); doc.setTextColor(140);
  doc.text("Documento generado electrónicamente · ECOPLANET / GRUPO SITSA", W / 2, doc.internal.pageSize.getHeight() - 30, { align: "center" });

  doc.save(`Despacho-DM-${String(d.folio).padStart(6, "0")}.pdf`);
}
