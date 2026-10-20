# Finance upgrade

One **Keuangan** navigation icon on desktop and mobile. Internal tabs: Ringkasan (`#finance`), Transaksi (`#cashflow`), Laba-Rugi, Ekonomi Kamar, Budget & Proyeksi, Reports, and the existing Audit view. `#expenses` remains a compatible expense-filtered transaction view. Limited custom permissions retain their original scope and open the first permitted finance page.

## Recording workflow

Open **Keuangan → Transaksi → Catat Transaksi**. Choose **Uang Masuk** (received revenue) or **Uang Keluar** (paid costs), then enter description, amount, date, cash/bank account, category, room allocation and optional notes/reference. New records write only to `cash_transactions`. Existing `expenses` records stay in their original table and are edited through the same form. Both sources appear in one searchable, filterable, editable ledger with XLSX export.

Invoice rent collections are recorded automatically by payment verification in Tagihan. These rows are marked **Otomatis dari invoice** and direct edits/deletion link to Tagihan. Do not enter the same collection again manually. Opening balances are configured under **Rekening & Kas** and do not increase revenue. Deposit liabilities, loans, inter-account transfers, accrual journals and depreciation are outside this income/cost form.

The main owner dashboard uses `useFinanceData`, `financeEntries` and `financeKpis`, just like the finance workspace. It shows current-month revenue, paid costs, net profit, cash balance and actual rolling 30-day/6-month/12-month charts. Storage changes update both dashboards immediately. Occupancy history uses lease dates; no hardcoded month or simulated occupancy remains.

## Database setup

`supabase/migrations/013_finance_upgrade.sql` was applied as `finance_upgrade` to the connected Supabase project matching `.env.local`. For another environment, apply it after migrations 001–012 using the Supabase SQL editor or the project's migration workflow. It creates `expenses`, `finance_budgets`, and `room_investments`, with property-scoped owner/admin RLS, numeric validation, and room/property checks. Built-in owner/admin roles receive the new permissions; assign custom roles through Staff Management.

`014_unified_finance_transactions.sql` was also applied. It adds explicit room allocation to cash transactions and optional wallet allocation to legacy expenses, and validates positive amounts and same-property room/wallet links. Existing rows are retained. Constraint checks were run in a rolled-back transaction.

The app uses the existing Supabase browser client and KostStorage cache. Local login stores these records in the browser. A Supabase session loads authoritative property data, including empty tables, and commits writes to the cache only after the server accepts them. Failed sync displays an error and disables writes. An expired Supabase session does not silently switch to local mode.

## Calculation basis

- Cash basis: revenue comes only from `cash_transactions` income. Invoice payments are already posted there by the existing verification flow. Invoice totals are never added again.
- Expenses combine existing cash expenses and legacy expense records. All input/editing now uses the same transaction form.
- P&L separates operating expenses, interest, tax, and net profit. It does not include depreciation or other noncash journal entries.
- Cash balance includes asset wallet opening balances and all cash movements through today, including legacy expenses. Account balances use explicit wallet links, falling back to a unique matching account name for old records. Unallocated mutations remain visible and included in the property total.
- ARPU divides monthly receipts by distinct rooms with leases overlapping the period. BEP is an approximate cost-coverage room count using average room tariffs.
- Aging uses current unpaid balances after recorded payments, including partial balances. Due today belongs to the not-yet-overdue bucket.
- Unit economics uses YTD through the selected month (through today for the current year). Cash references to invoice numbers or exact room numbers map direct income. Unassigned income/costs are split equally across all rooms. ROI uses actual entered investment and is not annualized.
- Forecast uses the preceding three full months, including zero-transaction months, and compounds the chosen revenue growth assumption; costs stay at their historical average.
- PDF and XLSX use the selected report period. Aging is always the current position. Reports download directly, and do not require a print dialog.

## Verification

`npm run build` and `npx tsc --noEmit` check the app. Run `node --test scripts/test-finance.cjs` for financial invariants, calendar boundaries, invoice aging, allocation conservation, budgeting, forecasting, and PDF pagination. Set `FINANCE_PDF_QA` to an absolute PDF path to save the pagination test report for visual inspection.

Set `NEXT_DIST_DIR=.next-check` when running a validation build alongside `npm run dev`; this isolates generated output from the active development server. The transaction form, filter and single navigation icon were checked at desktop and mobile widths with disposable synthetic data and writes disabled. The temporary preview route was removed. Authenticated owner UI verification remains pending account-login authorization; no owner login was submitted.
