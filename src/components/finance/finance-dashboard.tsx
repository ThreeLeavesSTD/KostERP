"use client";

import { ArrowRight, CircleDollarSign, Wallet, TrendingUp, Receipt, DoorOpen, Target } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { financeKpis, sixMonthTrend, receivables, localDate, monthLabel, type FinanceData, type FinanceEntry } from "@/lib/finance";
import { formatRupiah } from "@/lib/utils";
import { Panel, Kpi, Empty, percent, chartMoney, chartTooltip, moneyTooltip, secondaryButton } from "./finance-ui";

const colors = ["#D9FF43", "#81b8ae", "#8d8cdf", "#f2ae70", "#777e8b", "#bca0bd"];

export function FinanceDashboard({ data, entries, month, onNavigate }: { data: FinanceData; entries: FinanceEntry[]; month: string; onNavigate: (tab: string) => void }) {
  const kpis = financeKpis(data, entries, month), trend = sixMonthTrend(entries, month), ar = receivables(data.invoices);
  const breakdown = kpis.rows.filter(e => e.type === "expense").reduce<Record<string, number>>((g, e) => { g[e.category] = (g[e.category] || 0) + e.amount; return g; }, {});
  const expenseGroups = Object.entries(breakdown).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  return <div className="space-y-5">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Kpi label="Uang Masuk" value={formatRupiah(kpis.revenue)} note={`Kas yang diterima · ${monthLabel(month)}`} lime icon={<CircleDollarSign size={16} />} />
      <Kpi label="Margin Laba Bersih" value={percent(kpis.margin)} note={`Laba kas ${formatRupiah(kpis.profit)}`} icon={<TrendingUp size={16} />} />
      <Kpi label="Uang Keluar" value={formatRupiah(kpis.costs)} note="Biaya yang benar-benar dibayar" icon={<Receipt size={16} />} />
      <Kpi label="Saldo Kas" value={formatRupiah(kpis.cash)} note="Saldo awal aset + mutasi hingga hari ini" icon={<Wallet size={16} />} />
      <Kpi label="ARPU / Kamar" value={kpis.arpu === null ? "—" : formatRupiah(kpis.arpu)} note={`${kpis.occupied} kamar dengan sewa pada periode ini`} icon={<DoorOpen size={16} />} />
      <Kpi label="BEP Estimasi" value={kpis.bep === null ? "—" : `${kpis.bep} kamar`} note="Biaya ÷ rata-rata tarif kamar" icon={<Target size={16} />} />
    </div>
    <div className="grid gap-5 lg:grid-cols-3">
      <Panel title="Uang Masuk vs Uang Keluar" description="Arus kas enam bulan terakhir" className="lg:col-span-2" action={<div className="flex flex-wrap gap-3 text-[11px] text-neutral-400"><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#D9FF43]" />Uang Masuk</span><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#81b8ae]" />Uang Keluar</span></div>}>
        <div className="h-64 w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><LineChart data={trend} margin={{ top: 10, right: 8, left: -15, bottom: 0 }}><CartesianGrid stroke="var(--finance-grid)" vertical={false} /><XAxis dataKey="name" tick={{ fill: "var(--finance-chart-muted)", fontSize: 10 }} axisLine={false} tickLine={false} tickMargin={12} /><YAxis tickFormatter={chartMoney} tick={{ fill: "var(--finance-chart-muted)", fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={chartTooltip} formatter={moneyTooltip} /><Line type="monotone" dataKey="revenue" name="Uang Masuk" stroke="var(--finance-accent-chart)" strokeWidth={3} dot={false} activeDot={{ r: 5 }} /><Line type="monotone" dataKey="expenses" name="Uang Keluar" stroke="#81b8ae" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
      </Panel>
      <Panel title="Komposisi Pengeluaran" description={monthLabel(month)}>
        {expenseGroups.length === 0 ? <Empty text="Belum ada pengeluaran pada bulan ini." /> : <><div className="relative h-44"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={expenseGroups} dataKey="value" nameKey="name" innerRadius={55} outerRadius={78} paddingAngle={3} stroke="none">{expenseGroups.map((e, i) => <Cell key={e.name} fill={colors[i % colors.length]} />)}</Pie><Tooltip formatter={moneyTooltip} contentStyle={chartTooltip} /></PieChart></ResponsiveContainer></div><div className="mt-4 space-y-2">{expenseGroups.map((e, i) => <div key={e.name} className="flex items-center justify-between gap-3 text-[11px]"><span className="flex min-w-0 items-center gap-2 text-neutral-400"><i className="h-2 w-2 shrink-0 rounded-full" style={{ background: colors[i % colors.length] }} /><span className="truncate">{e.name}</span></span><span className="tabular-nums text-neutral-200">{percent(e.value / kpis.costs * 100)}</span></div>)}</div></>}
      </Panel>
    </div>
    <div className="grid gap-5 lg:grid-cols-3">
      <Panel title="Invoice Aging" description={`Piutang ${formatRupiah(ar.total)} · per ${localDate()}`}>
        <div className="h-52"><ResponsiveContainer width="100%" height="100%"><BarChart data={ar.aging} margin={{ left: -22, right: 4, bottom: 0 }}><CartesianGrid stroke="var(--finance-grid)" vertical={false} /><XAxis dataKey="name" tick={{ fill: "var(--finance-chart-muted)", fontSize: 9 }} axisLine={false} tickLine={false} /><YAxis tickFormatter={chartMoney} tick={{ fill: "var(--finance-chart-muted)", fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip formatter={moneyTooltip} contentStyle={chartTooltip} /><Bar dataKey="value" name="Piutang" radius={[5, 5, 0, 0]}>{ar.aging.map((e, i) => <Cell key={e.name} fill={i >= 3 ? "#f2ae70" : "var(--finance-accent-chart)"} />)}</Bar></BarChart></ResponsiveContainer></div>
      </Panel>
      <Panel title="Top 5 Invoice Terlambat" description="Urut dari keterlambatan paling lama" className="lg:col-span-2" action={<button className={secondaryButton} onClick={() => onNavigate("billing")}>Tagihan <ArrowRight size={13} /></button>}>
        {ar.overdue.length === 0 ? <Empty text="Tidak ada invoice terlambat. Semua tertangani." /> : <div className="overflow-x-auto"><table className="finance-table"><thead><tr><th>Invoice / Penghuni</th><th>Kamar</th><th>Terlambat</th><th className="!text-right">Sisa Tagihan</th></tr></thead><tbody>{ar.overdue.slice(0, 5).map(inv => {
          const room = data.rooms.find(r => r.id === inv.room_id || r.id === data.leases.find(l => l.id === inv.lease_id)?.room_id);
          return <tr key={inv.id}><td><span className="text-neutral-200">{inv.invoice_number}</span><p className="mt-1 text-[11px] text-neutral-500">{inv.tenant_name || room?.current_tenant?.full_name || "—"}</p></td><td>{inv.room_number || room?.room_number || "—"}</td><td><span className="rounded-md bg-orange-400/10 px-2 py-1 text-[11px] text-orange-300">{inv.days} hari</span></td><td className="!text-right font-medium tabular-nums text-white">{formatRupiah(inv.outstanding)}</td></tr>;
        })}</tbody></table></div>}
      </Panel>
    </div>
    <p className="text-[11px] leading-relaxed text-neutral-500">Basis kas. Invoice belum dibayar tidak masuk revenue. BEP adalah estimasi cakupan biaya dengan tarif rata-rata, tanpa pemisahan biaya tetap dan variabel.</p>
  </div>;
}
