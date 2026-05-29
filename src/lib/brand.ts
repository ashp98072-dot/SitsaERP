/** Textos y metadatos de marca — GRUPO SITSA (principal) · ECOPLANET (secundaria) */

export const BRAND = {
  company: "GRUPO SITSA",
  division: "ECOPLANET",
  productName: "GRUPO SITSA ERP",
  systemName: "Sistema Logístico Grupo SITSA",
  systemNameEn: "Grupo SITSA Warehouse & Dispatch System",
  tagline: "Logistics & Export System",
  copyright: "© GRUPO SITSA",
  copyrightWithDivision: "© GRUPO SITSA · División ECOPLANET",
} as const;

export const PAGE_TITLES = {
  default: "GRUPO SITSA ERP",
  login: "Iniciar sesión · GRUPO SITSA ERP",
  dashboard: "Dashboard · GRUPO SITSA ERP",
  debug: "Diagnóstico · GRUPO SITSA ERP",
  home: "GRUPO SITSA ERP — Sistema de Bodega",
} as const;

export const PDF_BRAND_COPY = {
  documentTitle: "COMPROBANTE DE DESPACHO",
  systemLine: "SISTEMA LOGÍSTICO GRUPO SITSA",
  subtitle: "Control de bodega · Despacho industrial · Exportación",
  footer: "Documento generado electrónicamente · GRUPO SITSA ERP",
  divisionNote: "División ECOPLANET",
} as const;

export function pageTitle(section?: string): string {
  if (!section) return PAGE_TITLES.default;
  return `${section} · ${BRAND.productName}`;
}
