/**
 * Fuente única de logos oficiales GRUPO SITSA · ECOPLANET.
 * No importar PNG desde otras rutas.
 */
import sitsaLogoLight from "./sitsa-logo-light.png";
import sitsaLogoDark from "./sitsa-logo-dark.png";
import ecoplanetSecondary from "./ecoplanet-secondary.png";

/** URLs con hash de contenido (Vite) — cache bust al cambiar el PNG. */
export const BRAND_ASSETS = {
  sitsa: {
    /** Fondos oscuros: sidebar, login, cabecera PDF */
    light: sitsaLogoLight,
    /** Fondos claros */
    dark: sitsaLogoDark,
  },
  ecoplanet: {
    secondary: ecoplanetSecondary,
  },
} as const;

/** Logos embebidos en PDF (base64 en build, sin fetch en runtime). */
export { default as sitsaLogoLightInline } from "./sitsa-logo-light.png?inline";
export { default as ecoplanetSecondaryInline } from "./ecoplanet-secondary.png?inline";
