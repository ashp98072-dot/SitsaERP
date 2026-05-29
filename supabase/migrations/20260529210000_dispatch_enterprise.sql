-- Despachos empresariales: estados, correlativos, historial, workflow, KPIs.

-- ---------------------------------------------------------------------------
-- Estado y columnas logísticas
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.dispatch_status AS ENUM (
    'borrador', 'pendiente', 'aprobado', 'despachado', 'cancelado'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.dispatches
  ADD COLUMN IF NOT EXISTS correlative text,
  ADD COLUMN IF NOT EXISTS destination text,
  ADD COLUMN IF NOT EXISTS logistics_notes text,
  ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispatched_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancel_reason text;

UPDATE public.dispatches
SET status = 'despachado'
WHERE status = 'completado';

UPDATE public.dispatches d
SET correlative = 'DSP-' || EXTRACT(YEAR FROM COALESCE(d.created_at, now()))::int::text || '-' ||
    lpad(COALESCE(d.folio, 0)::text, 6, '0')
WHERE d.correlative IS NULL;

ALTER TABLE public.dispatches
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.dispatches
  ALTER COLUMN status TYPE public.dispatch_status
  USING (
    CASE lower(trim(status::text))
      WHEN 'borrador' THEN 'borrador'::public.dispatch_status
      WHEN 'pendiente' THEN 'pendiente'::public.dispatch_status
      WHEN 'aprobado' THEN 'aprobado'::public.dispatch_status
      WHEN 'despachado' THEN 'despachado'::public.dispatch_status
      WHEN 'cancelado' THEN 'cancelado'::public.dispatch_status
      ELSE 'despachado'::public.dispatch_status
    END
  );

ALTER TABLE public.dispatches
  ALTER COLUMN status SET DEFAULT 'borrador'::public.dispatch_status;

ALTER TABLE public.dispatches
  ALTER COLUMN correlative SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dispatches_correlative
  ON public.dispatches (correlative);

CREATE INDEX IF NOT EXISTS idx_dispatches_status
  ON public.dispatches (status);

-- ---------------------------------------------------------------------------
-- Correlativo DSP-YYYY-NNNNNN (consecutivo, sin duplicar)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dispatch_correlative_counters (
  year int PRIMARY KEY,
  last_number int NOT NULL DEFAULT 0 CHECK (last_number >= 0)
);

INSERT INTO public.dispatch_correlative_counters (year, last_number)
SELECT EXTRACT(YEAR FROM now())::int, COALESCE(MAX(
  NULLIF(regexp_replace(correlative, '^DSP-\d{4}-', ''), '')::int
), 0)
FROM public.dispatches
WHERE correlative ~ '^DSP-[0-9]{4}-[0-9]+$'
ON CONFLICT (year) DO NOTHING;

CREATE OR REPLACE FUNCTION public.next_dispatch_correlative()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year int := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  v_next int;
BEGIN
  INSERT INTO public.dispatch_correlative_counters (year, last_number)
  VALUES (v_year, 0)
  ON CONFLICT (year) DO NOTHING;

  UPDATE public.dispatch_correlative_counters
  SET last_number = last_number + 1
  WHERE year = v_year
  RETURNING last_number INTO v_next;

  RETURN 'DSP-' || v_year::text || '-' || lpad(v_next::text, 6, '0');
END;
$$;

-- ---------------------------------------------------------------------------
-- Historial de estados
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dispatch_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id uuid NOT NULL REFERENCES public.dispatches(id) ON DELETE CASCADE,
  from_status public.dispatch_status,
  to_status public.dispatch_status NOT NULL,
  notes text,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_status_history_dispatch
  ON public.dispatch_status_history (dispatch_id, created_at DESC);

GRANT SELECT ON public.dispatch_status_history TO authenticated;
GRANT ALL ON public.dispatch_status_history TO service_role;

ALTER TABLE public.dispatch_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dispatch_status_history_select ON public.dispatch_status_history;
CREATE POLICY dispatch_status_history_select ON public.dispatch_status_history
  FOR SELECT TO authenticated
  USING (public.user_has_any_role(auth.uid(), 'administrador', 'supervisor', 'bodega', 'despacho'));

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_dispatch_status_change(
  p_dispatch_id uuid,
  p_from public.dispatch_status,
  p_to public.dispatch_status,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.dispatch_status_history (dispatch_id, from_status, to_status, notes, changed_by)
  VALUES (p_dispatch_id, p_from, p_to, NULLIF(trim(p_notes), ''), auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_dispatch_items_json(p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_product_id uuid;
  v_qty numeric;
  v_weight numeric;
  v_seen uuid[] := '{}';
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Debe incluir al menos un producto en el despacho';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := COALESCE((v_item->>'quantity')::numeric, 0);
    v_weight := COALESCE((v_item->>'weight')::numeric, 0);

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'Producto inválido en línea de despacho';
    END IF;

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Cantidad debe ser mayor a cero';
    END IF;

    IF v_weight < 0 THEN
      RAISE EXCEPTION 'Peso no puede ser negativo';
    END IF;

    IF v_product_id = ANY (v_seen) THEN
      RAISE EXCEPTION 'Producto duplicado en el mismo despacho. Use una sola línea por producto.';
    END IF;

    v_seen := array_append(v_seen, v_product_id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_dispatch_inventory_out(p_dispatch_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row record;
  v_stock_qty numeric;
  v_stock_weight numeric;
  v_product_code text;
BEGIN
  FOR v_row IN
    SELECT di.* FROM public.dispatch_items di WHERE di.dispatch_id = p_dispatch_id
  LOOP
    SELECT p.code INTO v_product_code FROM public.products p WHERE p.id = v_row.product_id;

    SELECT s.stock_qty, s.stock_weight INTO v_stock_qty, v_stock_weight
    FROM public.get_product_stock_locked(v_row.product_id) AS s;

    IF v_stock_qty < v_row.quantity THEN
      RAISE EXCEPTION 'Stock insuficiente (%). Disponible: %, solicitado: %',
        COALESCE(v_product_code, v_row.product_id::text), v_stock_qty, v_row.quantity
        USING ERRCODE = 'check_violation';
    END IF;

    IF v_row.weight > 0 AND v_stock_weight < v_row.weight THEN
      RAISE EXCEPTION 'Peso insuficiente (%). Disponible: %, solicitado: %',
        COALESCE(v_product_code, v_row.product_id::text), v_stock_weight, v_row.weight
        USING ERRCODE = 'check_violation';
    END IF;

    INSERT INTO public.inventory_movements (
      product_id, movement_type, quantity, weight, unit,
      reference_type, reference_id, created_by, notes
    )
    VALUES (
      v_row.product_id, 'out', v_row.quantity, v_row.weight, v_row.unit,
      'dispatch', p_dispatch_id, v_uid, v_row.notes
    );
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- Crear borrador
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_dispatch_draft(
  p_client_id uuid,
  p_dispatch_date date,
  p_driver text,
  p_vehicle text,
  p_destination text,
  p_notes text,
  p_logistics_notes text,
  p_warehouse_id uuid,
  p_items jsonb
)
RETURNS public.dispatches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_dispatch public.dispatches;
  v_item jsonb;
  v_product_id uuid;
  v_qty numeric;
  v_weight numeric;
  v_unit public.unit_type;
  v_item_notes text;
  v_wh uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesión requerida' USING ERRCODE = '42501';
  END IF;

  PERFORM public.assert_roles(v_uid, 'administrador', 'despacho');
  PERFORM public.validate_dispatch_items_json(p_items);

  v_wh := COALESCE(p_warehouse_id, public.default_warehouse_id());

  INSERT INTO public.dispatches (
    client_id, dispatch_date, driver, vehicle, destination, notes, logistics_notes,
    warehouse_id, created_by, status, correlative
  )
  VALUES (
    p_client_id,
    p_dispatch_date,
    NULLIF(p_driver, ''),
    NULLIF(p_vehicle, ''),
    NULLIF(p_destination, ''),
    NULLIF(p_notes, ''),
    NULLIF(p_logistics_notes, ''),
    v_wh,
    v_uid,
    'borrador',
    public.next_dispatch_correlative()
  )
  RETURNING * INTO v_dispatch;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::numeric;
    v_weight := COALESCE((v_item->>'weight')::numeric, 0);
    v_unit := COALESCE((v_item->>'unit')::public.unit_type, 'lbs');
    v_item_notes := NULLIF(v_item->>'notes', '');

    INSERT INTO public.dispatch_items (dispatch_id, product_id, quantity, weight, unit, notes)
    VALUES (v_dispatch.id, v_product_id, v_qty, v_weight, v_unit, v_item_notes);
  END LOOP;

  PERFORM public.log_dispatch_status_change(v_dispatch.id, NULL, 'borrador', 'Despacho creado en borrador');

  PERFORM public.log_audit(
    'dispatch.draft.create',
    'dispatch',
    v_dispatch.id,
    NULL,
    to_jsonb(v_dispatch),
    jsonb_build_object('items', p_items)
  );

  RETURN v_dispatch;
END;
$$;

-- ---------------------------------------------------------------------------
-- Actualizar borrador
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_dispatch_draft(
  p_dispatch_id uuid,
  p_client_id uuid,
  p_dispatch_date date,
  p_driver text,
  p_vehicle text,
  p_destination text,
  p_notes text,
  p_logistics_notes text,
  p_warehouse_id uuid,
  p_items jsonb
)
RETURNS public.dispatches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_dispatch public.dispatches;
  v_item jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesión requerida' USING ERRCODE = '42501';
  END IF;

  PERFORM public.assert_roles(v_uid, 'administrador', 'despacho');

  SELECT * INTO v_dispatch FROM public.dispatches WHERE id = p_dispatch_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Despacho no encontrado';
  END IF;

  IF v_dispatch.status <> 'borrador' THEN
    RAISE EXCEPTION 'Solo se pueden editar despachos en borrador';
  END IF;

  PERFORM public.validate_dispatch_items_json(p_items);

  UPDATE public.dispatches SET
    client_id = p_client_id,
    dispatch_date = p_dispatch_date,
    driver = NULLIF(p_driver, ''),
    vehicle = NULLIF(p_vehicle, ''),
    destination = NULLIF(p_destination, ''),
    notes = NULLIF(p_notes, ''),
    logistics_notes = NULLIF(p_logistics_notes, ''),
    warehouse_id = COALESCE(p_warehouse_id, warehouse_id),
    updated_at = now()
  WHERE id = p_dispatch_id
  RETURNING * INTO v_dispatch;

  DELETE FROM public.dispatch_items WHERE dispatch_id = p_dispatch_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.dispatch_items (dispatch_id, product_id, quantity, weight, unit, notes)
    VALUES (
      p_dispatch_id,
      (v_item->>'product_id')::uuid,
      (v_item->>'quantity')::numeric,
      COALESCE((v_item->>'weight')::numeric, 0),
      COALESCE((v_item->>'unit')::public.unit_type, 'lbs'),
      NULLIF(v_item->>'notes', '')
    );
  END LOOP;

  PERFORM public.log_audit(
    'dispatch.draft.update',
    'dispatch',
    v_dispatch.id,
    NULL,
    to_jsonb(v_dispatch),
    jsonb_build_object('items', p_items)
  );

  RETURN v_dispatch;
END;
$$;

-- ---------------------------------------------------------------------------
-- Transiciones de estado
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transition_dispatch_status(
  p_dispatch_id uuid,
  p_action text,
  p_notes text DEFAULT NULL
)
RETURNS public.dispatches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_dispatch public.dispatches;
  v_from public.dispatch_status;
  v_to public.dispatch_status;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesión requerida' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_dispatch FROM public.dispatches WHERE id = p_dispatch_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Despacho no encontrado';
  END IF;

  v_from := v_dispatch.status;

  CASE lower(trim(p_action))
    WHEN 'submit' THEN
      PERFORM public.assert_roles(v_uid, 'administrador', 'despacho');
      IF v_from <> 'borrador' THEN
        RAISE EXCEPTION 'Solo borradores pueden enviarse a pendiente';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.dispatch_items WHERE dispatch_id = p_dispatch_id) THEN
        RAISE EXCEPTION 'El despacho no tiene productos';
      END IF;
      v_to := 'pendiente';
      UPDATE public.dispatches SET
        status = v_to,
        submitted_at = now(),
        updated_at = now()
      WHERE id = p_dispatch_id
      RETURNING * INTO v_dispatch;

    WHEN 'approve' THEN
      PERFORM public.assert_roles(v_uid, 'administrador', 'supervisor');
      IF v_from <> 'pendiente' THEN
        RAISE EXCEPTION 'Solo despachos pendientes pueden aprobarse';
      END IF;
      v_to := 'aprobado';
      UPDATE public.dispatches SET
        status = v_to,
        approved_by = v_uid,
        approved_at = now(),
        updated_at = now()
      WHERE id = p_dispatch_id
      RETURNING * INTO v_dispatch;

    WHEN 'dispatch', 'complete' THEN
      PERFORM public.assert_roles(v_uid, 'administrador', 'despacho');
      IF v_from <> 'aprobado' THEN
        RAISE EXCEPTION 'Solo despachos aprobados pueden despacharse (salida de inventario)';
      END IF;
      PERFORM public.apply_dispatch_inventory_out(p_dispatch_id);
      v_to := 'despachado';
      UPDATE public.dispatches SET
        status = v_to,
        dispatched_at = now(),
        updated_at = now()
      WHERE id = p_dispatch_id
      RETURNING * INTO v_dispatch;

    WHEN 'cancel' THEN
      PERFORM public.assert_roles(v_uid, 'administrador', 'supervisor');
      IF v_from IN ('despachado', 'cancelado') THEN
        RAISE EXCEPTION 'No se puede cancelar un despacho ya despachado o cancelado';
      END IF;
      IF length(trim(COALESCE(p_notes, ''))) < 3 THEN
        RAISE EXCEPTION 'Indique el motivo de cancelación (mín. 3 caracteres)';
      END IF;
      v_to := 'cancelado';
      UPDATE public.dispatches SET
        status = v_to,
        cancelled_at = now(),
        cancelled_by = v_uid,
        cancel_reason = trim(p_notes),
        updated_at = now()
      WHERE id = p_dispatch_id
      RETURNING * INTO v_dispatch;

    ELSE
      RAISE EXCEPTION 'Acción de despacho inválida: %', p_action;
  END CASE;

  PERFORM public.log_dispatch_status_change(p_dispatch_id, v_from, v_to, p_notes);

  PERFORM public.log_audit(
    'dispatch.status.' || lower(trim(p_action)),
    'dispatch',
    v_dispatch.id,
    jsonb_build_object('status', v_from),
    jsonb_build_object('status', v_to),
    jsonb_build_object('notes', p_notes)
  );

  RETURN v_dispatch;
END;
$$;

-- ---------------------------------------------------------------------------
-- Legacy: creación directa despachado (compatibilidad)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_dispatch_with_items(
  p_client_id uuid,
  p_dispatch_date date,
  p_driver text,
  p_vehicle text,
  p_notes text,
  p_items jsonb
)
RETURNS public.dispatches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispatch public.dispatches;
BEGIN
  v_dispatch := public.create_dispatch_draft(
    p_client_id,
    p_dispatch_date,
    p_driver,
    p_vehicle,
    NULL,
    p_notes,
    NULL,
    NULL,
    p_items
  );

  v_dispatch := public.transition_dispatch_status(v_dispatch.id, 'submit', 'Envío automático');
  v_dispatch := public.transition_dispatch_status(v_dispatch.id, 'approve', 'Aprobación automática (flujo directo)');
  v_dispatch := public.transition_dispatch_status(v_dispatch.id, 'dispatch', 'Despacho completado');

  RETURN v_dispatch;
END;
$$;

-- ---------------------------------------------------------------------------
-- Historial enriquecido
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.dispatch_timeline
WITH (security_invoker = on) AS
SELECT
  h.id,
  h.dispatch_id,
  h.from_status,
  h.to_status,
  h.notes,
  h.created_at,
  h.changed_by,
  pr.email AS changed_by_email,
  pr.full_name AS changed_by_name
FROM public.dispatch_status_history h
LEFT JOIN public.profiles pr ON pr.id = h.changed_by;

GRANT SELECT ON public.dispatch_timeline TO authenticated;

-- ---------------------------------------------------------------------------
-- KPIs logística
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dispatch_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_today_count int;
  v_tons numeric;
  v_pending int;
  v_approved int;
  v_cancelled int;
BEGIN
  SELECT COUNT(*) INTO v_today_count
  FROM public.dispatches
  WHERE dispatch_date = v_today AND status = 'despachado';

  SELECT COALESCE(SUM(di.weight), 0) / 1000.0 INTO v_tons
  FROM public.dispatch_items di
  JOIN public.dispatches d ON d.id = di.dispatch_id
  WHERE d.dispatch_date = v_today AND d.status = 'despachado';

  SELECT
    COUNT(*) FILTER (WHERE status = 'pendiente'),
    COUNT(*) FILTER (WHERE status = 'aprobado'),
    COUNT(*) FILTER (WHERE status = 'cancelado')
  INTO v_pending, v_approved, v_cancelled
  FROM public.dispatches;

  RETURN jsonb_build_object(
    'dispatches_today', v_today_count,
    'tons_dispatched_today', ROUND(v_tons, 3),
    'pending', v_pending,
    'approved', v_approved,
    'cancelled', v_cancelled
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_dispatch_draft TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_dispatch_draft TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_dispatch_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dispatch_dashboard_stats TO authenticated;
