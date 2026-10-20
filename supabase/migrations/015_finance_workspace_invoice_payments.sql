-- Finance workspace access and invoice-to-wallet cash ledger.
-- Owner rows with a NULL user_profiles.property_id already see every property
-- through /api/properties; these explicit memberships make the same scope work
-- for direct Supabase finance and invoice queries under RLS.

CREATE TABLE IF NOT EXISTS public.property_memberships (
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, property_id)
);

INSERT INTO public.property_memberships (user_id, property_id)
SELECT profile.id, profile.property_id
FROM public.user_profiles AS profile
WHERE profile.role = 'owner' AND profile.is_active = true AND profile.property_id IS NOT NULL
UNION
SELECT profile.id, property.id
FROM public.user_profiles AS profile
CROSS JOIN public.properties AS property
WHERE profile.role = 'owner' AND profile.is_active = true AND profile.property_id IS NULL
ON CONFLICT (user_id, property_id) DO NOTHING;

ALTER TABLE public.property_memberships ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.property_memberships FROM anon;
GRANT SELECT ON public.property_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_memberships TO service_role;
CREATE POLICY property_memberships_read_own ON public.property_memberships
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.owner_can_access_property(target_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.property_memberships AS membership
    JOIN public.user_profiles AS profile ON profile.id = membership.user_id
    WHERE membership.user_id = (SELECT auth.uid())
      AND membership.property_id = target_property_id
      AND profile.role = 'owner'
      AND profile.is_active = true
  );
$$;
REVOKE EXECUTE ON FUNCTION public.owner_can_access_property(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_can_access_property(uuid) TO authenticated, service_role;

-- Preserve the current property list semantics while requiring explicit
-- membership for owner finance, invoice, and dashboard reads.
CREATE POLICY owner_membership_properties_read ON public.properties
  FOR SELECT TO authenticated USING (public.owner_can_access_property(id));

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'rooms', 'room_types', 'tenants', 'leases', 'invoices',
    'electricity_transactions', 'finance_wallets', 'cash_transactions',
    'expenses', 'finance_budgets', 'room_investments'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY owner_membership_access ON public.%I FOR ALL TO authenticated USING (public.owner_can_access_property(property_id)) WITH CHECK (public.owner_can_access_property(property_id))',
      table_name
    );
  END LOOP;
END;
$$;

CREATE POLICY owner_membership_payments_access ON public.payments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices AS invoice
      WHERE invoice.id = payments.invoice_id
        AND public.owner_can_access_property(invoice.property_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices AS invoice
      WHERE invoice.id = payments.invoice_id
        AND public.owner_can_access_property(invoice.property_id)
    )
  );

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS wallet_id uuid REFERENCES public.finance_wallets(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS payments_wallet_idx ON public.payments(wallet_id) WHERE wallet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS payments_invoice_paid_at_idx ON public.payments(invoice_id, paid_at);

-- Recover wallet attribution for older payments only when exactly one matching
-- account exists. Ambiguous historic rows stay explicitly unassigned.
UPDATE public.payments AS payment
SET wallet_id = wallet.id
FROM public.invoices AS invoice, public.finance_wallets AS wallet
WHERE invoice.id = payment.invoice_id
  AND wallet.property_id = invoice.property_id
  AND lower(wallet.name) = lower(payment.payment_method)
  AND payment.wallet_id IS NULL
  AND 1 = (
    SELECT count(*)
    FROM public.finance_wallets AS candidate
    WHERE candidate.property_id = invoice.property_id
      AND lower(candidate.name) = lower(payment.payment_method)
  );

CREATE OR REPLACE FUNCTION public.validate_invoice_payment_posting()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  invoice_property_id uuid;
  invoice_total numeric(16, 2);
  wallet_property_id uuid;
  wallet_kind text;
  already_paid numeric(16, 2);
BEGIN
  IF NEW.amount_paid IS NULL OR NEW.amount_paid <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive';
  END IF;
  IF NEW.wallet_id IS NULL THEN
    RAISE EXCEPTION 'Choose a cash wallet for the invoice payment';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.invoice_id <> OLD.invoice_id THEN
    RAISE EXCEPTION 'A payment cannot be moved to another invoice';
  END IF;

  SELECT property_id, total_amount
  INTO invoice_property_id, invoice_total
  FROM public.invoices
  WHERE id = NEW.invoice_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  SELECT property_id, wallet_kind
  INTO wallet_property_id, wallet_kind
  FROM public.finance_wallets
  WHERE id = NEW.wallet_id;
  IF NOT FOUND OR wallet_property_id <> invoice_property_id OR wallet_kind = 'liability' THEN
    RAISE EXCEPTION 'Payment wallet must be an asset account in the invoice property';
  END IF;

  SELECT COALESCE(sum(amount_paid), 0)
  INTO already_paid
  FROM public.payments
  WHERE invoice_id = NEW.invoice_id
    AND (TG_OP = 'INSERT' OR id <> NEW.id);
  IF already_paid + NEW.amount_paid > invoice_total THEN
    RAISE EXCEPTION 'Payment exceeds the outstanding invoice balance';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_invoice_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  target_invoice_id uuid;
  invoice_total numeric(16, 2);
  invoice_due_date date;
  total_paid numeric(16, 2);
BEGIN
  target_invoice_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.invoice_id ELSE NEW.invoice_id END;
  SELECT total_amount, due_date
  INTO invoice_total, invoice_due_date
  FROM public.invoices
  WHERE id = target_invoice_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COALESCE(sum(amount_paid), 0)
  INTO total_paid
  FROM public.payments
  WHERE invoice_id = target_invoice_id;

  UPDATE public.invoices
  SET status = CASE
    WHEN total_paid >= invoice_total THEN 'paid'::public.invoice_status
    WHEN invoice_due_date < CURRENT_DATE THEN 'overdue'::public.invoice_status
    ELSE 'unpaid'::public.invoice_status
  END
  WHERE id = target_invoice_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS payments_validate_finance_posting ON public.payments;
CREATE TRIGGER payments_validate_finance_posting
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.validate_invoice_payment_posting();

DROP TRIGGER IF EXISTS payments_sync_invoice_status ON public.payments;
CREATE TRIGGER payments_sync_invoice_status
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_payment_status();
