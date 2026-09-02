"use client";

import React, { useState, useEffect } from "react";
import { FileSpreadsheet, Search, Download, CheckCircle2, FileText, ArrowDownLeft } from "lucide-react";
import { Invoice } from "@/types";
import { KostApiClient } from "@/lib/api-client";
import { formatRupiah, formatDateIndo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

export function OwnerAuditView() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await KostApiClient.getInvoices();
      setInvoices(data);
    } catch (err) {
      console.error("Gagal memuat invoice audit:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const paidInvoices = invoices.filter((i) => i.status === "paid");

  const filtered = paidInvoices.filter((inv) => {
    const q = searchQuery.toLowerCase();
    return (
      inv.invoice_number.toLowerCase().includes(q) ||
      inv.room_number?.toLowerCase().includes(q) ||
      inv.tenant_name?.toLowerCase().includes(q)
    );
  });

  const totalCollected = paidInvoices.reduce((s, i) => s + i.total_amount, 0);

  const handleExportAudit = () => {
    const rows = paidInvoices.map((inv) => {
      const p = inv.payments?.[0];
      return {
        "Waktu Pembayaran": p ? p.paid_at : inv.created_at,
        "No. Invoice": inv.invoice_number,
        "Nomor Kamar": inv.room_number,
        "Nama Penghuni": inv.tenant_name,
        "Metode Pembayaran": p ? p.payment_method : "Transfer",
        "Diverifikasi Oleh": p ? p.verified_by : "Admin",
        "Sewa Pokok": inv.subtotal_rent,
        "Biaya Tambahan / Token": inv.additional_fees,
        "Total Diterima (Rp)": inv.total_amount,
        "Status Audit": "TERVERIFIKASI",
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Audit Arus Kas");
    XLSX.writeFile(wb, `Audit_Arus_Kas_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
              Audit & Arus Kas Masuk
            </h2>
            <span className="rounded-full bg-[#D9FF43] px-2.5 py-0.5 text-xs font-bold text-[#0A0A0A]">
              {paidInvoices.length} Terverifikasi
            </span>
          </div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
            Daftar lengkap transaksi penerimaan sewa yang telah tervalidasi oleh pengelola kost.
          </p>
        </div>

        <Button onClick={handleExportAudit} variant="lime" className="gap-2 shadow-spatial text-xs font-bold">
          <Download className="h-4 w-4" />
          <span>Ekspor Buku Kas (Excel)</span>
        </Button>
      </div>

      <div className="rounded-3xl border border-neutral-800 bg-[#0A0A0A] p-5 shadow-spatial text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Total Kas Masuk Terverifikasi</p>
            <p className="mt-2 text-3xl font-black tracking-tight text-[#D9FF43]">
              {formatRupiah(totalCollected)}
            </p>
          </div>
          <span className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-white backdrop-blur-md">
            {paidInvoices.length} Transaksi Lunas
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          placeholder="Cari transaksi berdasarkan invoice, kamar, atau nama penghuni..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-full border border-white/80 bg-white py-3 pl-11 pr-4 text-xs font-medium shadow-spatial focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-[#18181B] dark:border-white/10 dark:text-white"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-spatial dark:bg-[#18181B] dark:border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-100 bg-neutral-50/80 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:bg-neutral-800/60 dark:border-white/10">
              <tr>
                <th className="px-5 py-4">Waktu & No. Invoice</th>
                <th className="px-5 py-4">Kamar & Penyewa</th>
                <th className="px-5 py-4">Metode Bayar</th>
                <th className="px-5 py-4">Diverifikasi Oleh</th>
                <th className="px-5 py-4">Rincian Sewa</th>
                <th className="px-5 py-4 text-right">Nominal Diterima</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-neutral-400">
                    Tidak ada log arus kas ditemukan.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => {
                  const payment = inv.payments?.[0];
                  return (
                    <tr
                      key={inv.id}
                      className="transition-colors hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40"
                    >
                      <td className="px-5 py-4">
                        <p className="font-mono font-extrabold text-neutral-900 dark:text-white">
                          {inv.invoice_number}
                        </p>
                        <p className="text-[10px] font-medium text-neutral-400">
                          {payment ? formatDateIndo(payment.paid_at) : formatDateIndo(inv.created_at)}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-black text-neutral-900 dark:text-white text-sm">Kamar {inv.room_number}</span>
                        <p className="font-bold text-neutral-700 dark:text-neutral-300">{inv.tenant_name}</p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold dark:bg-neutral-800 dark:text-neutral-200">
                          {payment?.payment_method || "BCA Transfer"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">
                          {payment?.verified_by || "Admin Kost"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-neutral-500 font-medium">Pokok: {formatRupiah(inv.subtotal_rent)}</p>
                        {inv.additional_fees > 0 && (
                          <p className="text-neutral-900 dark:text-[#D9FF43] font-bold text-[11px]">
                            + Biaya/Token: {formatRupiah(inv.additional_fees)}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right font-black text-neutral-900 dark:text-[#D9FF43] text-sm">
                        +{formatRupiah(inv.total_amount)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
