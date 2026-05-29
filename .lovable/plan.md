
# Sistema Web de Bodega — ECOPLANET / GRUPO SITSA

Plataforma empresarial tipo ERP industrial para control de inventario, ingresos a bodega y despachos de mercadería, con generación de comprobantes PDF imprimibles.

## Identidad visual

- Verdes industriales ECOPLANET (#16a34a / verde profundo) + azul GRUPO SITSA como acento secundario.
- Grises oscuros / negro industrial, blanco corporativo, detalles metálicos sutiles.
- Tipografía moderna sans (Inter + display ligero), tablas densas, sidebar oscura tipo ERP.
- Inspirado en SAP/Oracle Fusion/Odoo modernos, no en SaaS marketing.

## Fase 1 — Alcance de esta entrega

1. **Backend Lovable Cloud** ya habilitado.
2. **Autenticación** email/contraseña + Google. Página de login, recuperación de contraseña, página `/reset-password`. Sesión persistida.
3. **Roles de usuario** (`administrador`, `bodega`, `despacho`, `supervisor`) en tabla `user_roles` separada con `has_role()` security definer (sin escalamiento de privilegios).
4. **Layout protegido** con sidebar industrial colapsable + topbar con usuario/rol.
5. **Dashboard** con KPIs (despachos del día, peso despachado, ingresos del día, stock total, alertas de stock bajo), gráfico de movimientos (Recharts) y listas de últimos ingresos/despachos.
6. **Clientes** CRUD (empresa, contacto, NIT, dirección, teléfono, correo) con tabla, búsqueda, filtros, badges.
7. **Productos** CRUD (nombre, categoría, descripción, unidad, peso unitario, precio, código interno, stock mínimo). Unidades: `lbs`, `kg`, `ton`, `unidad`.
8. **Inventario** con vista de existencias actuales calculadas, historial de movimientos, alertas de stock bajo.
9. **Ingresos a bodega** (entradas) — formulario + listado + actualización automática de inventario vía trigger SQL. Comprobante PDF "Ingreso a Bodega".
10. **Despachos** — flujo principal: cliente + múltiples líneas (producto/cantidad/peso/unidad/observaciones), número correlativo automático, descuento de inventario vía trigger, y **comprobante PDF imprimible** inspirado en el formato real "DESPACHO DE MERCADERÍA" con logos ECOPLANET + GRUPO SITSA, encabezado verde, tabla limpia y firmas (Quien Despacha / Quien Recibe / Sello).
11. **Datos seed** iniciales (algunos productos típicos de chatarra, unidades, un cliente demo) para que se vea funcional.

Fases posteriores (no en esta entrega): Reportes avanzados con exportación Excel, módulo de trabajadores, auditoría completa, edición de despachos, multi-bodega.

## Esquema de base de datos (migración SQL)

```text
app_role (enum)         administrador | bodega | despacho | supervisor
unit_type (enum)        lbs | kg | ton | unidad

profiles                id (= auth.users.id), full_name, email, created_at
user_roles              id, user_id -> auth.users, role app_role, UNIQUE(user_id, role)
clients                 id, company, contact_name, nit, address, phone, email, notes, created_at/by
suppliers               id, name, nit, phone, contact, created_at
products                id, code (UNIQUE), name, category, description,
                        unit unit_type, unit_weight numeric, price numeric,
                        min_stock numeric, active bool, created_at
warehouse_entries       id, folio serial, supplier_id, product_id, quantity, weight,
                        unit, entry_date, notes, created_by, created_at
dispatches              id, folio serial (correlativo), client_id, dispatch_date,
                        vehicle, driver, notes, status, created_by, created_at
dispatch_items          id, dispatch_id, product_id, quantity, weight, unit, notes
inventory_movements     id, product_id, movement_type ('in'|'out'),
                        quantity, weight, reference_type, reference_id, created_at
```

Triggers:
- `on_auth_user_created` → crea `profiles` + asigna rol por defecto `bodega` (admin lo cambia luego).
- `after_insert_warehouse_entry` → inserta `inventory_movements` tipo `in`.
- `after_insert_dispatch_item` → inserta `inventory_movements` tipo `out`.
- Vista `product_stock` que suma ins − outs por producto.

RLS:
- Todas las tablas operativas: SELECT/INSERT/UPDATE para usuarios autenticados con rol válido.
- DELETE solo `administrador`.
- `user_roles`: SELECT propio + admin gestiona todos. Función `has_role(uuid, app_role)` SECURITY DEFINER.
- GRANTs explícitos a `authenticated` y `service_role`.

## Arquitectura del frontend

```text
src/
  routes/
    __root.tsx                  shell + QueryClientProvider + onAuthStateChange
    index.tsx                   redirect → /dashboard o /login
    login.tsx                   email/password + Google + link recuperar
    reset-password.tsx          set new password (post recovery)
    _authenticated.tsx          guard (context.auth) + AppShell con sidebar
    _authenticated/
      dashboard.tsx
      clients.tsx               listado
      clients.new.tsx           form crear/editar
      products.tsx
      products.new.tsx
      inventory.tsx
      entries.tsx               ingresos a bodega
      entries.new.tsx
      dispatches.tsx
      dispatches.new.tsx
      dispatches.$id.tsx        detalle + botón "Imprimir / PDF"

  components/
    layout/AppSidebar.tsx       sidebar industrial colapsable
    layout/AppTopbar.tsx
    brand/Logos.tsx             SVG ECOPLANET + GRUPO SITSA inline
    pdf/DispatchPDF.tsx         render imprimible (HTML → window.print con @media print)
    pdf/EntryPDF.tsx
    dashboard/*                 KPICard, MovementsChart, RecentList
    data-table/*                tabla genérica + filtros + búsqueda

  lib/
    auth.tsx                    AuthProvider (sesión + rol cacheado)
    queries/                    queryOptions por entidad
    pdf-print.ts                helper para abrir ventana print-only

  assets/
    ecoplanet-logo.png          generado (PNG con transparencia)
    sitsa-logo.png              generado (PNG con transparencia)
```

## Comprobante PDF

Implementación: ruta dedicada de impresión que renderiza el comprobante en HTML semántico con `@media print` + `window.print()`. Esto produce PDFs nativos del navegador, imprimibles directamente y sin dependencias pesadas. Diseño inspirado en el formato real:
- Encabezado con logo ECOPLANET (izq), título "DESPACHO DE MERCADERÍA", No. correlativo en rojo, logo GRUPO SITSA (der).
- Bloque cliente / fecha / vehículo / chofer.
- Tabla verde corporativa: Producto | Unidad | Cantidad | Peso.
- Total de peso destacado.
- Pie con firmas: Quien Despacha / Quien Recibe / Sello.
- Letra pequeña con condiciones del documento.

## Notas técnicas

- TanStack Start + TanStack Router file-based + TanStack Query como cache (patrón canónico `ensureQueryData` + `useSuspenseQuery`).
- Servidor: lecturas/escrituras vía `createServerFn` con `requireSupabaseAuth` para que apliquen RLS como el usuario.
- Google OAuth vía `lovable.auth.signInWithOAuth("google", ...)` + `supabase--configure_social_auth`.
- Tokens de diseño industriales en `src/styles.css` (verdes oklch + grises oscuros + acento azul SITSA).

Tras tu OK procedo a implementar Fase 1 completa.
