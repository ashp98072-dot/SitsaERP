-- ECOPLANET / GRUPO SITSA — Enterprise hardening (must run AFTER base + access_domains)

-- ---------------------------------------------------------------------------
-- Warehouses (multi-site readiness)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  branch_name text,
  is_default boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.warehouses (code, name, branch_name, is_default)
VALUES ('MAIN', 'Bodega Principal', 'Sede central', true)
ON CONFLICT (code) DO NOTHING;

DROP INDEX IF EXISTS public.warehouses_one_default;
CREATE UNIQUE INDEX warehouses_one_default
  ON public.warehouses ((true))
  WHERE is_default = true;

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON public.audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_user_idx ON public.audit_logs (user_id);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.default_warehouse_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.warehouses WHERE is_default = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.log_audit(
  p_action text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_warehouse_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id, action, entity_type, entity_id, warehouse_id, old_values, new_values, metadata
  )
  VALUES (
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    COALESCE(p_warehouse_id, public.default_warehouse_id()),
    p_old_values,
    p_new_values,
    p_metadata
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_product_stock_locked(p_product_id uuid)
RETURNS TABLE(stock_qty numeric, stock_weight numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_product_id::text));

  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN movement_type = 'in' THEN quantity ELSE -quantity END), 0)::numeric,
    COALESCE(SUM(CASE WHEN movement_type = 'in' THEN weight ELSE -weight END), 0)::numeric
  FROM public.inventory_movements
  WHERE product_id = p_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_has_any_role(
  p_user_id uuid,
  VARIADIC p_roles public.app_role[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
      AND ur.role = ANY (p_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.assert_roles(
  p_user_id uuid,
  VARIADIC p_roles public.app_role[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.user_has_any_role(p_user_id, VARIADIC p_roles) THEN
    RAISE EXCEPTION 'No autorizado para esta operación' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Disable legacy auto-movement triggers (RPCs write movements transactionally)
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_entry_inventory ON public.warehouse_entries;
DROP TRIGGER IF EXISTS trg_dispatch_item_inventory ON public.dispatch_items;
DROP TRIGGER IF EXISTS trg_warehouse_entry_to_inventory ON public.warehouse_entries;
DROP TRIGGER IF EXISTS on_warehouse_entry_insert ON public.warehouse_entries;
DROP TRIGGER IF EXISTS trg_dispatch_to_inventory ON public.dispatches;

-- ---------------------------------------------------------------------------
-- Transactional warehouse entry
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
    product_id, movement_type, quantity, weight, unit, reference_type, reference_id
  )
  VALUES (
    p_product_id, 'in', p_quantity, p_weight, p_unit, 'warehouse_entry', v_entry.id
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
-- Transactional dispatch
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
  v_notes text;
  v_stock_qty numeric;
  v_stock_weight numeric;
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
    v_notes := NULLIF(v_item->>'notes', '');

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Cantidad inválida para producto %', v_product_id;
    END IF;

    SELECT s.stock_qty, s.stock_weight INTO v_stock_qty, v_stock_weight
    FROM public.get_product_stock_locked(v_product_id) AS s;

    IF v_stock_qty < v_qty THEN
      RAISE EXCEPTION 'Stock insuficiente para producto %. Disponible: %, solicitado: %',
        v_product_id, v_stock_qty, v_qty;
    END IF;

    INSERT INTO public.dispatch_items (dispatch_id, product_id, quantity, weight, unit, notes)
    VALUES (v_dispatch.id, v_product_id, v_qty, v_weight, v_unit, v_notes);

    INSERT INTO public.inventory_movements (
      product_id, movement_type, quantity, weight, unit, reference_type, reference_id
    )
    VALUES (
      v_product_id, 'out', v_qty, v_weight, v_unit, 'dispatch', v_dispatch.id
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
-- Audit triggers (only on tables that exist at this point)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_action := TG_TABLE_NAME || '.update';
    PERFORM public.log_audit(v_action, TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := TG_TABLE_NAME || '.delete';
    PERFORM public.log_audit(v_action, TG_TABLE_NAME, OLD.id, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clients',
    'products',
    'suppliers',
    'user_roles',
    'allowed_email_domains'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = t
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS audit_%s ON public.%I', t, t);
      EXECUTE format(
        'CREATE TRIGGER audit_%s
         AFTER UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()',
        t,
        t
      );
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Replace legacy RLS with role-based policies
-- ---------------------------------------------------------------------------
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_select ON public.audit_logs;
CREATE POLICY audit_logs_select ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'administrador')
    OR public.has_role(auth.uid(), 'supervisor')
  );

DROP POLICY IF EXISTS warehouses_select ON public.warehouses;
CREATE POLICY warehouses_select ON public.warehouses
  FOR SELECT TO authenticated
  USING (true);

-- Clients
DROP POLICY IF EXISTS "clients_select" ON public.clients;
DROP POLICY IF EXISTS "clients_insert" ON public.clients;
DROP POLICY IF EXISTS "clients_update" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_admin" ON public.clients;
DROP POLICY IF EXISTS clients_select ON public.clients;
DROP POLICY IF EXISTS clients_write ON public.clients;

CREATE POLICY clients_select ON public.clients
  FOR SELECT TO authenticated
  USING (public.user_has_any_role(auth.uid(), 'administrador', 'supervisor', 'bodega', 'despacho'));

CREATE POLICY clients_write ON public.clients
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

-- Products
DROP POLICY IF EXISTS "products_select" ON public.products;
DROP POLICY IF EXISTS "products_insert" ON public.products;
DROP POLICY IF EXISTS "products_update" ON public.products;
DROP POLICY IF EXISTS "products_delete_admin" ON public.products;
DROP POLICY IF EXISTS products_select ON public.products;
DROP POLICY IF EXISTS products_write ON public.products;

CREATE POLICY products_select ON public.products
  FOR SELECT TO authenticated
  USING (public.user_has_any_role(auth.uid(), 'administrador', 'supervisor', 'bodega', 'despacho'));

CREATE POLICY products_write ON public.products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

-- Suppliers
DROP POLICY IF EXISTS "suppliers_select" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_insert" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_update" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_delete_admin" ON public.suppliers;
DROP POLICY IF EXISTS suppliers_select ON public.suppliers;
DROP POLICY IF EXISTS suppliers_write ON public.suppliers;

CREATE POLICY suppliers_select ON public.suppliers
  FOR SELECT TO authenticated
  USING (public.user_has_any_role(auth.uid(), 'administrador', 'supervisor', 'bodega'));

CREATE POLICY suppliers_write ON public.suppliers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

-- Warehouse entries
DROP POLICY IF EXISTS "entries_select" ON public.warehouse_entries;
DROP POLICY IF EXISTS "entries_insert" ON public.warehouse_entries;
DROP POLICY IF EXISTS "entries_update" ON public.warehouse_entries;
DROP POLICY IF EXISTS "entries_delete_admin" ON public.warehouse_entries;
DROP POLICY IF EXISTS warehouse_entries_select ON public.warehouse_entries;
DROP POLICY IF EXISTS warehouse_entries_insert ON public.warehouse_entries;

CREATE POLICY warehouse_entries_select ON public.warehouse_entries
  FOR SELECT TO authenticated
  USING (public.user_has_any_role(auth.uid(), 'administrador', 'supervisor', 'bodega', 'despacho'));

CREATE POLICY warehouse_entries_insert ON public.warehouse_entries
  FOR INSERT TO authenticated
  WITH CHECK (false);

-- Dispatches
DROP POLICY IF EXISTS "dispatches_select" ON public.dispatches;
DROP POLICY IF EXISTS "dispatches_insert" ON public.dispatches;
DROP POLICY IF EXISTS "dispatches_update" ON public.dispatches;
DROP POLICY IF EXISTS "dispatches_delete_admin" ON public.dispatches;
DROP POLICY IF EXISTS dispatches_select ON public.dispatches;
DROP POLICY IF EXISTS dispatches_insert ON public.dispatches;

CREATE POLICY dispatches_select ON public.dispatches
  FOR SELECT TO authenticated
  USING (public.user_has_any_role(auth.uid(), 'administrador', 'supervisor', 'bodega', 'despacho'));

CREATE POLICY dispatches_insert ON public.dispatches
  FOR INSERT TO authenticated
  WITH CHECK (false);

-- Dispatch items
DROP POLICY IF EXISTS "dispatch_items_select" ON public.dispatch_items;
DROP POLICY IF EXISTS "dispatch_items_insert" ON public.dispatch_items;
DROP POLICY IF EXISTS "dispatch_items_update" ON public.dispatch_items;
DROP POLICY IF EXISTS "dispatch_items_delete" ON public.dispatch_items;
DROP POLICY IF EXISTS dispatch_items_select ON public.dispatch_items;
DROP POLICY IF EXISTS dispatch_items_insert ON public.dispatch_items;

CREATE POLICY dispatch_items_select ON public.dispatch_items
  FOR SELECT TO authenticated
  USING (public.user_has_any_role(auth.uid(), 'administrador', 'supervisor', 'bodega', 'despacho'));

CREATE POLICY dispatch_items_insert ON public.dispatch_items
  FOR INSERT TO authenticated
  WITH CHECK (false);

-- Inventory movements
DROP POLICY IF EXISTS "movements_select" ON public.inventory_movements;
DROP POLICY IF EXISTS "movements_insert" ON public.inventory_movements;
DROP POLICY IF EXISTS inventory_movements_select ON public.inventory_movements;
DROP POLICY IF EXISTS inventory_movements_insert ON public.inventory_movements;

CREATE POLICY inventory_movements_select ON public.inventory_movements
  FOR SELECT TO authenticated
  USING (public.user_has_any_role(auth.uid(), 'administrador', 'supervisor', 'bodega', 'despacho'));

CREATE POLICY inventory_movements_insert ON public.inventory_movements
  FOR INSERT TO authenticated
  WITH CHECK (false);

-- User roles
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_manage" ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin ON public.user_roles;
DROP POLICY IF EXISTS user_roles_select ON public.user_roles;
DROP POLICY IF EXISTS user_roles_write ON public.user_roles;

CREATE POLICY user_roles_select ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'administrador'));

CREATE POLICY user_roles_write ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

-- RPC grants
GRANT EXECUTE ON FUNCTION public.register_warehouse_entry TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_dispatch_with_items TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_stock_locked TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_any_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.assert_roles TO authenticated;
