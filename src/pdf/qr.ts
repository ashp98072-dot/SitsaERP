import QRCode from "qrcode";

/** Genera PNG data URL para incrustar en jsPDF. */
export async function createQrDataUrl(payload: string, size = 120): Promise<string> {
  return QRCode.toDataURL(payload, {
    width: size,
    margin: 1,
    color: { dark: "#1a2e24", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
}
