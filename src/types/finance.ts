export interface Expense {
  id: string;
  property_id: string;
  room_id?: string | null;
  wallet_id?: string | null;
  title: string;
  category: string;
  amount: number;
  date: string;
  payment_method: string;
  notes?: string | null;
  recorded_by: string;
  created_at: string;
}

export type ExpenseInput = Omit<Expense, "id" | "created_at">;

export interface FinanceBudget {
  id: string;
  property_id: string;
  month: string;
  category: string;
  amount: number;
}

export interface RoomInvestment {
  room_id: string;
  property_id: string;
  amount: number;
}

export const FINANCE_PAGES = [
  { id: "finance", label: "Ringkasan" },
  { id: "cashflow", label: "Transaksi" },
  { id: "pnl", label: "Laba-Rugi" },
  { id: "unit-ekonomi", label: "Ekonomi Kamar" },
  { id: "budget", label: "Budget & Proyeksi" },
  { id: "reports", label: "Reports" },
] as const;

export type FinancePage = (typeof FINANCE_PAGES)[number]["id"];

// Existing expense/audit URLs remain usable, with one navigation entry.
export const FINANCE_ROUTES: string[] = [...FINANCE_PAGES.map(p => p.id), "expenses", "owner-audit"];
export type FinanceWorkspacePage = FinancePage | "expenses";

export const EXPENSE_CATEGORIES = ["Operasional Kost", "Internet & WiFi", "Gaji & Kebersihan", "Listrik & Air", "Perawatan", "Keamanan & Sampah", "Perlengkapan", "Pajak", "Bunga", "Lainnya"];
