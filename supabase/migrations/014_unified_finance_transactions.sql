-- One cash ledger for new income and expenses; retain legacy expense records.
ALTER TABLE public.cash_transactions ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS wallet_id uuid REFERENCES public.finance_wallets(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.validate_finance_transaction_links()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.room_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.rooms WHERE id = NEW.room_id AND property_id = NEW.property_id) THEN
    RAISE EXCEPTION 'Room must belong to the transaction property';
  END IF;
  IF NEW.wallet_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.finance_wallets WHERE id = NEW.wallet_id AND property_id = NEW.property_id) THEN
    RAISE EXCEPTION 'Wallet must belong to the transaction property';
  END IF;
  IF NEW.amount <= 0 THEN RAISE EXCEPTION 'Transaction amount must be positive'; END IF;
  IF TG_TABLE_NAME = 'cash_transactions' THEN
    IF NEW.type NOT IN ('income', 'expense') THEN
      RAISE EXCEPTION 'Transaction type must be income or expense';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_cash_transaction_links BEFORE INSERT OR UPDATE ON public.cash_transactions
FOR EACH ROW EXECUTE FUNCTION public.validate_finance_transaction_links();
CREATE TRIGGER validate_expense_transaction_links BEFORE INSERT OR UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.validate_finance_transaction_links();
CREATE INDEX IF NOT EXISTS cash_transactions_room_idx ON public.cash_transactions(room_id) WHERE room_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS expenses_wallet_idx ON public.expenses(wallet_id) WHERE wallet_id IS NOT NULL;
