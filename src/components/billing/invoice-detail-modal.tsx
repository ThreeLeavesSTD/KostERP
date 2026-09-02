"use client";

import React, { useRef } from "react";
import { Printer, Share2, Copy, Check, CheckCircle2, Clock, AlertCircle, Building2, MapPin, Phone, Receipt } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Invoice, PaymentMethodConfig, Property } from "@/types";
import { KostApiClient } from "@/lib/api-client";
import { formatDateIndo, formatRupiah } from "@/lib/utils";

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onOpenReminder?: (invoice: Invoice) => void;
}

export function InvoiceDetailModal({
  isOpen,
  onClose,
  invoice,
  onOpenReminder,
}: InvoiceDetailModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isCopied, setIsCopied] = React.useState(false);
  const [property, setProperty] = React.useState<Partial<Property>>({
    name: "Kost Putri Graha Asri",
    address: "Jl. Margonda Raya No. 45, Beji, Depok",
    phone: "+6281234567890",
  });
  const [paymentAccounts, setPaymentAccounts] = React.useState<PaymentMethodConfig[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      KostApiClient.getProperties()
        .then((props) => {
          if (props[0]) setProperty(props[0]);
        })
        .catch(() => {});

      KostApiClient.getPaymentMethods()
        .then((methods) => {
          setPaymentAccounts(methods.filter((p) => p.is_active));
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!invoice) return null;

  const isPaid = invoice.status === "paid";
  const isOverdue = invoice.status === "overdue";

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const summaryText = `*FAKTUR TAGIHAN KOST*
No: ${invoice.invoice_number}
Kamar: ${invoice.room_number} (${invoice.tenant_name})
Periode: ${invoice.billing_period}
Total Tagihan: ${formatRupiah(invoice.total_amount)}
Status: ${isPaid ? "LUNAS ✅" : isOverdue ? "MENUNGGAK ⚠️" : "BELUM BAYAR ⏳"}
Batas Waktu: ${formatDateIndo(invoice.due_date)}`;

    navigator.clipboard.writeText(summaryText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Faktur & Kuitansi Tagihan Digital"
      description="Dokumen resmi tagihan sewa kamar kost yang dapat dicetak atau dibagikan."
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Printable Invoice Container */}
        <div
          ref={printRef}
          className="rounded-3xl border border-neutral-200 bg-white p-6 dark:bg-neutral-900 dark:border-neutral-700 shadow-sm print:border-none print:p-0"
        >
          {/* Letterhead Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-neutral-200 pb-5 dark:border-white/10 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0A0A0A] text-white dark:bg-white dark:text-[#0A0A0A]">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight text-neutral-900 dark:text-white">
                    {property.name}
                  </h3>
                  <p className="text-[11px] text-neutral-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {property.address}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                FAKTUR PEMBAYARAN
              </span>
              <p className="text-sm font-black font-mono text-neutral-900 dark:text-white">
                {invoice.invoice_number}
              </p>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                    isPaid
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : isOverdue
                      ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  }`}
                >
                  {isPaid ? "Lunas (Paid)" : isOverdue ? "Jatuh Tempo (Overdue)" : "Belum Bayar (Unpaid)"}
                </span>
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 my-5 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-neutral-400 block">Tertagih Kepada</span>
              <p className="font-extrabold text-neutral-900 dark:text-white text-sm mt-0.5">
                {invoice.tenant_name}
              </p>
              <p className="text-neutral-500 text-[11px]">{invoice.tenant_phone}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-neutral-400 block">Unit & Periode</span>
              <p className="font-extrabold text-neutral-900 dark:text-white text-sm mt-0.5">
                Kamar {invoice.room_number}
              </p>
              <p className="text-neutral-500 text-[11px]">Periode: {invoice.billing_period}</p>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold uppercase text-neutral-400 block">Jatuh Tempo</span>
              <p className="font-bold text-neutral-900 dark:text-white text-xs mt-0.5">
                {formatDateIndo(invoice.due_date)}
              </p>
              <p className="text-neutral-400 text-[10px]">Terbit: {formatDateIndo(invoice.created_at)}</p>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="rounded-2xl border border-neutral-200 overflow-hidden dark:border-neutral-700">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 dark:bg-neutral-800/80 dark:border-neutral-700 text-[10px] font-bold uppercase text-neutral-500">
                <tr>
                  <th className="px-4 py-2.5">Deskripsi Tagihan</th>
                  <th className="px-4 py-2.5 text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
                {invoice.items && invoice.items.length > 0 ? (
                  invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2.5 font-medium text-neutral-800 dark:text-neutral-200">
                        {item.description}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-neutral-900 dark:text-white">
                        {formatRupiah(item.amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <>
                    <tr>
                      <td className="px-4 py-2.5 font-medium text-neutral-800 dark:text-neutral-200">
                        Sewa Pokok Kamar {invoice.room_number}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-neutral-900 dark:text-white">
                        {formatRupiah(invoice.subtotal_rent)}
                      </td>
                    </tr>
                    {invoice.additional_fees > 0 && (
                      <tr>
                        <td className="px-4 py-2.5 font-medium text-neutral-800 dark:text-neutral-200">
                          Biaya Tambahan / Token PLN
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-neutral-900 dark:text-white">
                          {formatRupiah(invoice.additional_fees)}
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
              <tfoot className="bg-neutral-50 border-t border-neutral-200 dark:bg-neutral-800/80 dark:border-neutral-700 font-black">
                <tr>
                  <td className="px-4 py-3 uppercase text-neutral-600 dark:text-neutral-400">Total Tagihan</td>
                  <td className="px-4 py-3 text-right text-sm text-neutral-900 dark:text-[#D9FF43]">
                    {formatRupiah(invoice.total_amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment Dest Accounts */}
          <div className="mt-5 rounded-2xl bg-neutral-50 p-4 border border-neutral-200 dark:bg-neutral-800/50 dark:border-neutral-700 text-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-2">
              Tujuan Pembayaran Resmi Kost
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {paymentAccounts.map((acc) => (
                <div key={acc.id} className="rounded-xl bg-white p-2.5 border border-neutral-200/80 dark:bg-neutral-900 dark:border-neutral-700">
                  <span className="font-black text-neutral-900 dark:text-white text-xs">{acc.bank_name}</span>
                  <p className="font-mono font-extrabold text-neutral-800 dark:text-neutral-200 text-xs mt-0.5">
                    {acc.account_number}
                  </p>
                  <p className="text-[10px] text-neutral-500">a.n {acc.account_holder}</p>
                </div>
              ))}
            </div>
          </div>

          {invoice.notes && (
            <p className="mt-3 text-[11px] text-neutral-500 italic">
              *Catatan: {invoice.notes}
            </p>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-neutral-100 pt-3 dark:border-white/10">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopySummary}
            className="w-full sm:w-auto gap-1.5 text-xs font-bold"
          >
            {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{isCopied ? "Tersalin!" : "Salin Ringkasan"}</span>
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {!isPaid && onOpenReminder && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenReminder(invoice);
                }}
                className="gap-1.5 text-xs font-bold"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Kirim Pengingat WA</span>
              </Button>
            )}

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs font-bold"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Cetak / Simpan PDF</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
