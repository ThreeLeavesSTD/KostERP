import { createClient } from "./supabase/client";
import { KostStorage, generateUUID } from "./storage";
import type { Expense, ExpenseInput, FinanceBudget, RoomInvestment } from "@/types/finance";
import { invoicePaymentSummary, localDate, transactionInvoice } from "./finance";
import type { CashTransaction, ElectricityTransaction, FinanceWallet, Invoice, Lease, Payment, Property, Room, RoomType, Tenant } from "@/types";

// Follow KostStorage's local cache pattern. Authenticated writes must succeed
// remotely before committing the cache; never disguise an RLS/network failure.
export async function financeIsLocal() {
  if (typeof window !== "undefined" && localStorage.getItem("kost_local_auth_user")) return true;
  const { data: { session }, error } = await createClient().auth.getSession();
  if (error) throw error;
  if (!session) throw new Error("Sesi Supabase berakhir. Masuk kembali untuk memuat dan menyimpan data finance.");
  return false;
}

function validateTransaction(input: { title: string; amount: number; date: string; property_id: string; room_id?: string | null; wallet_id?: string | null }) {
  const date = new Date(`${input.date}T12:00:00`);
  if (!input.property_id || !input.title.trim() || !Number.isFinite(input.amount) || input.amount <= 0 || Number.isNaN(date.getTime()) || localDate(date) !== input.date || input.date > localDate()) throw new Error("Isi nama, nominal positif, dan tanggal transaksi yang valid.");
  if (input.room_id && !KostStorage.getRooms().some(r => r.id === input.room_id && r.property_id === input.property_id)) throw new Error("Kamar tidak sesuai properti.");
  if (input.wallet_id && !KostStorage.getWallets().some(w => w.id === input.wallet_id && w.property_id === input.property_id && w.wallet_kind !== "liability")) throw new Error("Pilih rekening kas milik properti ini.");
}

export const FinanceApi = {
  async getWallets(propertyId: string): Promise<FinanceWallet[]> {
    if (await financeIsLocal()) return KostStorage.getWallets().filter(wallet => wallet.property_id === propertyId && wallet.wallet_kind !== "liability");
    const { data, error } = await createClient().from("finance_wallets").select("*").eq("property_id", propertyId).order("created_at", { ascending: true });
    if (error) throw new Error(error.message || "Wallet tidak dapat dimuat.");
    const wallets = (data || []) as FinanceWallet[];
    KostStorage.saveWallets([...KostStorage.getWallets().filter(wallet => wallet.property_id !== propertyId), ...wallets]);
    return wallets.filter(wallet => wallet.wallet_kind !== "liability");
  },
  async saveTransaction(input: Omit<CashTransaction, "id" | "created_at">, id?: string) {
    const existing = id ? KostStorage.getCashTransactions().find(r => r.id === id && r.property_id === input.property_id) : undefined;
    if (id && !existing) throw new Error("Transaksi tidak ditemukan.");
    const scope = { invoices: KostStorage.getInvoices().filter(r => r.property_id === input.property_id) };
    if (existing?.type === "income" && transactionInvoice(existing, scope)) throw new Error("Transaksi invoice dikelola melalui Tagihan.");
    validateTransaction(input);
    if (!["income", "expense"].includes(input.type)) throw new Error("Pilih jenis uang masuk atau uang keluar.");
    if (input.type === "income" && transactionInvoice(input, scope)) throw new Error("Pembayaran invoice dicatat melalui Tagihan agar saldo dan sisa tagihan tetap akurat.");
    const wallet = KostStorage.getWallets().find(w => w.id === input.wallet_id && w.property_id === input.property_id && w.wallet_kind !== "liability");
    if (!wallet) throw new Error("Pilih rekening kas milik properti ini.");
    const payload = { property_id: input.property_id, type: input.type, category: input.category, category_name: input.category_name || input.category,
      wallet_id: wallet.id, wallet_name: wallet.name, room_id: input.room_id || null, title: input.title.trim(), amount: input.amount, date: input.date,
      payment_method: wallet.name, notes: input.notes?.trim() || undefined, recorded_by: existing?.recorded_by || input.recorded_by,
      receipt_url: existing?.receipt_url };
    let row: CashTransaction = { ...payload, id: id || generateUUID(), created_at: existing?.created_at || new Date().toISOString() };
    if (!await financeIsLocal()) {
      const client = createClient();
      const query = id ? client.from("cash_transactions").update({ ...payload, notes: payload.notes || null }).eq("id", id).eq("property_id", input.property_id) : client.from("cash_transactions").insert(row);
      const { data, error } = await query.select().single();
      if (error) throw error;
      row = data as CashTransaction;
    }
    KostStorage.saveCashTransactions([row, ...KostStorage.getCashTransactions().filter(r => r.id !== row.id)]);
    return row;
  },
  async recordInvoicePayment(input: {
    invoice_id: string;
    amount_paid: number;
    wallet_id: string;
    proof_url?: string;
    verified_by?: string;
    notes?: string;
  }): Promise<Payment> {
    const invoice = KostStorage.getInvoices().find(row => row.id === input.invoice_id);
    if (!invoice) throw new Error("Invoice tidak ditemukan.");
    const wallet = KostStorage.getWallets().find(row => row.id === input.wallet_id && row.property_id === invoice.property_id && row.wallet_kind !== "liability");
    if (!wallet) throw new Error("Pilih wallet kas milik properti pada invoice ini.");
    const { outstanding } = invoicePaymentSummary(invoice);
    if (!Number.isFinite(input.amount_paid) || input.amount_paid <= 0 || input.amount_paid > outstanding) throw new Error("Nominal pembayaran harus lebih dari nol dan tidak boleh melebihi sisa tagihan.");

    if (await financeIsLocal()) {
      return KostStorage.verifyPayment({
        ...input,
        payment_method: wallet.name,
      });
    }

    const { data, error } = await createClient().from("payments").insert({
      invoice_id: invoice.id,
      amount_paid: input.amount_paid,
      payment_method: wallet.name,
      wallet_id: wallet.id,
      proof_url: input.proof_url || null,
      verified_by: input.verified_by || "Admin Kost",
      notes: input.notes?.trim() || null,
    }).select().single();
    if (error) throw new Error(error.message || "Pembayaran invoice gagal disimpan.");

    const payment: Payment = { ...data, amount_paid: Number(data.amount_paid) } as Payment;
    const payments = [...(invoice.payments || []), payment];
    const paid = payments.reduce((total, row) => total + Number(row.amount_paid || 0), 0);
    const status = paid >= Number(invoice.total_amount)
      ? "paid"
      : invoice.due_date < localDate() ? "overdue" : "unpaid";
    KostStorage.saveInvoices(KostStorage.getInvoices().map(row => row.id === invoice.id ? { ...row, payments, status } : row));
    return payment;
  },
  async deleteTransaction(row: CashTransaction) {
    const scope = { invoices: KostStorage.getInvoices().filter(r => r.property_id === row.property_id) };
    if (row.type === "income" && transactionInvoice(row, scope)) throw new Error("Transaksi invoice dikelola melalui Tagihan.");
    if (!await financeIsLocal()) {
      const { data, error } = await createClient().from("cash_transactions").delete().eq("id", row.id).eq("property_id", row.property_id).select("id").single();
      if (error || !data) throw error || new Error("Transaksi tidak dapat dihapus.");
    }
    KostStorage.saveCashTransactions(KostStorage.getCashTransactions().filter(r => r.id !== row.id));
  },
  async saveWallet(input: Omit<FinanceWallet, "id" | "created_at">, id?: string) {
    const existing = id ? KostStorage.getWallets().find(w => w.id === id && w.property_id === input.property_id) : undefined;
    if (id && !existing) throw new Error("Rekening tidak ditemukan.");
    if (!input.name.trim() || !Number.isFinite(input.initial_balance) || input.initial_balance < 0) throw new Error("Isi nama rekening dan saldo awal yang valid.");
    if (KostStorage.getWallets().some(w => w.property_id === input.property_id && w.id !== id && w.name.toLowerCase() === input.name.trim().toLowerCase())) throw new Error("Nama rekening sudah digunakan.");
    let row: FinanceWallet = { ...existing, ...input, name: input.name.trim(), wallet_kind: "asset", id: id || generateUUID(), created_at: existing?.created_at || new Date().toISOString() };
    if (!await financeIsLocal()) {
      const client = createClient();
      const query = id ? client.from("finance_wallets").update({ name: row.name, type: row.type, initial_balance: row.initial_balance, account_number: row.account_number, wallet_kind: row.wallet_kind }).eq("id", id).eq("property_id", row.property_id) : client.from("finance_wallets").insert(row);
      const { data, error } = await query.select().single();
      if (error) throw error;
      row = data as FinanceWallet;
    }
    KostStorage.saveWallets([row, ...KostStorage.getWallets().filter(w => w.id !== row.id)]);
    return row;
  },
  async load(propertyId: string) {
    const local = await financeIsLocal();
    if (local) return { local };
    const client = createClient();
    const results = await Promise.all([
      client.from("expenses").select("*").eq("property_id", propertyId).order("date", { ascending: false }),
      client.from("finance_budgets").select("*").eq("property_id", propertyId),
      client.from("room_investments").select("*").eq("property_id", propertyId),
      client.from("cash_transactions").select("*").eq("property_id", propertyId),
      client.from("finance_wallets").select("*").eq("property_id", propertyId),
      client.from("invoices").select("*, payments(*)").eq("property_id", propertyId),
      client.from("leases").select("*").eq("property_id", propertyId),
      client.from("rooms").select("*, room_types(name, base_price, facilities), leases(*, tenants(id, full_name, phone_number))").eq("property_id", propertyId),
      client.from("room_types").select("*").eq("property_id", propertyId),
      client.from("properties").select("*").eq("id", propertyId),
      client.from("tenants").select("*").eq("property_id", propertyId),
      client.from("electricity_transactions").select("*").eq("property_id", propertyId),
    ]);
    for (const result of results) if (result.error) throw result.error;
    const rooms: Room[] = (results[7].data || []).map((row) => {
      const lease = row.leases?.find((l: { status: string }) => l.status === "active");
      return { ...row, room_type: row.room_types?.name || row.room_type || "Standard", base_price: Number(row.room_types?.base_price ?? row.base_price), facilities: row.room_types?.facilities || row.facilities || [], tenant_id: lease?.tenant_id, current_tenant: lease?.tenants ? { ...lease.tenants, lease_id: lease.id, start_date: lease.start_date, end_date: lease.end_date } : undefined };
    });
    // Empty remote tables are authoritative too. Replace only this property's cache.
    KostStorage.saveExpenses([...KostStorage.getExpenses().filter(r => r.property_id !== propertyId), ...(results[0].data || []) as Expense[]]);
    KostStorage.saveFinanceBudgets([...KostStorage.getFinanceBudgets().filter(r => r.property_id !== propertyId), ...(results[1].data || []) as FinanceBudget[]]);
    KostStorage.saveRoomInvestments([...KostStorage.getRoomInvestments().filter(r => r.property_id !== propertyId), ...(results[2].data || []) as RoomInvestment[]]);
    KostStorage.saveFinanceSource({ propertyId, properties: (results[9].data || []) as Property[], rooms, roomTypes: (results[8].data || []) as RoomType[], transactions: (results[3].data || []) as CashTransaction[], wallets: (results[4].data || []) as FinanceWallet[], invoices: (results[5].data || []) as Invoice[], leases: (results[6].data || []) as Lease[], tenants: (results[10].data || []) as Tenant[], electricity: (results[11].data || []) as ElectricityTransaction[] });
    return { local };
  },
  async saveExpense(input: ExpenseInput, id?: string) {
    validateTransaction(input);
    let row: Expense = { ...input, id: id || generateUUID(), created_at: new Date().toISOString() };
    if (!await financeIsLocal()) {
      const client = createClient();
      const query = id
        ? client.from("expenses").update(input).eq("id", id).eq("property_id", input.property_id)
        : client.from("expenses").insert(row);
      const { data, error } = await query.select().single();
      if (error) throw error;
      row = data as Expense;
    } else if (id) {
      const existing = KostStorage.getExpenses().find(r => r.id === id);
      if (!existing || existing.property_id !== input.property_id) throw new Error("Expense tidak ditemukan.");
      row.created_at = existing.created_at;
    }
    KostStorage.saveExpenses([row, ...KostStorage.getExpenses().filter(r => r.id !== row.id)]);
    return row;
  },
  async deleteExpense(row: Expense) {
    if (!await financeIsLocal()) {
      const { data, error } = await createClient().from("expenses").delete().eq("id", row.id).eq("property_id", row.property_id).select("id").single();
      if (error || !data) throw error || new Error("Expense tidak dapat dihapus.");
    }
    KostStorage.saveExpenses(KostStorage.getExpenses().filter(r => r.id !== row.id));
  },
  async saveBudget(input: Omit<FinanceBudget, "id">) {
    const existing = KostStorage.getFinanceBudgets().find(r => r.property_id === input.property_id && r.month === input.month && r.category === input.category);
    let row: FinanceBudget = { ...input, id: existing?.id || generateUUID() };
    if (!await financeIsLocal()) {
      const { data, error } = await createClient().from("finance_budgets").upsert(row, { onConflict: "property_id,month,category" }).select().single();
      if (error) throw error;
      row = data as FinanceBudget;
    }
    KostStorage.saveFinanceBudgets([row, ...KostStorage.getFinanceBudgets().filter(r => !(r.property_id === row.property_id && r.month === row.month && r.category === row.category))]);
  },
  async saveInvestment(row: RoomInvestment) {
    if (!await financeIsLocal()) {
      const { error } = await createClient().from("room_investments").upsert(row, { onConflict: "room_id" }).select().single();
      if (error) throw error;
    }
    KostStorage.saveRoomInvestments([row, ...KostStorage.getRoomInvestments().filter(r => r.room_id !== row.room_id)]);
  },
};
