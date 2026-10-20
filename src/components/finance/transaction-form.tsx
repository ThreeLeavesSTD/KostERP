"use client";

import { useState, type FormEvent } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { FinanceApi } from "@/lib/finance-api";
import { localDate, walletCategoryLabel, type FinanceData, type FinanceEntry } from "@/lib/finance";
import { formatRupiahInput, parseRupiahInput } from "@/lib/utils";
import { EXPENSE_CATEGORIES } from "@/types/finance";
import { notify } from "@/lib/notify";
import { inputClass, primaryButton, secondaryButton } from "./finance-ui";

const INCOME_CATEGORIES = ["Pendapatan Lainnya", "Sewa Kamar", "Penjualan Token Listrik", "Layanan Tambahan"];
export function TransactionForm({ data, propertyId, recordedBy, entry, initialType = "income", allowIncome = true, enabled, onClose, onNavigate }: {
  data: FinanceData; propertyId: string; recordedBy: string; entry?: FinanceEntry; initialType?: "income" | "expense";
  allowIncome?: boolean; enabled: boolean; onClose: () => void; onNavigate: (tab: string) => void;
}) {
  const originalCash = entry?.source === "cash" ? data.transactions.find(t => t.id === entry.id) : undefined;
  const originalExpense = entry?.source === "expense" ? data.expenses.find(e => e.id === entry.id) : undefined;
  const wallets = data.wallets.filter(w => w.wallet_kind !== "liability");
  const matching = wallets.filter(w => w.name === entry?.payment_method);
  const [type, setType] = useState(entry?.type || (allowIncome ? initialType : "expense"));
  const [title, setTitle] = useState(entry?.title || "");
  const [amount, setAmount] = useState(entry?.amount || 0);
  const [date, setDate] = useState(entry?.date.slice(0, 10) || localDate());
  const [category, setCategory] = useState(entry?.category || (allowIncome && initialType === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]));
  const [walletId, setWalletId] = useState(entry?.wallet_id || (matching.length === 1 ? matching[0].id : "") || (!entry ? wallets.find(w => w.is_default)?.id || wallets[0]?.id || "" : ""));
  const [roomId, setRoomId] = useState(entry?.room_id || "");
  const [notes, setNotes] = useState(entry?.notes || "");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const categories = [...new Set([...(type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES), ...data.transactions.filter(t => t.type === type).map(t => t.category_name || t.category), category])];
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!enabled || busy) return;
    if (!title.trim() || !Number.isFinite(amount) || amount <= 0 || !date || date > localDate() || !category || (!walletId && !originalExpense)) { setError("Isi nama, nominal positif, tanggal, kategori, dan rekening kas."); return; }
    setBusy(true); setError("");
    try {
      const wallet = wallets.find(w => w.id === walletId);
      if (originalExpense) {
        await FinanceApi.saveExpense({ property_id: propertyId, title, amount, category, date, room_id: roomId || null,
          wallet_id: walletId || null, payment_method: wallet?.name || originalExpense.payment_method, notes: notes.trim() || null, recorded_by: originalExpense.recorded_by }, originalExpense.id);
      } else {
        await FinanceApi.saveTransaction({ property_id: propertyId, type, title, amount, category, date, room_id: roomId || null,
          wallet_id: walletId, payment_method: wallet?.name || "", notes, recorded_by: recordedBy }, originalCash?.id);
      }
      notify.success(entry ? "Transaksi diperbarui" : "Transaksi tersimpan", "Dashboard owner dan laporan mengikuti pencatatan ini.");
      onClose();
    } catch (e) { setError((e as { message?: string }).message || "Transaksi gagal disimpan."); }
    finally { setBusy(false); }
  };
  return <Modal isOpen onClose={() => !busy && onClose()} title={entry ? "Edit Transaksi" : "Catat Transaksi"} description="Catat uang yang sudah diterima atau dibayarkan.">
    <form onSubmit={save} className="space-y-4 text-white">
      <fieldset disabled={busy} className="space-y-4">
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Jenis transaksi">{(["income", "expense"] as const).map(value => <button key={value} type="button" aria-pressed={type === value} disabled={!!originalExpense || (value === "income" && !allowIncome)} onClick={() => { setType(value); setCategory(value === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]); }} className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-2 py-3 text-xs font-semibold disabled:opacity-50 sm:text-sm ${type === value ? "border-[#D9FF43] bg-[#D9FF43]/10 text-[#D9FF43]" : "border-white/10 text-neutral-400"}`}>{value === "income" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}{value === "income" ? "Uang Masuk" : "Uang Keluar"}</button>)}</div>
        <p className="text-xs leading-relaxed text-neutral-400">{type === "income" ? "Pendapatan yang sudah masuk ke rekening atau kas, seperti layanan tambahan dan penerimaan lainnya." : "Biaya yang sudah dibayar, seperti WiFi, listrik, gaji, dan perawatan."}</p>
        {type === "income" && <div className="rounded-xl border border-[#D9FF43]/15 bg-[#D9FF43]/5 p-3 text-xs leading-relaxed text-neutral-300">Sudah ada invoice sewa? Verifikasi pembayarannya di <button type="button" className="font-semibold text-[#D9FF43] underline" onClick={() => { onClose(); onNavigate("billing"); }}>Tagihan</button>; uang masuk akan tercatat otomatis. Saldo awal, deposit titipan, pinjaman, dan transfer antar rekening bukan pendapatan.</div>}
        <label className="block text-xs text-neutral-400">Keterangan transaksi<input autoFocus required maxLength={160} placeholder={type === "income" ? "Contoh: Pembayaran laundry penghuni" : "Contoh: Tagihan WiFi Oktober"} value={title} onChange={e => setTitle(e.target.value)} className={`${inputClass} mt-1.5`} /></label>
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-neutral-400">Nominal (Rp)<input required type="text" inputMode="numeric" placeholder="0" value={formatRupiahInput(amount)} onChange={e => setAmount(parseRupiahInput(e.target.value))} className={`${inputClass} mt-1.5`} /><span className="mt-1 block text-[10px] text-neutral-500">Pemisah ribuan otomatis · contoh 1.000.000</span></label><label className="text-xs text-neutral-400">Tanggal transaksi<input required type="date" max={localDate()} value={date} onChange={e => setDate(e.target.value)} className={`${inputClass} mt-1.5`} /></label></div>
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-neutral-400">{type === "income" ? "Saldo masuk ke wallet / rekening" : "Saldo keluar dari wallet / rekening"}<select required={!originalExpense} value={walletId} onChange={e => setWalletId(e.target.value)} className={`${inputClass} mt-1.5`}><option value="">{originalExpense ? `Data lama: ${originalExpense.payment_method}` : "Pilih wallet / rekening"}</option>{wallets.map(w => <option key={w.id} value={w.id}>{walletCategoryLabel(w)} · {w.name}</option>)}</select></label><label className="text-xs text-neutral-400">Kategori transaksi<select value={category} onChange={e => setCategory(e.target.value)} className={`${inputClass} mt-1.5`}>{categories.map(c => <option key={c}>{c}</option>)}</select></label></div>
        {!wallets.length && <p className="text-xs text-orange-200">Tambahkan rekening melalui bagian Rekening & Kas di halaman Transaksi terlebih dahulu.</p>}
        <label className="block text-xs text-neutral-400">Alokasi kamar<select value={roomId} onChange={e => setRoomId(e.target.value)} className={`${inputClass} mt-1.5`}><option value="">{type === "income" ? "Pendapatan bersama" : "Biaya bersama"}</option>{data.rooms.map(r => <option key={r.id} value={r.id}>Kamar {r.room_number}</option>)}</select></label>
        <label className="block text-xs text-neutral-400">Catatan / referensi bukti (opsional)<textarea rows={2} maxLength={1000} value={notes} onChange={e => setNotes(e.target.value)} className={`${inputClass} mt-1.5`} /></label>
      </fieldset>
      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
      <div className="flex justify-end gap-2"><button type="button" disabled={busy} className={secondaryButton} onClick={onClose}>Batal</button><button type="submit" disabled={!enabled || busy || (!wallets.length && !originalExpense)} className={primaryButton}>{busy ? "Menyimpan..." : `Simpan ${type === "income" ? "Uang Masuk" : "Uang Keluar"}`}</button></div>
    </form>
  </Modal>;
}
