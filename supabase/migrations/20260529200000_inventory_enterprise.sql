-- Inventario empresarial: kardex, ajustes, alertas, validación stock, auditoría.

-- ---------------------------------------------------------------------------
-- Extender movimientos
-- ---------------------------------------------------------------------------
ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS idx_movements_product_created
  ON public.inventory_movements (product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_movements_reference
  ON public.inventory_movements (reference_type, reference_id);

-- ---------------------------------------------------------------------------
-- Ajustes manuales (cabecera)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id),
  direction text NOT NULL CHECK (direction IN ('increase', 'decrease')),
  quantity numeric(14,3) NOT NULL CHECK (quantity > 0),
  weight numeric(14,3) NOT NULL DEFAULT 0 CHECK (weight >= 0),
  unit public.unit_type NOT NULL DEFAULT 'lbs',
  reason text NOT NULL,
  movement_id uuid REFERENCES public.inventory_movements(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_product
  ON public.inventory_adjustments (product_id, created_at DESC);

GRANT SELECT ON public.inventory_adjustments TO authenticated;
GRANT ALL ON public.inventory_adjustments TO service_role;

ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_adjustments_select ON public.inventory_adjustments;
CREATE POLICY inventory_adjustments_select ON public.inventory_adjustments
  FOR SELECT TO authenticated
  USING (public.user_has_any_role(auth.uid(), 'administrador', 'supervisor', 'bodega', 'despacho'));

DROP POLICY IF EXISTS inventory_adjustments_insert ON public.inventory_adjustments;
CREATE POLICY inventory_adjustments_insert ON public.inventory_adjustments
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_any_role(auth.uid(), 'administrador', 'supervisor'));

-- ---------------------------------------------------------------------------
-- Etiqueta legible de tipo de movimiento
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.inventory_movement_kind(p_reference_type text, p_movement_type public.movement_type)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_reference_type = 'warehouse_entry' THEN 'ingreso_bodega'
    WHEN p_reference_type = 'dispatch' THEN 'despacho'
    WHEN p_reference_type = 'inventory_adjustment' THEN 'ajuste_manual'
    WHEN p_reference_type = 'inventory_correction' THEN 'correccion'
    WHEN p_reference_type = 'inventory_return' THEN 'devolucion'
    WHEN p_movement_type = 'in' THEN 'entrada'
    ELSE 'salida'
  END;
$$;

-- ---------------------------------------------------------------------------
-- Stock enriquecido + nivel de alerta
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.product_stock_enriched
WITH (security_invoker = on) AS
SELECT
  p.id AS product_id,
  p.code,
  p.name,
  p.category,
  p.unit,
  p.min_stock,
  p.active,
  COALESCE(s.stock_quantity, 0) AS stock_quantity,
  COALESCE(s.stock_weight, 0) AS stock_weight,
  CASE
    WHEN COALESCE(s.stock_quantity, 0) <= 0 THEN 'agotado'
    WHEN COALESCE(s.stock_quantity, 0) <= p.min_stock * 0.5 THEN 'critico'
    WHEN COALESCE(s.stock_quantity, 0) <= p.min_stock THEN 'bajo'
    ELSE 'ok'
  END AS alert_level
FROM public.products p
LEFT JOIN public.product_stock s ON s.product_id = p.id
WHERE p.active = true;

GRANT SELECT ON public.product_stock_enriched TO authenticated;

-- ---------------------------------------------------------------------------
-- Kardex con saldo acumulado
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.product_kardex
WITH (security_invoker = on) AS
SELECT
  m.id AS movement_id,
  m.product_id,
  m.created_at,
  public.inventory_movement_kind(m.reference_type, m.movement_type) AS movement_kind,
  m.movement_type,
  CASE WHEN m.movement_type = 'in' THEN m.quantity ELSE 0 END AS qty_in,
  CASE WHEN m.movement_type = 'out' THEN m.quantity ELSE 0 END AS qty_out,
  CASE WHEN m.movement_type = 'in' THEN m.weight ELSE 0 END AS weight_in,
  CASE WHEN m.movement_type = 'out' THEN m.weight ELSE 0 END AS weight_out,
  m.unit,
  SUM(CASE WHEN m.movement_type = 'in' THEN m.quantity ELSE -m.quantity END)
    OVER (PARTITION BY m.product_id ORDER BY m.created_at ASC, m.id ASC) AS balance_qty,
  SUM(CASE WHEN m.movement_type = 'in' THEN m.weight ELSE -m.weight END)
    OVER (PARTITION BY m.product_id ORDER BY m.created_at ASC, m.id ASC) AS balance_weight,
  m.reference_type,
  m.reference_id,
  m.notes,
  m.created_by,
  pr.email AS created_by_email,
  pr.full_name AS created_by_name
FROM public.inventory_movements m
LEFT JOIN public.profiles pr ON pr.id = m.created_by;

GRANT SELECT ON public.product_kardex TO authenticated;

-- ---------------------------------------------------------------------------
-- Actualizar ingreso bodega (movimiento + auditoría)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_warehouse_entry(
  p_product_id uuid,
  p_supplier_id uuid,
  p_quantity numeric,
  p_weight numeric,
  p_unit public.unit_type,
  p_entry_date date,
  p_notes text DEFAULT NULL
)
RETURNS public.warehouse_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_entry public.warehouse_entries;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesión requerida' USING ERRCODE = '42501';
  END IF;

  PERFORM public.assert_roles(v_uid, 'administrador', 'bodega');

  IF p_quantity <= 0 OR p_weight < 0 THEN
    RAISE EXCEPTION 'Cantidad y peso deben ser válidos';
  END IF;

  INSERT INTO public.warehouse_entries (
    product_id, supplier_id, quantity, weight, unit, entry_date, notes, created_by
  )
  VALUES (
    p_product_id, p_supplier_id, p_quantity, p_weight, p_unit, p_entry_date, p_notes, v_uid
  )
  RETURNING * INTO v_entry;

  INSERT INTO public.inventory_movements (
    product_id, movement_type, quantity, weight, unit,
    reference_type, reference_id, created_by, notes
  )
  VALUES (
    p_product_id, 'in', p_quantity, p_weight, p_unit,
    'warehouse_entry', v_entry.id, v_uid, p_notes
  );

  PERFORM public.log_audit(
    'warehouse_entry.create',
    'warehouse_entry',
    v_entry.id,
    NULL,
    to_jsonb(v_entry),
    jsonb_build_object('product_id', p_product_id, 'quantity', p_quantity, 'weight', p_weight)
  );

  RETURN v_entry;
END;
$$;

-- ---------------------------------------------------------------------------
-- Despacho: bloqueo cantidad + peso, sin parcial
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
  v_uid uuid := auth.uid();
  v_dispatch public.dispatches;
  v_item jsonb;
  v_product_id uuid;
  v_qty numeric;
  v_weight numeric;
  v_unit public.unit_type;
  v_item_notes text;
  v_stock_qty numeric;
  v_stock_weight numeric;
  v_product_code text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesión requerida' USING ERRCODE = '42501';
  END IF;

  PERFORM public.assert_roles(v_uid, 'administrador', 'despacho');

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Debe incluir al menos un producto';
  END IF;

  INSERT INTO public.dispatches (
    client_id, dispatch_date, driver, vehicle, notes, created_by, status
  )
  VALUES (
    p_client_id,
    p_dispatch_date,
    NULLIF(p_driver, ''),
    NULLIF(p_vehicle, ''),
    NULLIF(p_notes, ''),
    v_uid,
    'completado'
  )
  RETURNING * INTO v_dispatch;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := COALESCE((v_item->>'quantity')::numeric, 0);
    v_weight := COALESCE((v_item->>'weight')::numeric, 0);
    v_unit := COALESCE((v_item->>'unit')::public.unit_type, 'lbs');
    v_item_notes := NULLIF(v_item->>'notes', '');

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Cantidad inválida para producto %', v_product_id;
    END IF;

    IF v_weight < 0 THEN
      RAISE EXCEPTION 'Peso inválido para producto %', v_product_id;
    END IF;

    SELECT p.code INTO v_product_code FROM public.products p WHERE p.id = v_product_id;

    SELECT s.stock_qty, s.stock_weight INTO v_stock_qty, v_stock_weight
    FROM public.get_product_stock_locked(v_product_id) AS s;

    IF v_stock_qty < v_qty THEN
      RAISE EXCEPTION 'Stock insuficiente (%). Disponible: %, solicitado: %',
        COALESCE(v_product_code, v_product_id::text), v_stock_qty, v_qty
        USING ERRCODE = 'check_violation';
    END IF;

    IF v_weight > 0 AND v_stock_weight < v_weight THEN
      RAISE EXCEPTION 'Peso insuficiente (%). Disponible: %, solicitado: %',
        COALESCE(v_product_code, v_product_id::text), v_stock_weight, v_weight
        USING ERRCODE = 'check_violation';
    END IF;

    INSERT INTO public.dispatch_items (dispatch_id, product_id, quantity, weight, unit, notes)
    VALUES (v_dispatch.id, v_product_id, v_qty, v_weight, v_unit, v_item_notes);

    INSERT INTO public.inventory_movements (
      product_id, movement_type, quantity, weight, unit,
      reference_type, reference_id, created_by, notes
    )
    VALUES (
      v_product_id, 'out', v_qty, v_weight, v_unit,
      'dispatch', v_dispatch.id, v_uid, v_item_notes
    );
  END LOOP;

  PERFORM public.log_audit(
    'dispatch.create',
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
-- Ajuste manual de inventario
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_inventory_adjustment(
  p_product_id uuid,
  p_direction text,
  p_quantity numeric,
  p_weight numeric,
  p_unit public.unit_type,
  p_reason text
)
RETURNS public.inventory_adjustments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_adj public.inventory_adjustments;
  v_movement_id uuid;
  v_stock_qty numeric;
  v_stock_weight numeric;
  v_mov_type public.movement_type;
  v_ref_type text;
  v_product_code text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesión requerida' USING ERRCODE = '42501';
  END IF;

  PERFORM public.assert_roles(v_uid, 'administrador', 'supervisor');

  IF p_direction NOT IN ('increase', 'decrease') THEN
    RAISE EXCEPTION 'Dirección de ajuste inválida';
  END IF;

  IF p_quantity <= 0 OR p_weight < 0 OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'Cantidad, peso y motivo (mín. 3 caracteres) son requeridos';
  END IF;

  SELECT code INTO v_product_code FROM public.products WHERE id = p_product_id;

  IF p_direction = 'increase' THEN
    v_mov_type := 'in';
    v_ref_type := 'inventory_adjustment';
  ELSE
    v_mov_type := 'out';
    v_ref_type := 'inventory_adjustment';
    SELECT s.stock_qty, s.stock_weight INTO v_stock_qty, v_stock_weight
    FROM public.get_product_stock_locked(p_product_id) AS s;

    IF v_stock_qty < p_quantity THEN
      RAISE EXCEPTION 'No se puede disminuir: stock disponible %, solicitado %',
        v_stock_qty, p_quantity USING ERRCODE = 'check_violation';
    END IF;

    IF p_weight > 0 AND v_stock_weight < p_weight THEN
      RAISE EXCEPTION 'No se puede disminuir peso: disponible %, solicitado %',
        v_stock_weight, p_weight USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  INSERT INTO public.inventory_movements (
    product_id, movement_type, quantity, weight, unit,
    reference_type, reference_id, created_by, notes
  )
  VALUES (
    p_product_id, v_mov_type, p_quantity, p_weight, p_unit,
    v_ref_type, NULL, v_uid, p_reason
  )
  RETURNING id INTO v_movement_id;

  INSERT INTO public.inventory_adjustments (
    product_id, direction, quantity, weight, unit, reason, movement_id, created_by
  )
  VALUES (
    p_product_id, p_direction, p_quantity, p_weight, p_unit, trim(p_reason), v_movement_id, v_uid
  )
  RETURNING * INTO v_adj;

  UPDATE public.inventory_movements SET reference_id = v_adj.id WHERE id = v_movement_id;

  PERFORM public.log_audit(
    'inventory.adjustment',
    'inventory_adjustment',
    v_adj.id,
    NULL,
    to_jsonb(v_adj),
    jsonb_build_object('product_code', v_product_code, 'direction', p_direction)
  );

  RETURN v_adj;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_inventory_adjustment TO authenticated;

-- ---------------------------------------------------------------------------
-- KPIs inventario (hoy)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_inventory_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_total_tons numeric;
  v_critical int;
  v_low int;
  v_out int;
  v_movements_today int;
  v_entries_today int;
  v_dispatches_today int;
BEGIN
  SELECT COALESCE(SUM(stock_weight), 0) / 1000.0 INTO v_total_tons
  FROM public.product_stock_enriched;

  SELECT
    COUNT(*) FILTER (WHERE alert_level = 'critico'),
    COUNT(*) FILTER (WHERE alert_level = 'bajo'),
    COUNT(*) FILTER (WHERE alert_level = 'agotado')
  INTO v_critical, v_low, v_out
  FROM public.product_stock_enriched;

  SELECT COUNT(*) INTO v_movements_today
  FROM public.inventory_movements
  WHERE created_at::date = v_today;

  SELECT COUNT(*) INTO v_entries_today
  FROM public.warehouse_entries
  WHERE entry_date = v_today;

  SELECT COUNT(*) INTO v_dispatches_today
  FROM public.dispatches
  WHERE dispatch_date = v_today;

  RETURN jsonb_build_object(
    'total_tons', ROUND(v_total_tons, 3),
    'products_critical', v_critical,
    'products_low', v_low,
    'products_out', v_out,
    'movements_today', v_movements_today,
    'entries_today', v_entries_today,
    'dispatches_today', v_dispatches_today
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_inventory_dashboard_stats TO authenticated;
