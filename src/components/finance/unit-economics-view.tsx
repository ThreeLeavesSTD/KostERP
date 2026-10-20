"use client";

import { useState, type FormEvent } from "react";
import { Pencil, TrendingUp, TrendingDown } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { FinanceApi } from "@/lib/finance-api";
import { unitEconomics, type DateRange, type FinanceData, type FinanceEntry } from "@/lib/finance";
import { formatRupiah, formatRupiahInput, parseRupiahInput, formatDateIndo } from "@/lib/utils";
import { notify } from "@/lib/notify";
import { Panel, Empty, percent, inputClass, primaryButton, secondaryButton } from "./finance-ui";

export function UnitEconomicsView({ data, entries, range, propertyId, enabled }: { data: FinanceData; entries: FinanceEntry[]; range: DateRange; propertyId: string; enabled: boolean }) {
  const units = unitEconomics(data, entries, range);
  const [editing, setEditing] = useState<{ id: string; number: string; amount: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const best = units[0], worst = units[units.length - 1];
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (!editing) return;
    if (!Number.isFinite(editing.amount) || editing.amount < 0) { setError("Modal harus berupa nominal nol atau positif."); return; }
    setBusy(true); setError("");
    try { await FinanceApi.saveInvestment({ room_id: editing.id, property_id: propertyId, amount: editing.amount }); setEditing(null); notify.success("Modal kamar disimpan"); }
    catch (e) { setError((e as { message?: string }).message || "Modal gagal disimpan."); }
    finally { setBusy(false); }
  };
  return <div className="space-y-5">
    {best && <div className="grid gap-4 sm:grid-cols-2"><Panel title="Profit Tertinggi" action={<TrendingUp size={18} className="text-[#D9FF43]" />}><p className="text-2xl font-semibold text-[#D9FF43]">Kamar {best.room.room_number}</p><p className="mt-2 text-sm text-neutral-300">{formatRupiah(best.profit)} <span className="text-xs text-neutral-500">profit periode ini</span></p></Panel><Panel title="Profit Terendah" action={<TrendingDown size={18} className="text-orange-300" />}><p className="text-2xl font-semibold text-orange-300">Kamar {worst.room.room_number}</p><p className="mt-2 text-sm text-neutral-300">{formatRupiah(worst.profit)} <span className="text-xs text-neutral-500">profit periode ini</span></p></Panel></div>}
    <Panel title="Ekonomi per Kamar" description={`${formatDateIndo(range.start)} – ${formatDateIndo(range.end)} · urut berdasarkan profit`}>
      {!units.length ? <Empty text="Tambahkan kamar terlebih dahulu untuk melihat ekonomi unit." /> : <div className="overflow-x-auto"><table className="finance-table"><thead><tr><th>Kamar</th><th className="!text-right">Revenue YTD</th><th className="!text-right">Biaya YTD</th><th className="!text-right">Profit YTD</th><th className="!text-right">Modal</th><th className="!text-right">ROI YTD</th></tr></thead><tbody>{units.map(u => <tr key={u.room.id} className={u.room.id === best?.room.id ? "!bg-[#D9FF43]/5" : u.room.id === worst?.room.id ? "!bg-orange-300/5" : ""}><td><p className="font-semibold text-white">{u.room.room_number}</p><p className="mt-1 text-[11px] text-neutral-500">{u.room.room_type}</p></td><td className="!text-right tabular-nums text-neutral-200">{formatRupiah(u.revenue)}</td><td className="!text-right tabular-nums">{formatRupiah(u.costs)}</td><td className={`!text-right font-semibold tabular-nums ${u.profit >= 0 ? "text-[#D9FF43]" : "text-orange-300"}`}>{formatRupiah(u.profit)}</td><td className="!text-right"><button disabled={!enabled || busy} title={`Atur modal kamar ${u.room.room_number}`} onClick={() => { setError(""); setEditing({ id: u.room.id, number: u.room.room_number, amount: u.investment }); }} className="inline-flex items-center gap-2 whitespace-nowrap rounded-md p-1 text-neutral-300 hover:text-[#D9FF43] disabled:opacity-40">{u.investment > 0 ? formatRupiah(u.investment) : "Isi modal"}<Pencil size={12} /></button></td><td className="!text-right tabular-nums text-neutral-200">{percent(u.roi)}</td></tr>)}</tbody></table></div>}
      <div className="mt-5 rounded-xl bg-white/[0.03] p-4 text-[11px] leading-relaxed text-neutral-400">Pendapatan kas ditautkan melalui referensi invoice atau nomor kamar pada nama transaksi. Pendapatan dan biaya tanpa alokasi kamar dibagi rata ke seluruh kamar, termasuk kamar kosong. ROI = profit YTD ÷ modal tercatat; isi modal aktual untuk mengaktifkan ROI. ROI ini belum disetahunkan.</div>
    </Panel>
    <Modal isOpen={!!editing} onClose={() => !busy && setEditing(null)} title={`Modal Kamar ${editing?.number || ""}`} description="Total biaya investasi awal kamar, termasuk renovasi dan perabot.">
      <form onSubmit={save} className="space-y-4"><label className="block text-xs text-neutral-400">Modal (Rp)<input autoFocus required type="text" inputMode="numeric" placeholder="0" value={formatRupiahInput(editing?.amount)} onChange={e => editing && setEditing({ ...editing, amount: parseRupiahInput(e.target.value) })} className={`${inputClass} mt-2`} /><span className="mt-1 block text-[10px] text-neutral-500">Pemisah ribuan otomatis · contoh 1.000.000</span></label><p className="text-xs text-neutral-500">Modal nol menonaktifkan perhitungan ROI.</p>{error && <p role="alert" className="text-xs text-red-300">{error}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} disabled={busy} className={secondaryButton}>Batal</button><button type="submit" disabled={busy} className={primaryButton}>{busy ? "Menyimpan..." : "Simpan Modal"}</button></div></form>
    </Modal>
  </div>;
}
