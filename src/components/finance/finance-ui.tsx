"use client";

import type { ReactNode } from "react";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { localDate, monthRange, type DateRange } from "@/lib/finance";
import { formatRupiah } from "@/lib/utils";

export const inputClass = "min-h-11 w-full min-w-0 rounded-xl border border-white/10 bg-[#202224] px-3 py-2.5 text-base sm:text-sm text-white outline-none focus:border-[#D9FF43] focus:ring-1 focus:ring-[#D9FF43] [color-scheme:dark]";
export const secondaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-neutral-200 transition hover:bg-white/10 disabled:opacity-40";
export const primaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#D9FF43] px-4 py-2.5 text-xs font-bold text-[#141610] transition hover:bg-[#e5ff85] disabled:opacity-40";
export const chartTooltip = { backgroundColor: "var(--finance-chart-surface)", border: "1px solid var(--finance-border)", borderRadius: 12, color: "var(--finance-fg)", fontSize: 12 };
export const chartMoney = (value: number) => value === 0 ? "0" : Math.abs(value) >= 1000000 ? `${(value / 1000000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt` : `${(value / 1000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} rb`;
export const moneyTooltip = (value: number) => formatRupiah(value);
export const percent = (value: number | null) => value === null ? "—" : `${value.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;

export function Panel({ title, description, action, children, className = "" }: { title?: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`min-w-0 rounded-2xl border border-white/[0.07] bg-[#17191b] p-4 sm:p-6 ${className}`}>
    {(title || action) && <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-white">{title}</h3>{description && <p className="mt-1 text-xs leading-relaxed text-neutral-400">{description}</p>}</div>{action}</div>}
    {children}
  </section>;
}
export function Empty({ text = "Belum ada data pada periode ini." }: { text?: string }) {
  return <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-white/10 px-5 py-8 text-center text-sm text-neutral-500">{text}</div>;
}
export function Kpi({ label, value, note, lime = false, icon }: { label: string; value: string; note: string; lime?: boolean; icon?: ReactNode }) {
  return <div className={`min-w-0 rounded-2xl border p-4 sm:p-5 ${lime ? "border-[#D9FF43] bg-[#D9FF43] text-[#161910]" : "border-white/[0.07] bg-[#17191b] text-white"}`}>
    <div className={`flex items-center justify-between gap-2 text-xs font-medium ${lime ? "text-[#424a27]" : "text-neutral-400"}`}><span>{label}</span>{icon || <ArrowUpRight size={15} />}</div>
    <p className="mt-3 break-words text-xl font-semibold tracking-tight tabular-nums sm:mt-4 sm:text-2xl xl:text-[27px]">{value}</p>
    <p className={`mt-3 text-[11px] leading-relaxed ${lime ? "text-[#424a27]" : "text-neutral-500"}`}>{note}</p>
  </div>;
}
export function MonthPicker({ month, onChange }: { month: string; onChange: (value: string) => void }) {
  return <label className="inline-flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-[#17191b] px-3 py-2 text-neutral-400 sm:flex-none"><CalendarDays size={15} className="shrink-0" /><span className="sr-only">Bulan laporan</span><input type="month" value={month} onChange={e => e.target.value && onChange(e.target.value)} className="min-w-0 w-full bg-transparent text-base sm:text-xs text-white outline-none [color-scheme:dark]" /></label>;
}
export function RangePicker({ month, mode, range, onMode, onRange }: { month: string; mode: string; range: DateRange; onMode: (value: string) => void; onRange: (value: DateRange) => void }) {
  return <div className="flex flex-wrap items-center gap-2">
    <select aria-label="Jenis periode" value={mode} onChange={e => { onMode(e.target.value); if (e.target.value === "month") onRange(monthRange(month)); if (e.target.value === "ytd") onRange({ start: `${month.slice(0, 4)}-01-01`, end: monthRange(month).end > localDate() && month.slice(0, 4) === localDate().slice(0, 4) ? localDate() : monthRange(month).end }); }} className={`${inputClass} !w-auto !text-xs`}><option value="month">Bulanan</option><option value="ytd">YTD</option><option value="custom">Rentang khusus</option></select>
    {mode === "custom" && <><input aria-label="Tanggal mulai" type="date" value={range.start} max={range.end} onChange={e => e.target.value && onRange({ ...range, start: e.target.value })} className={`${inputClass} !w-auto !text-xs`} /><span className="text-neutral-500">–</span><input aria-label="Tanggal selesai" type="date" value={range.end} min={range.start} onChange={e => e.target.value && onRange({ ...range, end: e.target.value })} className={`${inputClass} !w-auto !text-xs`} /></>}
  </div>;
}
