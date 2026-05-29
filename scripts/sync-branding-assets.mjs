/**
 * Sincroniza assets públicos desde la única fuente oficial:
 * src/assets/branding/
 *
 * Ejecutar antes de dev/build para que favicon y PWA no queden desactualizados.
 */
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const brandingDir = join(root, "src", "assets", "branding");
const publicDir = join(root, "public");

/** [archivo en branding/, destino en public/] */
const SYNC_MAP = [
  ["sitsa-logo-dark.png", "favicon.png"],
  ["sitsa-logo-dark.png", "apple-touch-icon.png"],
  ["ecoplanet-secondary.png", "ecoplanet-icon.png"],
];

let ok = true;

for (const [from, to] of SYNC_MAP) {
  const src = join(brandingDir, from);
  const dest = join(publicDir, to);
  if (!existsSync(src)) {
    console.error(`[branding] Falta archivo oficial: ${src}`);
    ok = false;
    continue;
  }
  copyFileSync(src, dest);
  console.log(`[branding] ${from} → public/${to}`);
}

if (!ok) {
  process.exit(1);
}

console.log("[branding] Assets públicos sincronizados desde src/assets/branding/");
