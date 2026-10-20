"use client";

import { CheckCircle2, Edit2, Receipt, Send, Trash2, AlertCircle, Info, Clock } from "lucide-react";
import type { Invoice } from "@/types";
import { invoicePaymentSummary } from "@/lib/finance";
import { formatDateIndo, formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function InvoiceMobileList({
  invoices,
  loading,
  onDetail,
  onReminder,
  onVerify,
  onEdit,
  onDelete,
}: {
  invoices: Invoice[];
  loading: boolean;
  onDetail: (invoice: Invoice) => void;
  onReminder: (invoice: Invoice) => void;
  onVerify: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
}) {
  return (
    <div className="space-y-3 sm:hidden">
      {!invoices.length && (
        <div
          role="status"
          className="rounded-2xl border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500 dark:border-white/10 dark:bg-[#18181B] dark:text-neutral-400"
        >
          {loading ? "Memuat tagihan..." : "Tidak ada tagihan sesuai pencarian."}
        </div>
      )}
      {invoices.map((invoice) => {
        const paid = invoice.status === "paid";
        const overdue = invoice.status === "overdue";
        const cancelled = (invoice.status as string) === "cancelled";
        const paymentSummary = invoicePaymentSummary(invoice);

        return (
          <article
            key={invoice.id}
            className="min-w-0 rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-spatial dark:border-white/10 dark:bg-[#18181B] transition-all hover:border-neutral-300 dark:hover:border-white/20"
          >
            {/* Header: Room & Status Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-black text-neutral-900 dark:text-white">
                Kamar {invoice.room_number || "—"}
              </p>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  paid
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : overdue
                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                    : cancelled
                    ? "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                }`}
              >
                {paid ? "Lunas" : overdue ? "Jatuh Tempo" : cancelled ? "Dibatalkan" : "Belum Bayar"}
              </span>
            </div>

            {/* Tenant Name */}
            <p className="mt-1 break-words text-xs font-semibold text-neutral-600 dark:text-neutral-300">
              {invoice.tenant_name || "Penghuni"}
            </p>

            {/* Total Amount */}
            <p className="mt-2.5 break-words text-2xl font-black tabular-nums text-neutral-900 dark:text-white">
              {formatRupiah(paymentSummary.outstanding > 0 ? paymentSummary.outstanding : invoice.total_amount)}
            </p>
            <p className="mt-0.5 text-[10px] text-neutral-500">{paymentSummary.outstanding > 0 ? "Sisa tagihan" : "Total tagihan"}{paymentSummary.paid > 0 && paymentSummary.outstanding > 0 ? ` · ${formatRupiah(paymentSummary.paid)} sudah dibayar` : ""}</p>

            {/* Inline Status Explanation Alert (Contextual Metadata) */}
            <div className="mt-2.5">
              {overdue && (
                <div className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-2.5 py-1.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/60">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span>Jatuh tempo terlewat: perlu pengingat WhatsApp segera.</span>
                </div>
              )}
              {cancelled && (
                <div className="flex items-center gap-1.5 rounded-xl bg-neutral-100 px-2.5 py-1.5 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                  <Info className="h-3 w-3 shrink-0" />
                  <span>Status: Dibatalkan ({invoice.notes || "Faktur tidak dilanjutkan"}).</span>
                </div>
              )}
              {paid && (
                <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60">
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  <span>Terverifikasi lunas ke kas operasional kost.</span>
                </div>
              )}
              {!paid && !overdue && !cancelled && (
                <div className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-2.5 py-1.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/60">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>Jatuh tempo: {formatDateIndo(invoice.due_date)}.</span>
                </div>
              )}
            </div>

            {/* Details List */}
            <dl className="mt-3 space-y-1.5 border-t border-neutral-100 pt-2.5 text-xs dark:border-white/10">
              <div className="flex justify-between">
                <dt className="text-neutral-500">No. faktur</dt>
                <dd className="font-mono text-neutral-700 dark:text-neutral-300 text-[11px]">
                  {invoice.invoice_number}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Periode</dt>
                <dd className="text-neutral-700 dark:text-neutral-300 font-semibold">{invoice.billing_period}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Jatuh tempo</dt>
                <dd className={overdue ? "font-bold text-rose-600 dark:text-rose-400" : "text-neutral-700 dark:text-neutral-300"}>
                  {formatDateIndo(invoice.due_date)}
                </dd>
              </div>
            </dl>

            {!!invoice.reminder_count && (
              <p className="mt-2 text-[10px] font-medium text-neutral-400">
                {invoice.reminder_count}× pengingat WhatsApp terkirim
              </p>
            )}

            {/* Action Buttons */}
            <div className="mt-3.5 grid grid-cols-2 gap-2">
              <Button variant="outline" className="gap-1.5 text-xs font-bold" onClick={() => onDetail(invoice)}>
                <Receipt size={14} /> Detail
              </Button>
              {!paid && (
                <Button variant="lime" className="gap-1.5 text-xs font-black shadow-lime-glow" onClick={() => onVerify(invoice)}>
                  <CheckCircle2 size={14} /> Verifikasi
                </Button>
              )}
              {!paid && (
                <Button variant="outline" className="col-span-2 gap-1.5 text-xs font-bold" onClick={() => onReminder(invoice)}>
                  <Send size={14} /> Buka Pengingat
                </Button>
              )}
              <button
                aria-label={`Edit faktur ${invoice.invoice_number}`}
                onClick={() => onEdit(invoice)}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <Edit2 size={13} /> Edit
              </button>
              {!paid && (
                <button
                  aria-label={`Hapus faktur ${invoice.invoice_number}`}
                  onClick={() => onDelete(invoice)}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                >
                  <Trash2 size={13} /> Hapus
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
