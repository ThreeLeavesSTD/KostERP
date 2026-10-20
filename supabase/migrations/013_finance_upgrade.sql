-- Finance data, scoped to the authenticated user's property.
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (length(trim(title)) > 0),
  category text NOT NULL CHECK (length(trim(category)) > 0),
  amount numeric(16,2) NOT NULL CHECK (amount > 0),
  date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL DEFAULT 'Kas Tunai',
  notes text,
  recorded_by text NOT NULL DEFAULT 'Admin',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS expenses_property_date ON public.expenses(property_id, date);
CREATE TABLE IF NOT EXISTS public.finance_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  month text NOT NULL CHECK (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  category text NOT NULL CHECK (length(trim(category)) > 0),
  amount numeric(16,2) NOT NULL CHECK (amount >= 0),
  UNIQUE(property_id, month, category)
);
CREATE TABLE IF NOT EXISTS public.room_investments (
  room_id uuid PRIMARY KEY REFERENCES public.rooms(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  amount numeric(16,2) NOT NULL CHECK (amount >= 0)
);
-- Reject assigning an expense/investment to a room in another property.
CREATE OR REPLACE FUNCTION public.validate_finance_room_property()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.room_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.rooms WHERE id = NEW.room_id AND property_id = NEW.property_id
  ) THEN RAISE EXCEPTION 'Room must belong to the selected property'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER expenses_room_property BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.validate_finance_room_property();
CREATE TRIGGER investments_room_property BEFORE INSERT OR UPDATE ON public.room_investments
  FOR EACH ROW EXECUTE FUNCTION public.validate_finance_room_property();
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_investments ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE tbl text; BEGIN
  FOREACH tbl IN ARRAY ARRAY['expenses', 'finance_budgets', 'room_investments'] LOOP
    EXECUTE format('CREATE POLICY finance_property_access ON public.%I FOR ALL TO authenticated USING (property_id = public.get_my_property_id() AND public.get_my_role() IN (''owner'', ''admin'')) WITH CHECK (property_id = public.get_my_property_id() AND public.get_my_role() IN (''owner'', ''admin''))', tbl);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', tbl);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl);
  END LOOP;
END $$;

-- System roles receive the new menus; custom roles remain explicitly assigned.
UPDATE public.custom_roles SET permissions = ARRAY(
  SELECT DISTINCT permission FROM unnest(permissions || ARRAY['finance', 'expenses', 'pnl', 'unit-ekonomi', 'budget', 'reports']) permission
) WHERE id IN ('owner', 'admin') AND is_system = true;
