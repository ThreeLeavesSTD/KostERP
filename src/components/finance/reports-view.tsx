"use client";

import { useState } from "react";
import { FileText, FileSpreadsheet, Download, Sparkles, Check } from "lucide-react";
import { reportData, exportFinancePdf, exportFinanceXlsx } from "@/lib/finance-export";
import { type DateRange, type FinanceData, type FinanceEntry } from "@/lib/finance";
import { formatDateIndo } from "@/lib/utils";
import { notify } from "@/lib/notify";
import { Panel, primaryButton, secondaryButton } from "./finance-ui";

export function ReportsView({ data, entries, range, propertyName }: { data: FinanceData; entries: FinanceEntry[]; range: DateRange; propertyName: string }) {
  const report = reportData(data, entries, range, propertyName);
  const [busy, setBusy] = useState("");
  const download = async (format: string) => {
    setBusy(format);
    try { if (format === "PDF") await exportFinancePdf(report); else await exportFinanceXlsx(report); notify.success(`Laporan ${format} siap diunduh`); }
    catch (e) { notify.error("Ekspor gagal", (e as { message?: string }).message); }
    finally { setBusy(""); }
  };
  return <div className="space-y-5">
    <Panel title="Ringkasan Otomatis" description={`${formatDateIndo(range.start)} – ${formatDateIndo(range.end)}`} action={<Sparkles size={18} className="text-[#D9FF43]" />}><div className="space-y-4">{report.summary.map((text, i) => <div key={text} className="flex items-start gap-3"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#D9FF43]/10 text-[10px] font-semibold text-[#D9FF43]">{i + 1}</span><p className="text-sm leading-relaxed text-neutral-300">{text}</p></div>)}</div></Panel>
    <div className="grid gap-5 sm:grid-cols-2">{[{ format: "PDF", icon: FileText, description: "Laporan siap dibagikan dengan ringkasan, laba-rugi, ekonomi kamar, aging, dan detail biaya." }, { format: "XLSX", icon: FileSpreadsheet, description: "Workbook dengan angka numerik untuk analisis lanjutan: laba-rugi, transaksi, ekonomi kamar, dan piutang." }].map(item => <Panel key={item.format}><item.icon size={28} className="mb-5 text-[#D9FF43]" /><h3 className="text-lg font-semibold text-white">Finance Report {item.format}</h3><p className="mt-2 min-h-12 text-xs leading-relaxed text-neutral-400">{item.description}</p><div className="my-5 flex items-center gap-2 text-[11px] text-neutral-500"><Check size={13} />Periode dan data sesuai filter aktif</div><button disabled={!!busy} onClick={() => download(item.format)} className={`${item.format === "PDF" ? primaryButton : secondaryButton} w-full`}><Download size={14} />{busy === item.format ? "Menyiapkan..." : `Unduh ${item.format}`}</button></Panel>)}</div>
    <p className="text-[11px] leading-relaxed text-neutral-500">Ringkasan dihitung dari data yang ditampilkan. Aging mencerminkan posisi piutang saat ini; laporan pendapatan dan biaya mengikuti periode terpilih. Modal yang belum diisi menghasilkan ROI kosong.</p>
  </div>;
}
