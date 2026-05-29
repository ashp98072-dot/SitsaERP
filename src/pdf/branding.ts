import {
  BRAND_ASSETS,
  ecoplanetSecondaryInline,
  sitsaLogoLightInline,
} from "@/assets/branding";
import { PDF_BRAND_COPY } from "@/lib/brand";

/** Paleta industrial PDF: grafito, verde corporativo oscuro, acero */
export const PDF_BRAND = {
  headerBg: [22, 28, 32] as [number, number, number],
  headerAccent: [58, 90, 68] as [number, number, number],
  primary: [38, 52, 46] as [number, number, number],
  accent: [120, 138, 128] as [number, number, number],
  rowAlt: [242, 244, 245] as [number, number, number],
  border: [180, 186, 192] as [number, number, number],
  margin: 40,
  headerHeight: 96,
} as const;

export const PDF_COPY = {
  title: PDF_BRAND_COPY.documentTitle,
  brand: PDF_BRAND_COPY.systemLine,
  subtitle: PDF_BRAND_COPY.subtitle,
  footer: PDF_BRAND_COPY.footer,
  division: PDF_BRAND_COPY.divisionNote,
} as const;

/** Imágenes oficiales embebidas en build (evita caché HTTP de fetch en PDF). */
export function loadBrandImages(): { sitsa: string; ecoplanet: string } {
  return {
    sitsa: sitsaLogoLightInline,
    ecoplanet: ecoplanetSecondaryInline,
  };
}

/** URLs con hash para preview u otros usos en UI. */
export const PDF_BRAND_IMAGE_URLS = {
  sitsa: BRAND_ASSETS.sitsa.light,
  ecoplanet: BRAND_ASSETS.ecoplanet.secondary,
} as const;
