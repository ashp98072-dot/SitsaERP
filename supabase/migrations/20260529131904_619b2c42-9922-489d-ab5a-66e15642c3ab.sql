
-- =====================================================
-- ENUMS
-- =====================================================
CREATE TYPE public.app_role AS ENUM ('administrador', 'bodega', 'despacho', 'supervisor');
CREATE TYPE public.unit_type AS ENUM ('lbs', 'kg', 'ton', 'unidad');
CREATE TYPE public.movement_type AS ENUM ('in', 'out');

-- =====================================================
-- TIMESTAMP TRIGGER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- =====================================================
-- PROFILES
-- =====================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- USER ROLES (separate table — no privilege escalation)
-- =====================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "user_roles_admin_manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

-- =====================================================
-- HANDLE NEW USER
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);

  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'administrador');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'bodega');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- CLIENTS
-- =====================================================
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company TEXT NOT NULL,
  contact_name TEXT,
  nit TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_select" ON public.clients FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "clients_insert" ON public.clients FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid()));
CREATE POLICY "clients_update" ON public.clients FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "clients_delete_admin" ON public.clients FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrador'));
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- SUPPLIERS
-- =====================================================
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  nit TEXT,
  phone TEXT,
  contact_name TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers_select" ON public.suppliers FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "suppliers_insert" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid()));
CREATE POLICY "suppliers_update" ON public.suppliers FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "suppliers_delete_admin" ON public.suppliers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrador'));
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- PRODUCTS
-- =====================================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  unit public.unit_type NOT NULL DEFAULT 'lbs',
  unit_weight NUMERIC(14,3) NOT NULL DEFAULT 0,
  price NUMERIC(14,2) NOT NULL DEFAULT 0,
  min_stock NUMERIC(14,3) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_select" ON public.products FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "products_insert" ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid()));
CREATE POLICY "products_update" ON public.products FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "products_delete_admin" ON public.products FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrador'));
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- WAREHOUSE ENTRIES (ingresos a bodega)
-- =====================================================
CREATE TABLE public.warehouse_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio BIGSERIAL UNIQUE,
  supplier_id UUID REFERENCES public.suppliers(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity NUMERIC(14,3) NOT NULL DEFAULT 0,
  weight NUMERIC(14,3) NOT NULL DEFAULT 0,
  unit public.unit_type NOT NULL DEFAULT 'lbs',
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.warehouse_entries TO authenticated;
GRANT ALL ON public.warehouse_entries TO service_role;
ALTER TABLE public.warehouse_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entries_select" ON public.warehouse_entries FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "entries_insert" ON public.warehouse_entries FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid()));
CREATE POLICY "entries_update" ON public.warehouse_entries FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "entries_delete_admin" ON public.warehouse_entries FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrador'));

-- =====================================================
-- DISPATCHES + ITEMS
-- =====================================================
CREATE TABLE public.dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio BIGSERIAL UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  dispatch_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vehicle TEXT,
  driver TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'completado',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispatches TO authenticated;
GRANT ALL ON public.dispatches TO service_role;
ALTER TABLE public.dispatches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dispatches_select" ON public.dispatches FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "dispatches_insert" ON public.dispatches FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid()));
CREATE POLICY "dispatches_update" ON public.dispatches FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "dispatches_delete_admin" ON public.dispatches FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrador'));
CREATE TRIGGER trg_dispatches_updated BEFORE UPDATE ON public.dispatches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.dispatch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id UUID NOT NULL REFERENCES public.dispatches(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity NUMERIC(14,3) NOT NULL DEFAULT 0,
  weight NUMERIC(14,3) NOT NULL DEFAULT 0,
  unit public.unit_type NOT NULL DEFAULT 'lbs',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispatch_items TO authenticated;
GRANT ALL ON public.dispatch_items TO service_role;
ALTER TABLE public.dispatch_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dispatch_items_select" ON public.dispatch_items FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "dispatch_items_insert" ON public.dispatch_items FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid()));
CREATE POLICY "dispatch_items_update" ON public.dispatch_items FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "dispatch_items_delete" ON public.dispatch_items FOR DELETE TO authenticated USING (public.has_any_role(auth.uid()));

-- =====================================================
-- INVENTORY MOVEMENTS (auto-updated by triggers)
-- =====================================================
CREATE TABLE public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id),
  movement_type public.movement_type NOT NULL,
  quantity NUMERIC(14,3) NOT NULL DEFAULT 0,
  weight NUMERIC(14,3) NOT NULL DEFAULT 0,
  unit public.unit_type NOT NULL DEFAULT 'lbs',
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "movements_select" ON public.inventory_movements FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "movements_insert" ON public.inventory_movements FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid()));

-- =====================================================
-- TRIGGERS: auto inventory movements
-- =====================================================
CREATE OR REPLACE FUNCTION public.on_entry_inventory()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.inventory_movements (product_id, movement_type, quantity, weight, unit, reference_type, reference_id)
  VALUES (NEW.product_id, 'in', NEW.quantity, NEW.weight, NEW.unit, 'warehouse_entry', NEW.id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_entry_inventory AFTER INSERT ON public.warehouse_entries
  FOR EACH ROW EXECUTE FUNCTION public.on_entry_inventory();

CREATE OR REPLACE FUNCTION public.on_dispatch_item_inventory()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.inventory_movements (product_id, movement_type, quantity, weight, unit, reference_type, reference_id)
  VALUES (NEW.product_id, 'out', NEW.quantity, NEW.weight, NEW.unit, 'dispatch_item', NEW.id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_dispatch_item_inventory AFTER INSERT ON public.dispatch_items
  FOR EACH ROW EXECUTE FUNCTION public.on_dispatch_item_inventory();

-- =====================================================
-- STOCK VIEW
-- =====================================================
CREATE OR REPLACE VIEW public.product_stock
WITH (security_invoker = on) AS
SELECT
  p.id AS product_id,
  p.code,
  p.name,
  p.category,
  p.unit,
  p.min_stock,
  COALESCE(SUM(CASE WHEN m.movement_type = 'in'  THEN m.quantity ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN m.movement_type = 'out' THEN m.quantity ELSE 0 END), 0) AS stock_quantity,
  COALESCE(SUM(CASE WHEN m.movement_type = 'in'  THEN m.weight ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN m.movement_type = 'out' THEN m.weight ELSE 0 END), 0) AS stock_weight
FROM public.products p
LEFT JOIN public.inventory_movements m ON m.product_id = p.id
GROUP BY p.id;
GRANT SELECT ON public.product_stock TO authenticated;

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_entries_product ON public.warehouse_entries(product_id);
CREATE INDEX idx_entries_date ON public.warehouse_entries(entry_date DESC);
CREATE INDEX idx_dispatches_client ON public.dispatches(client_id);
CREATE INDEX idx_dispatches_date ON public.dispatches(dispatch_date DESC);
CREATE INDEX idx_dispatch_items_dispatch ON public.dispatch_items(dispatch_id);
CREATE INDEX idx_movements_product ON public.inventory_movements(product_id);
