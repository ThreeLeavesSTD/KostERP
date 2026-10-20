"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, RefreshCw, ArrowUpRight, CircleAlert, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { FinancePropertyPicker, useFinanceWorkspace } from "@/lib/finance-workspace-context";
import { hasPermission } from "@/lib/permissions";
import { FINANCE_PAGES, type FinanceWorkspacePage } from "@/types/finance";
import { financeEntries, localDate, monthRange, type DateRange, type FinanceEntry } from "@/lib/finance";
import { useFinanceData } from "./use-finance-data";
import { MonthPicker, RangePicker, inputClass, secondaryButton, primaryButton } from "./finance-ui";
import { FinanceDashboard } from "./finance-dashboard";
import { TransactionsView } from "./transactions-view";
import { TransactionForm } from "./transaction-form";
import { PnlView } from "./pnl-view";
import { UnitEconomicsView } from "./unit-economics-view";
import { BudgetView } from "./budget-view";
import { ReportsView } from "./reports-view";

const pageTitles: Record<FinanceWorkspacePage, { title: string; description: string }> = {
  finance: { title: "Keuangan", description: "Pencatatan, saldo kas, dan laporan dalam satu tempat." },
  cashflow: { title: "Transaksi Keuangan", description: "Satu daftar untuk uang masuk dan uang keluar. Langsung terhubung ke dashboard owner." },
  expenses: { title: "Transaksi Pengeluaran", description: "Uang keluar dari pencatatan keuangan yang sama." },
  pnl: { title: "Laporan Laba-Rugi", description: "Pendapatan, beban, dan profit dalam format yang jelas." },
  "unit-ekonomi": { title: "Ekonomi per Kamar", description: "Lihat kontribusi tiap kamar terhadap profit properti." },
  budget: { title: "Proyeksi & Budgeting", description: "Rencanakan biaya dan simulasikan tiga bulan ke depan." },
  reports: { title: "Finance Reports", description: "Ringkasan keuangan yang siap dianalisis dan dibagikan." },
};
export function FinanceWorkspace({ page, onNavigate }: { page: FinanceWorkspacePage; onNavigate: (tab: string) => void }) {
  const { profile, role } = useAuth();
  const { activeProperty: property, activePropertyId: propertyId } = useFinanceWorkspace();
  const { data, loading, local, error, refresh } = useFinanceData(propertyId);
  const [month, setMonth] = useState(() => localDate().slice(0, 7));
  const [mode, setMode] = useState("month");
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceEntry | undefined>();
  const [range, setRange] = useState<DateRange>(() => monthRange(localDate().slice(0, 7)));
  useEffect(() => { if (mode !== "custom") setRange(mode === "ytd" ? { start: `${month.slice(0, 4)}-01-01`, end: monthRange(month).end > localDate() && month.slice(0, 4) === localDate().slice(0, 4) ? localDate() : monthRange(month).end } : monthRange(month)); }, [month, mode]);
  const entries = useMemo(() => financeEntries(data), [data]);
  const unitRange = { start: `${month.slice(0, 4)}-01-01`, end: monthRange(month).end > localDate() && month.slice(0, 4) === localDate().slice(0, 4) ? localDate() : monthRange(month).end };
  const enabled = !loading && !error && local !== null && !!propertyId;
  const canRecordIncome = hasPermission(profile?.role || role, "cashflow", profile?.permissions);
  const canRecordExpense = canRecordIncome || hasPermission(profile?.role || role, "expenses", profile?.permissions);
  const tabs = FINANCE_PAGES.filter(p => hasPermission(profile?.role || role, p.id, profile?.permissions));
  const transactionTab = canRecordIncome ? "cashflow" : "expenses";
  const navigation = [...tabs, ...(!canRecordIncome && canRecordExpense ? [{ id: "expenses", label: "Transaksi" }] : []), ...(hasPermission(profile?.role || role, "owner-audit", profile?.permissions) ? [{ id: "owner-audit", label: "Audit" }] : [])];
  const activePage = page === "expenses" && canRecordIncome ? transactionTab : page;
  const showRange = page === "pnl" || page === "reports";
  return <div className="finance-workspace space-y-6 text-white">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0"><div className="mb-3 flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] text-[#D9FF43]"><Activity size={13} />KOST / FINANCE</div><h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{pageTitles[page].title}</h2><p className="mt-2 text-xs text-neutral-400 sm:text-sm">{pageTitles[page].description}</p></div>
      <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto"><FinancePropertyPicker className="w-full sm:w-auto" /><MonthPicker month={month} onChange={setMonth} /><button aria-label="Segarkan data finance" onClick={() => refresh()} disabled={loading} className={`${secondaryButton} !px-3`}><RefreshCw size={14} className={loading ? "animate-spin" : ""} /></button>{canRecordExpense && <button disabled={!enabled} onClick={() => { setEditing(undefined); setTransactionOpen(true); }} className={`${primaryButton} w-full sm:w-auto`}><Plus size={16} />Catat Transaksi</button>}</div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] pb-3">
      <label className="w-full text-xs text-neutral-400 sm:hidden">Menu keuangan<select aria-label="Menu keuangan" value={activePage} onChange={e => onNavigate(e.target.value)} className={`${inputClass} mt-1.5`}>{navigation.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
      <nav aria-label="Halaman finance" className="hidden max-w-full gap-1 overflow-x-auto pb-1 hide-scrollbar sm:flex">{navigation.map(p => <button key={p.id} onClick={() => onNavigate(p.id)} className={`whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-medium transition ${activePage === p.id ? "bg-[#D9FF43] text-[#161910]" : "text-neutral-400 hover:bg-white/5 hover:text-white"}`}>{p.label}</button>)}</nav>
      <span className="flex items-center gap-1.5 text-[10px] text-neutral-500"><span className={`h-1.5 w-1.5 rounded-full ${error ? "bg-orange-300" : "bg-[#D9FF43]"}`} />{loading ? "Memuat data..." : error ? "Sinkronisasi gagal" : local ? "Mode lokal · tersimpan di browser" : "Terhubung ke Supabase"}</span>
    </div>
    {error && <div role="alert" className="flex items-start gap-3 rounded-xl border border-orange-300/20 bg-orange-300/5 p-4 text-xs text-orange-200"><CircleAlert size={16} className="shrink-0" /><div><p>Data cache ditampilkan. Penulisan dinonaktifkan sampai sinkronisasi berhasil.</p><p className="mt-1 text-orange-200/60">{error}</p></div><button onClick={() => refresh()} className="ml-auto shrink-0 underline">Coba lagi</button></div>}
    {showRange && <RangePicker month={month} mode={mode} range={range} onMode={setMode} onRange={setRange} />}
    {page === "finance" && <FinanceDashboard data={data} entries={entries} month={month} onNavigate={onNavigate} />}
    {(page === "cashflow" || page === "expenses") && <TransactionsView key={page} data={data} month={month} propertyId={propertyId} enabled={enabled && canRecordExpense} expenseOnly={page === "expenses" || !canRecordIncome} canManageWallets={canRecordIncome} onEdit={entry => { setEditing(entry); setTransactionOpen(true); }} onNavigate={onNavigate} />}
    {page === "pnl" && <PnlView entries={entries} range={range} propertyName={property?.name || "Properti Kost"} />}
    {page === "unit-ekonomi" && <UnitEconomicsView data={data} entries={entries} range={unitRange} propertyId={propertyId} enabled={enabled} />}
    {page === "budget" && <BudgetView data={data} entries={entries} month={month} propertyId={propertyId} enabled={enabled} />}
    {page === "reports" && <ReportsView data={data} entries={entries} range={range} propertyName={property?.name || "Properti Kost"} />}
    {transactionOpen && <TransactionForm key={editing ? `${editing.source}-${editing.id}` : "new"} data={data} propertyId={propertyId} recordedBy={profile?.full_name || "Admin"} entry={editing} enabled={enabled && canRecordExpense} allowIncome={canRecordIncome} initialType={page === "expenses" ? "expense" : "income"} onClose={() => setTransactionOpen(false)} onNavigate={onNavigate} />}
    <div className="flex items-center justify-between border-t border-white/[0.07] pt-4 text-[10px] text-neutral-600"><span>{property?.name || "Properti Kost"} · Finance System</span><span className="flex items-center gap-1">IDR <ArrowUpRight size={11} /></span></div>
  </div>;
}
