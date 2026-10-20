"use client";

import { useState } from "react";
import { Download, Search, Pencil, Trash2, ArrowRight, SlidersHorizontal } from "lucide-react";
import { financeEntries, pnl, transactionInvoice, walletCategoryLabel, type FinanceData, type FinanceEntry } from "@/lib/finance";
import { FinanceApi } from "@/lib/finance-api";
import { formatDateIndo, formatRupiah } from "@/lib/utils";
import { notify } from "@/lib/notify";
import { Panel, Empty, Kpi, inputClass, secondaryButton } from "./finance-ui";
import { WalletAccounts } from "./wallet-accounts";

export function TransactionsView({ data, month, propertyId, enabled, expenseOnly = false, canManageWallets = true, onEdit, onNavigate }: {
  data: FinanceData; month: string; propertyId: string; enabled: boolean; expenseOnly?: boolean; canManageWallets?: boolean; onEdit: (entry: FinanceEntry) => void; onNavigate: (tab: string) => void;
}) {
  const [type, setType] = useState(expenseOnly ? "expense" : ""), [category, setCategory] = useState(""), [walletCategoryFilter, setWalletCategoryFilter] = useState(""), [walletFilter, setWalletFilter] = useState(""), [search, setSearch] = useState(""), [allMonths, setAllMonths] = useState(false), [busy, setBusy] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterCount = Number(!!type && !expenseOnly) + Number(!!category) + Number(!!walletCategoryFilter) + Number(!!walletFilter) + Number(allMonths);
  const entries = financeEntries(data);
  const activeWallets = data.wallets.filter(wallet => wallet.wallet_kind !== "liability");
  const walletCategories = [...new Set(activeWallets.map(walletCategoryLabel))].sort();
  const walletForEntry = (entry: FinanceEntry) => activeWallets.find(wallet => wallet.id === entry.wallet_id) || activeWallets.find(wallet => wallet.name === entry.payment_method);
  const filtered = entries.filter(e => {
    const wallet = walletForEntry(e);
    const matchesWalletCategory = !walletCategoryFilter || walletCategoryLabel(wallet) === walletCategoryFilter;
    const matchesWallet = !walletFilter || (walletFilter === "unassigned" ? !wallet : wallet?.id === walletFilter);
    return (allMonths || e.date.startsWith(month)) && (!type || e.type === type) && (!category || e.category === category) && matchesWalletCategory && matchesWallet && `${e.title} ${e.category} ${e.notes || ""} ${wallet?.name || e.payment_method || ""} ${walletCategoryLabel(wallet)}`.toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => b.date.localeCompare(a.date));
  const totals = pnl(filtered, { start: "0000-01-01", end: "9999-12-31" });
  const categories = [...new Set(entries.filter(e => !type || e.type === type).map(e => e.category))].sort();
  const remove = async (entry: FinanceEntry) => {
    if (!enabled || busy || !await notify.confirm({ title: "Hapus transaksi?", message: `${entry.title} · ${formatRupiah(entry.amount)}. Dashboard dan laporan akan dihitung ulang.`, confirmText: "Hapus", variant: "danger" })) return;
    setBusy(true);
    try {
      if (entry.source === "expense") { const row = data.expenses.find(e => e.id === entry.id); if (row) await FinanceApi.deleteExpense(row); }
      else { const row = data.transactions.find(t => t.id === entry.id); if (row) await FinanceApi.deleteTransaction(row); }
      notify.success("Transaksi dihapus");
    } catch (e) { notify.error("Gagal menghapus", (e as { message?: string }).message); }
    finally { setBusy(false); }
  };
  const exportRows = async () => {
    try {
      const XLSX = await import("xlsx"), workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(filtered.map(e => { const wallet = walletForEntry(e); return { Tanggal: e.date, Keterangan: e.title, Jenis: e.type === "income" ? "Uang Masuk" : "Uang Keluar", Kategori: e.category, Wallet: wallet?.name || e.payment_method || "Belum dialokasikan", "Kategori Wallet": walletCategoryLabel(wallet), Kamar: data.rooms.find(r => r.id === e.room_id)?.room_number || "Bersama", Nominal: e.amount, Catatan: e.notes || "", "Dicatat oleh": e.recorded_by || "" }; })), "Transaksi");
      XLSX.writeFile(workbook, `Transaksi-${allMonths ? "semua" : month}.xlsx`);
    } catch (e) { notify.error("Ekspor gagal", (e as { message?: string }).message); }
  };
  const entryActions = (entry: FinanceEntry, mobile = false) => {
    const autoInvoice = entry.source === "cash" && entry.type === "income" ? transactionInvoice(entry, data) : undefined;
    const linkedInvoice = entry.source === "payment" || !!autoInvoice;
    return linkedInvoice ? <button onClick={() => onNavigate("billing")} className={secondaryButton}>Buka Tagihan <ArrowRight size={14} /></button> : <div className="flex justify-end gap-2">
      <button aria-label={`Edit ${entry.title}`} disabled={!enabled || busy} onClick={() => onEdit(entry)} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-3 text-xs text-neutral-400 hover:bg-white/10 hover:text-[#D9FF43] disabled:opacity-40"><Pencil size={14} />{mobile && "Edit"}</button>
      <button aria-label={`Hapus ${entry.title}`} disabled={!enabled || busy} onClick={() => remove(entry)} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-3 text-xs text-neutral-400 hover:bg-red-400/10 hover:text-red-300 disabled:opacity-40"><Trash2 size={14} />{mobile && "Hapus"}</button>
    </div>;
  };
  return <div className="space-y-5">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><Kpi label="Uang Masuk" value={formatRupiah(totals.revenue)} note="Sesuai filter transaksi" lime /><Kpi label="Uang Keluar" value={formatRupiah(totals.costs)} note="Biaya yang sudah dibayarkan" /><Kpi label="Selisih / Laba Bersih" value={formatRupiah(totals.profit)} note="Uang masuk dikurangi uang keluar" /></div>
    {canManageWallets && <WalletAccounts data={data} propertyId={propertyId} enabled={enabled} />}
    <Panel title="Daftar Transaksi" description={`${filtered.length} transaksi · pencatatan dan laporan menggunakan data yang sama`} action={<button disabled={!filtered.length} onClick={exportRows} className={secondaryButton}><Download size={14} />XLSX</button>}>
      <div className="mb-5 space-y-3">
        <div className="flex min-w-0 gap-2"><label className="relative min-w-0 flex-1"><Search size={15} className="absolute left-3 top-3.5 text-neutral-500" /><input aria-label="Cari transaksi" placeholder="Cari transaksi..." value={search} onChange={e => setSearch(e.target.value)} className={`${inputClass} !pl-9`} /></label><button aria-expanded={filtersOpen} aria-controls="transaction-filters" onClick={() => setFiltersOpen(!filtersOpen)} className={`${secondaryButton} !px-3 sm:hidden`}><SlidersHorizontal size={16} />Filter{filterCount > 0 && <span className="rounded-full bg-[#D9FF43] px-1.5 text-[#161910]">{filterCount}</span>}</button></div>
        <div id="transaction-filters" className={`${filtersOpen ? "grid" : "hidden"} gap-3 rounded-xl bg-white/[0.03] p-3 sm:flex sm:flex-wrap sm:bg-transparent sm:p-0`}>
          <select aria-label="Filter jenis transaksi" disabled={expenseOnly} value={type} onChange={e => { setType(e.target.value); setCategory(""); }} className={`${inputClass} sm:!w-40`}><option value="">Semua transaksi</option><option value="income">Uang Masuk</option><option value="expense">Uang Keluar</option></select>
          <select aria-label="Filter kategori transaksi" value={category} onChange={e => setCategory(e.target.value)} className={`${inputClass} sm:!w-44`}><option value="">Semua kategori transaksi</option>{categories.map(c => <option key={c}>{c}</option>)}</select>
          <select aria-label="Filter kategori wallet" value={walletCategoryFilter} onChange={e => setWalletCategoryFilter(e.target.value)} className={`${inputClass} sm:!w-40`}><option value="">Semua kategori wallet</option>{walletCategories.map(c => <option key={c}>{c}</option>)}</select>
          <select aria-label="Filter wallet atau rekening" value={walletFilter} onChange={e => setWalletFilter(e.target.value)} className={`${inputClass} sm:!w-48`}><option value="">Semua wallet</option>{activeWallets.map(wallet => <option key={wallet.id} value={wallet.id}>{walletCategoryLabel(wallet)} · {wallet.name}</option>)}<option value="unassigned">Belum dialokasikan</option></select>
          <label className="flex min-h-11 items-center gap-3 text-xs text-neutral-400"><input type="checkbox" checked={allMonths} onChange={e => setAllMonths(e.target.checked)} className="h-5 w-5 accent-[#D9FF43]" />Semua bulan</label>
          {filterCount > 0 && <button onClick={() => { setType(expenseOnly ? "expense" : ""); setCategory(""); setWalletCategoryFilter(""); setWalletFilter(""); setAllMonths(false); }} className={secondaryButton}>Reset filter</button>}
        </div>
      </div>
      {!filtered.length ? <Empty text="Belum ada transaksi sesuai filter. Gunakan Catat Transaksi untuk mencatat uang masuk atau keluar." /> : <>
        <div className="space-y-3 sm:hidden">{filtered.map(e => {
          const wallet = walletForEntry(e);
          const autoInvoice = e.source === "payment" || (e.source === "cash" && e.type === "income" && !!transactionInvoice(e, data));
          return <article key={`${e.source}-${e.id}`} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className={`rounded-md px-2 py-1 text-[11px] font-semibold ${e.type === "income" ? "bg-[#D9FF43]/10 text-[#D9FF43]" : "bg-orange-300/10 text-orange-200"}`}>{e.type === "income" ? "Uang Masuk" : "Uang Keluar"}</span><time className="text-xs text-neutral-400">{formatDateIndo(e.date)}</time></div>
            <h4 className="mt-3 break-words text-sm font-semibold text-white">{e.title}</h4>
            <p className="mt-2 break-words text-xl font-semibold tabular-nums text-white">{formatRupiah(e.amount)}</p>
            <dl className="mt-3 space-y-2 border-t border-white/[0.07] pt-3 text-xs"><div className="flex gap-3"><dt className="w-16 shrink-0 text-neutral-500">Kategori</dt><dd className="min-w-0 break-words text-neutral-300">{e.category}</dd></div><div className="flex gap-3"><dt className="w-16 shrink-0 text-neutral-500">Wallet</dt><dd className="min-w-0 break-words text-neutral-300">{wallet?.name || e.payment_method || "Belum dialokasikan"}<span className="mt-0.5 block text-[11px] text-neutral-500">{walletCategoryLabel(wallet)}</span></dd></div><div className="flex gap-3"><dt className="w-16 shrink-0 text-neutral-500">Kamar</dt><dd className="text-neutral-300">{data.rooms.find(r => r.id === e.room_id)?.room_number || "Bersama"}</dd></div></dl>
            {autoInvoice && <p className="mt-3 text-[11px] text-neutral-500">Penerimaan invoice · riwayat pembayaran</p>}
            <div className="mt-3 flex justify-end border-t border-white/[0.07] pt-2">{entryActions(e, true)}</div>
          </article>;
        })}</div>
        <div className="hidden overflow-x-auto sm:block"><table className="finance-table"><thead><tr><th>Tanggal</th><th>Transaksi / Kategori</th><th>Rekening</th><th>Kamar</th><th>Jenis</th><th className="!text-right">Nominal</th><th className="!text-right">Aksi</th></tr></thead><tbody>{filtered.map(e => {
        const autoInvoice = e.source === "payment" || (e.source === "cash" && e.type === "income" && !!transactionInvoice(e, data));
        const wallet = walletForEntry(e);
        return <tr key={`${e.source}-${e.id}`}><td className="whitespace-nowrap">{formatDateIndo(e.date)}</td><td className="min-w-48"><span className="font-medium text-white">{e.title}</span><p className="mt-1 text-[11px] text-neutral-500">{e.category}{autoInvoice ? " · Dari invoice" : ""}</p></td><td className="whitespace-nowrap"><span>{wallet?.name || e.payment_method || "Belum dialokasikan"}</span><p className="mt-1 text-[10px] text-neutral-500">{walletCategoryLabel(wallet)}</p></td><td>{data.rooms.find(r => r.id === e.room_id)?.room_number || "Bersama"}</td><td><span className={`whitespace-nowrap rounded-md px-2 py-1 text-[11px] ${e.type === "income" ? "bg-[#D9FF43]/10 text-[#D9FF43]" : "bg-orange-300/10 text-orange-200"}`}>{e.type === "income" ? "Uang Masuk" : "Uang Keluar"}</span></td><td className="!text-right whitespace-nowrap font-medium tabular-nums text-white">{formatRupiah(e.amount)}</td><td>{entryActions(e)}</td></tr>;
      })}</tbody></table></div></>}
      <p className="mt-4 text-[11px] leading-relaxed text-neutral-500">Catat setiap transaksi sekali. Data kas dan pengeluaran lama tampil di sini, lalu langsung diperhitungkan di dashboard owner, laba-rugi, budget, dan laporan.</p>
    </Panel>
  </div>;
}
