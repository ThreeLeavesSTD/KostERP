"use client";

import { pnl, type DateRange, type FinanceEntry } from "@/lib/finance";
import { formatRupiah, formatDateIndo } from "@/lib/utils";
import { Panel, Kpi, percent } from "./finance-ui";

export function PnlView({ entries, range, propertyName }: { entries: FinanceEntry[]; range: DateRange; propertyName: string }) {
  const p = pnl(entries, range);
  const row = (label: string, amount: number, kind: "detail" | "total" | "profit" = "detail") => <tr key={label} className={kind === "profit" ? "!bg-[#D9FF43]/10" : ""}><td className={kind === "detail" ? "!pl-7 text-neutral-400" : "font-semibold text-white"}>{label}</td><td className={`!text-right tabular-nums ${kind === "profit" ? "font-bold text-[#D9FF43]" : kind === "total" ? "font-semibold text-white" : "text-neutral-300"}`}>{amount < 0 ? `(${formatRupiah(Math.abs(amount))})` : formatRupiah(amount || 0)}</td></tr>;
  const heading = (label: string) => <tr><td colSpan={2} className="!pt-7 text-[10px] font-bold tracking-[0.15em] text-neutral-500">{label}</td></tr>;
  return <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-3"><Kpi label="Pendapatan" value={formatRupiah(p.revenue)} note="Seluruh penerimaan kas periode ini" /><Kpi label="Laba Bersih" value={formatRupiah(p.profit)} note="Pendapatan dikurangi seluruh beban" lime /><Kpi label="Net Profit Margin" value={percent(p.margin)} note="Laba bersih ÷ pendapatan × 100%" /></div>
    <Panel title="Laporan Laba-Rugi" description={`${propertyName} · ${formatDateIndo(range.start)} – ${formatDateIndo(range.end)}`}>
      <div className="overflow-x-auto"><table className="finance-table"><thead><tr><th>Keterangan</th><th className="!text-right">Rupiah (IDR)</th></tr></thead><tbody>
        {heading("PENDAPATAN")}{row("Pendapatan Sewa Kamar", p.rent)}{row("Pendapatan Lainnya", p.otherIncome)}{row("Total Pendapatan", p.revenue, "total")}
        {heading("BEBAN OPERASIONAL")}{p.expenseGroups.length ? p.expenseGroups.map(g => row(g.name, -g.value)) : row("Beban Operasional", 0)}{row("Total Beban Operasional", -p.operating, "total")}{row("Laba Operasional", p.revenue - p.operating, "total")}
        {heading("BEBAN LAINNYA")}{row("Beban Bunga", -p.interest)}{row("Laba Sebelum Pajak", p.revenue - p.operating - p.interest, "total")}{row("Beban Pajak", -p.tax)}{row("LABA BERSIH", p.profit, "profit")}
      </tbody></table></div>
      <p className="mt-5 max-w-3xl text-[11px] leading-relaxed text-neutral-500">Format laporan manajemen basis kas. Pendapatan berasal dari kas operasional; biaya mencakup kas operasional dan expense tracker. Tagihan belum dibayar, penyusutan, dan transaksi nonkas tidak termasuk. Angka dalam kurung menunjukkan pengurang atau rugi.</p>
    </Panel>
  </div>;
}
