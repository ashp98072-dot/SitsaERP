# Branding oficial — GRUPO SITSA · ECOPLANET

**Única carpeta válida para logos.** No agregar PNG en `src/assets/` ni reemplazar mocks fuera de aquí.

## Archivos

| Archivo | Uso |
|---------|-----|
| `sitsa-logo-light.png` | UI sobre fondos oscuros (sidebar, login, PDF header) |
| `sitsa-logo-dark.png` | UI sobre fondos claros; fuente del favicon |
| `ecoplanet-secondary.png` | Marca secundaria (sidebar, PDF, lockups) |

## Desarrollo y deploy

Tras cambiar cualquier PNG, ejecutar:

```bash
npm run branding:sync
```

O `npm run dev` / `npm run build` (sincronizan automáticamente).

`public/favicon.png` se **genera** desde `sitsa-logo-dark.png` — no editar `public/` a mano.

## Código

Importar solo desde `@/assets/branding` o `@/components/brand/Logos`.
