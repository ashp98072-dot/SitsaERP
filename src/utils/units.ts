import type { UnitType } from "@/types";

/** Factores a kilogramos (masa/peso operativo). */
const TO_KG: Record<UnitType, number> = {
  kg: 1,
  ton: 1000,
  lbs: 0.45359237,
  unidad: 1,
};

export const UNIT_LABELS: Record<UnitType, string> = {
  lbs: "Libras (lbs)",
  kg: "Kilogramos (kg)",
  ton: "Toneladas (ton)",
  unidad: "Unidades",
};

/** Convierte un valor de peso/masa entre unidades industriales. */
export function convertWeight(value: number, from: UnitType, to: UnitType): number {
  if (from === to) return value;
  const kg = value * TO_KG[from];
  return kg / TO_KG[to];
}

export function weightToKg(value: number, unit: UnitType): number {
  return convertWeight(value, unit, "kg");
}

export function weightToTons(value: number, unit: UnitType): number {
  return convertWeight(value, unit, "ton");
}

export function formatWeight(value: number, unit: UnitType, decimals = 2): string {
  return `${value.toFixed(decimals)} ${unit}`;
}

export function formatTonsFromWeight(weight: number, unit: UnitType, decimals = 3): string {
  return `${weightToTons(weight, unit).toFixed(decimals)} ton`;
}
