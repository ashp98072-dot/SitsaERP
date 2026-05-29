import ecoUrl from "@/assets/ecoplanet-mark.png";
import sitsaUrl from "@/assets/sitsa-mark.png";

export const PDF_BRAND = {
  primary: [20, 65, 40] as [number, number, number],
  accent: [110, 180, 90] as [number, number, number],
  rowAlt: [245, 248, 245] as [number, number, number],
  margin: 40,
  headerHeight: 90,
} as const;

export const PDF_COPY = {
  title: "DESPACHO DE MERCADERÍA",
  brand: "ECOPLANET · GRUPO SITSA",
  subtitle: "Sistema corporativo de control de bodega y despacho",
  footer: "Documento generado electrónicamente · ECOPLANET / GRUPO SITSA",
} as const;

export async function loadBrandImages(): Promise<{ eco: string; sitsa: string }> {
  const [eco, sitsa] = await Promise.all([loadDataUrl(ecoUrl), loadDataUrl(sitsaUrl)]);
  return { eco, sitsa };
}

async function loadDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}
