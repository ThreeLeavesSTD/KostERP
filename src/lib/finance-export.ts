import { pnl, receivables, unitEconomics, type DateRange, type FinanceData, type FinanceEntry } from "./finance";
import { formatRupiah } from "./utils";

export function reportData(data: FinanceData, entries: FinanceEntry[], range: DateRange, propertyName: string) {
  const totals = pnl(entries, range), ar = receivables(data.invoices), units = unitEconomics(data, entries, range);
  const largest = [...totals.rows.filter(e => e.type === "expense")].sort((a, b) => b.amount - a.amount)[0];
  const summary = [
    `Pendapatan diterima ${formatRupiah(totals.revenue)} dan pengeluaran ${formatRupiah(totals.costs)} menghasilkan ${totals.profit >= 0 ? "laba" : "rugi"} bersih ${formatRupiah(Math.abs(totals.profit))}.`,
    totals.margin === null ? "Margin belum tersedia karena tidak ada pendapatan pada periode ini." : `Net profit margin ${totals.margin.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%.`,
    largest ? `Pengeluaran terbesar: ${largest.title} (${formatRupiah(largest.amount)}).` : "Belum ada pengeluaran tercatat pada periode ini.",
    `Piutang saat ini ${formatRupiah(ar.total)} dengan ${ar.overdue.length} invoice terlambat.`,
  ];
  return { propertyName, range, totals, ar, units, summary };
}
export type FinanceReport = ReturnType<typeof reportData>;

async function workbook(sheets: { name: string; rows: Record<string, string | number | null>[] }[], filename: string) {
  const XLSX = await import("xlsx");
  const book = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.rows);
    const headers = Object.keys(sheet.rows[0] || {});
    ws["!cols"] = headers.map(h => ({ wch: /Nama|Judul|Catatan|Ringkasan/.test(h) ? 52 : 22 }));
    if (ws["!ref"]) ws["!autofilter"] = { ref: ws["!ref"] };
    for (const key of Object.keys(ws)) if (!key.startsWith("!") && ws[key].t === "n") ws[key].z = "#,##0.00";
    XLSX.utils.book_append_sheet(book, ws, sheet.name);
  }
  XLSX.writeFile(book, filename);
}
export function exportExpenses(entries: FinanceEntry[]) {
  return workbook([{ name: "Expenses", rows: entries.map(e => ({ Tanggal: e.date, Judul: e.title, Kategori: e.category, Nominal: e.amount, Sumber: e.source === "cash" ? "Kas Operasional" : "Expense Tracker" })) }], "kost-expenses.xlsx");
}
export function exportFinanceXlsx(report: FinanceReport) {
  const p = report.totals;
  return workbook([
    { name: "Ringkasan", rows: [{ Properti: report.propertyName, Mulai: report.range.start, Selesai: report.range.end, Basis: "Kas", Ringkasan: report.summary.join(" ") }] },
    { name: "Laba Rugi", rows: [
      { Akun: "Pendapatan Sewa Kamar", Nominal: p.rent }, { Akun: "Pendapatan Lainnya", Nominal: p.otherIncome }, { Akun: "TOTAL PENDAPATAN", Nominal: p.revenue },
      ...p.expenseGroups.map(g => ({ Akun: g.name, Nominal: -g.value })),
      { Akun: "LABA OPERASIONAL", Nominal: p.revenue - p.operating }, { Akun: "Beban Bunga", Nominal: -p.interest }, { Akun: "LABA SEBELUM PAJAK", Nominal: p.revenue - p.operating - p.interest }, { Akun: "Beban Pajak", Nominal: -p.tax }, { Akun: "LABA BERSIH", Nominal: p.profit },
    ] },
    { name: "Transaksi", rows: p.rows.map(e => ({ Tanggal: e.date, Judul: e.title, Jenis: e.type, Kategori: e.category, Nominal: e.amount, Sumber: e.source })) },
    { name: "Ekonomi Kamar", rows: report.units.map(u => ({ Kamar: u.room.room_number, Pendapatan: u.revenue, Biaya: u.costs, Profit: u.profit, Modal: u.investment, "ROI (%)": u.roi, "Pendapatan Bersama": u.sharedRevenue, "Biaya Bersama": u.sharedCosts })) },
    { name: "Aging Saat Ini", rows: report.ar.aging.map(a => ({ Kelompok: a.name, Piutang: a.value })) },
    { name: "Invoice Terlambat", rows: report.ar.overdue.map(i => ({ Invoice: i.invoice_number, "Jatuh Tempo": i.due_date, "Terlambat (Hari)": i.days, "Sisa Tagihan": i.outstanding })) },
  ], `kost-finance-${report.range.start}-${report.range.end}.xlsx`);
}

// Client-side PDF, with wrapped rows and repeated headers on every new page.
export async function createFinancePdf(report: FinanceReport) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const width = 174, left = 18;
  let y = 0;
  const safe = (text: string) => text.replace(/[–—]/g, "-").replace(/\u00a0/g, " ").replace(/[^\x20-\x7e\n]/g, "");
  function page() {
    if (y) doc.addPage();
    doc.setFillColor(217, 255, 67); doc.rect(0, 0, 210, 4, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(25, 29, 21);
    doc.text("FINANCE REPORT", left, 19);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(90);
    const title = doc.splitTextToSize(safe(report.propertyName), width);
    doc.text(title, left, 26);
    const bottom = 26 + (title.length - 1) * 4;
    doc.text(`${report.range.start} s/d ${report.range.end} | Basis kas`, left, bottom + 6);
    doc.setDrawColor(220); doc.line(left, bottom + 10, left + width, bottom + 10);
    y = bottom + 18;
  }
  function ensure(height: number) { if (y + height > 275) page(); }
  function heading(text: string) {
    ensure(38); doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(25); doc.text(safe(text), left, y); y += 8;
  }
  function table(headers: string[], rows: string[][], widths: number[]) {
    const header = () => {
      doc.setFillColor(242, 244, 238); doc.rect(left, y - 4, width, 9, "F");
      doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(55);
      let x = left + 2; headers.forEach((h, i) => { doc.text(safe(h), x, y + 1); x += widths[i]; }); y += 10;
    };
    ensure(22); header();
    if (!rows.length) rows = [["Belum ada data.", ...headers.slice(1).map(() => "")]];
    for (const row of rows) {
      doc.setFontSize(8); doc.setFont("helvetica", "normal");
      const cells = row.map((cell, i) => doc.splitTextToSize(safe(cell), widths[i] - 4) as string[]);
      const height = Math.max(...cells.map(c => c.length), 1) * 4 + 5;
      if (y + height > 275) { page(); header(); }
      doc.setFont("helvetica", "normal"); doc.setFontSize(8);
      let x = left + 2; doc.setTextColor(40);
      cells.forEach((cell, i) => { doc.text(cell, x, y); x += widths[i]; });
      y += height; doc.setDrawColor(235); doc.line(left, y - 3, left + width, y - 3);
    }
    y += 7;
  }
  page(); heading("Ringkasan otomatis");
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60);
  for (const text of report.summary) {
    const lines = doc.splitTextToSize(safe(text), width) as string[];
    ensure(lines.length * 4.5 + 4); doc.text(lines, left, y); y += lines.length * 4.5 + 4;
  }
  y += 4; heading("Laporan laba-rugi");
  const p = report.totals, money = (value: number) => safe(formatRupiah(value || 0));
  table(["Akun", "Nominal (IDR)"], [
    ["Pendapatan sewa kamar", money(p.rent)], ["Pendapatan lainnya", money(p.otherIncome)], ["TOTAL PENDAPATAN", money(p.revenue)],
    ...p.expenseGroups.map(g => [g.name, money(-g.value)]), ["LABA OPERASIONAL", money(p.revenue - p.operating)], ["Beban bunga", money(-p.interest)], ["LABA SEBELUM PAJAK", money(p.revenue - p.operating - p.interest)], ["Beban pajak", money(-p.tax)], ["LABA BERSIH", money(p.profit)], ["Net profit margin", p.margin === null ? "N/A" : `${p.margin.toFixed(1)}%`],
  ], [117, 57]);
  heading("Ekonomi per kamar - periode terpilih");
  table(["Kamar", "Pendapatan", "Profit", "ROI"], report.units.map(u => [u.room.room_number, money(u.revenue), money(u.profit), u.roi === null ? "N/A" : `${u.roi.toFixed(1)}%`]), [30, 55, 55, 34]);
  heading("Invoice aging - kondisi saat ekspor");
  table(["Kelompok", "Piutang (IDR)"], report.ar.aging.map(a => [a.name, money(a.value)]), [117, 57]);
  heading("Detail pengeluaran");
  table(["Tanggal / Pengeluaran", "Nominal (IDR)"], p.rows.filter(e => e.type === "expense").map(e => [`${e.date} - ${e.title} (${e.category})`, money(e.amount)]), [117, 57]);
  ensure(25); doc.setFontSize(8); doc.setTextColor(110);
  doc.text(doc.splitTextToSize("Pendapatan dan biaya tanpa alokasi kamar dibagi rata ke seluruh kamar. ROI = profit periode / modal tercatat. Laporan manajemen basis kas; penyusutan dan transaksi nonkas tidak termasuk.", width), left, y);
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p); doc.setFontSize(8); doc.setTextColor(130);
    doc.text("KOST / Finance", left, 287); doc.text(`${p} / ${pages}`, 192, 287, { align: "right" });
  }
  return doc;
}
export async function exportFinancePdf(report: FinanceReport) {
  const doc = await createFinancePdf(report);
  doc.save(`kost-finance-${report.range.start}-${report.range.end}.pdf`);
}
