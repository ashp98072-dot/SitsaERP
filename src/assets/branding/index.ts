/** GRUPO SITSA — identidad visual centralizada */
import sitsaLogoLight from "./sitsa-logo-light.png";
import sitsaLogoDark from "./sitsa-logo-dark.png";
import ecoplanetSecondary from "./ecoplanet-secondary.png";

export const BRAND_ASSETS = {
  sitsa: {
    light: sitsaLogoLight,
    dark: sitsaLogoDark,
  },
  ecoplanet: {
    secondary: ecoplanetSecondary,
  },
} as const;

/** Compatibilidad con imports legacy */
export const sitsaMark = sitsaLogoLight;
export const ecoplanetMark = ecoplanetSecondary;
