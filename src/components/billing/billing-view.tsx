"use client";

import React, { useState, useEffect } from "react";
import {
  Receipt,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Plus,
  Zap,
  Printer,
  Edit2,
  Trash2,
  ExternalLink,
  MessageSquare,
  Users,
  BellRing,
  Check,
  Building2,
  Calendar,
  Sparkles,
} from "lucide-react";
import { Invoice, InvoiceStatus } from "@/types";
import { KostApiClient } from "@/lib/api-client";
import { KostStorage } from "@/lib/storage";
import { formatRupiah, formatDateIndo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { PaymentVerificationModal } from "./payment-verification-modal";
import { InvoiceFormModal } from "./invoice-form-modal";
import { InvoiceReminderModal } from "./invoice-reminder-modal";
import { InvoiceDetailModal } from "./invoice-detail-modal";
import { BroadcastReminderModal } from "./broadcast-reminder-modal";
import { InvoiceMobileList } from "./invoice-mobile-list";
import { FinancePropertyPicker, useFinanceWorkspace } from "@/lib/finance-workspace-context";
import { invoicePaymentSummary } from "@/lib/finance";

function normalizedInvoice(invoice: Invoice): Invoice {
  const summary = invoicePaymentSummary(invoice);
  return { ...invoice, status: summary.settled ? "paid" : invoice.due_date < new Date().toISOString().slice(0, 10) ? "overdue" : "unpaid" };
}

export function BillingView() {
  const { activePropertyId } = useFinanceWorkspace();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<InvoiceStatus | "all">("all");

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);

  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<Invoice | null>(null);
  const [selectedInvoiceForReminder, setSelectedInvoiceForReminder] = useState<Invoice | null>(null);
  const [selectedInvoiceForVerify, setSelectedInvoiceForVerify] = useState<Invoice | null>(null);

  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    if (!activePropertyId) { setInvoices([]); setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const data = await KostApiClient.getInvoices(activePropertyId);
      setInvoices(data.filter(invoice => invoice.property_id === activePropertyId).map(normalizedInvoice));
    } catch (err) {
      console.error("Gagal memuat invoice:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setInvoices(KostStorage.getInvoices().filter(invoice => invoice.property_id === activePropertyId).map(normalizedInvoice));
    void loadData();

    const handleStorageChange = () => {
      setInvoices(KostStorage.getInvoices().filter(invoice => invoice.property_id === activePropertyId).map(normalizedInvoice));
    };
    window.addEventListener("kost_storage_change", handleStorageChange);
    return () => window.removeEventListener("kost_storage_change", handleStorageChange);
  }, [activePropertyId]);

  const filteredInvoices = invoices.filter((inv) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(q) ||
      inv.room_number?.toLowerCase().includes(q) ||
      inv.tenant_name?.toLowerCase().includes(q) ||
      inv.billing_period?.toLowerCase().includes(q);
    const matchesStatus = selectedTab === "all" || inv.status === selectedTab;
    return matchesSearch && matchesStatus;
  });

  const unpaidInvoices = invoices.filter((i) => invoicePaymentSummary(i).outstanding > 0);
  const unpaidCount = invoices.filter((i) => i.status === "unpaid").length;
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;
  const paidCount = invoices.filter((i) => i.status === "paid").length;

  const totalUnpaidNominal = unpaidInvoices.reduce((s, i) => s + invoicePaymentSummary(i).outstanding, 0);
  const totalRemindersDispatched = invoices.reduce((s, i) => s + (i.reminder_count || 0), 0);

  const handleBatchGenerateInvoices = async () => {
    try {
      const allLeases = await KostApiClient.getLeases();
      const activeLeases = allLeases.filter((l) => l.property_id === activePropertyId && l.status === "active");
      const currentMonth = new Date().toISOString().slice(0, 7);
      let createdCount = 0;

      for (const lease of activeLeases) {
        const exists = invoices.some(
          (i) => i.lease_id === lease.id && i.billing_period === currentMonth
        );
        if (!exists) {
          const invNum = `INV/${currentMonth.replace("-", "")}/${Math.floor(
            100 + Math.random() * 900
          )}`;
          const dueDate = new Date();
          dueDate.setDate(lease.billing_cycle_day || 1);
          dueDate.setDate(dueDate.getDate() + 5);

          await KostApiClient.createInvoice({
            property_id: activePropertyId,
            lease_id: lease.id,
            invoice_number: invNum,
            billing_period: currentMonth,
            subtotal_rent: lease.rent_amount,
            additional_fees: 0,
            notes: `Tagihan Sewa Kamar ${lease.room_number} Periode ${currentMonth}`,
            total_amount: lease.rent_amount,
            due_date: dueDate.toISOString().slice(0, 10),
            status: "unpaid",
          });
          createdCount++;
        }
      }

      await loadData();
      notify.success(
        "Generate Tagihan Selesai",
        `Berhasil menerbitkan ${createdCount} invoice bulanan baru untuk seluruh kamar aktif.`
      );
    } catch (err: any) {
      notify.alert({ title: "Gagal Generate Tagihan", message: err.message, variant: "danger" });
    }
  };

  const handleDeleteInvoice = async (inv: Invoice) => {
    if (inv.status === "paid") {
      notify.alert({
        title: "Faktur Lunas Terkunci",
        message: "Faktur yang sudah berstatus Lunas tidak dapat dihapus demi menjaga integritas pembukuan & audit finansial.",
        variant: "warning",
      });
      return;
    }

    const ok = await notify.confirmDelete({
      title: `Hapus Faktur ${inv.invoice_number}?`,
      itemName: inv.invoice_number,
      itemType: "Faktur Tagihan",
      itemDetails: `Kamar ${inv.room_number} • ${inv.tenant_name} • ${formatRupiah(inv.total_amount)}`,
      message: `Apakah Anda yakin ingin membatalkan & menghapus faktur tagihan ini? Data tagihan akan dihapus dari server database.`,
      warningNote: "Faktur yang dihapus tidak akan dapat diterbitkan ulang dengan nomor yang sama.",
      confirmText: "Hapus Faktur Permanen",
      cancelText: "Batalkan",
    });

    if (ok) {
      try {
        await KostApiClient.deleteInvoice(inv.id);
        await loadData();
        notify.deleted(inv.invoice_number, "Faktur Tagihan");
      } catch (err: any) {
        notify.alert({ title: "Gagal Menghapus Faktur", message: err.message, variant: "danger" });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
              Penagihan Sewa & Invoice Digital
            </h2>
            <span className="rounded-full bg-[#D9FF43] px-2.5 py-0.5 text-xs font-bold text-[#0A0A0A]">
              {invoices.length} Faktur
            </span>
          </div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
            Sistem penagihan otomatis, multi-tier pengingat WhatsApp n8n (H-3, Hari-H, Jatuh Tempo), dan kwitansi digital.
          </p>
        </div>

        <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
          <FinancePropertyPicker className="w-full sm:w-auto" />
          {unpaidInvoices.length > 0 && (
            <Button
              onClick={() => setIsBroadcastModalOpen(true)}
              variant="outline"
              className="gap-2 shadow-spatial text-xs font-bold border-amber-500/40 text-amber-900 dark:text-amber-300 bg-white dark:bg-[#18181B] hover:bg-amber-50"
            >
              <BellRing className="h-4 w-4 text-amber-600 dark:text-[#D9FF43]" />
              <span>Broadcast Pengingat ({unpaidInvoices.length})</span>
            </Button>
          )}

          <Button
            onClick={handleBatchGenerateInvoices}
            variant="outline"
            className="gap-2 shadow-spatial text-xs font-bold"
          >
            <Zap className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
            <span>Generate Bulanan Otomatis</span>
          </Button>

          <Button
            onClick={() => {
              setInvoiceToEdit(null);
              setIsFormModalOpen(true);
            }}
            variant="lime"
            className="gap-2 font-black text-xs shadow-lime-glow"
          >
            <Plus className="h-4 w-4" />
            <span>+ Buat Invoice Baru</span>
          </Button>
        </div>
      </div>

      {/* Bento Metric Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Unpaid */}
        <div className="rounded-3xl border border-neutral-800 bg-[#0A0A0A] p-5 shadow-spatial text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Total Belum Terbayar</span>
            <div className="rounded-2xl bg-[#D9FF43] p-2 text-[#0A0A0A]">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black tracking-tight text-[#D9FF43]">
            {formatRupiah(totalUnpaidNominal)}
          </p>
          <p className="mt-1 text-[11px] font-medium text-neutral-400">
            {unpaidCount + overdueCount} Kamar Menunggak / Unpaid
          </p>
        </div>

        {/* Overdue */}
        <div className="rounded-3xl border border-white/80 bg-white p-5 shadow-spatial dark:bg-[#18181B] dark:border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Lewat Jatuh Tempo</span>
            <div className="rounded-2xl bg-rose-100 p-2 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black tracking-tight text-rose-600 dark:text-rose-400">
            {overdueCount} <span className="text-sm font-normal text-neutral-400">Kamar</span>
          </p>
          <p className="mt-1 text-[11px] font-medium text-neutral-500">Perlu teguran & reminder mendesak</p>
        </div>

        {/* Paid This Month */}
        <div className="rounded-3xl border border-white/80 bg-white p-5 shadow-spatial dark:bg-[#18181B] dark:border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Lunas Terverifikasi</span>
            <div className="rounded-2xl bg-emerald-100 p-2 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
            {paidCount} <span className="text-sm font-normal text-neutral-400">Invoice</span>
          </p>
          <p className="mt-1 text-[11px] font-medium text-neutral-500">Masuk otomatis ke kas operasional</p>
        </div>

        {/* Reminders Dispatched */}
        <div className="rounded-3xl border border-white/80 bg-white p-5 shadow-spatial dark:bg-[#18181B] dark:border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Pengingat Terkirim</span>
            <div className="rounded-2xl bg-neutral-100 p-2 text-neutral-900 dark:bg-neutral-800 dark:text-white">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
            {totalRemindersDispatched}x <span className="text-sm font-normal text-neutral-400">Notifikasi</span>
          </p>
          <p className="mt-1 text-[11px] font-medium text-neutral-500">Terkirim via WhatsApp n8n webhook</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex min-w-0 flex-col gap-3 items-center justify-between rounded-3xl bg-white p-3 shadow-spatial border border-white/80 dark:bg-[#18181B] dark:border-white/10 sm:flex-row sm:flex-wrap">
        <div className="flex w-full max-w-full items-center gap-1.5 rounded-full bg-neutral-100 p-1 dark:bg-neutral-800 overflow-x-auto sm:w-auto">
          {[
            { id: "all", label: `Semua (${invoices.length})` },
            { id: "unpaid", label: `Belum Bayar (${unpaidCount})` },
            { id: "overdue", label: `Jatuh Tempo (${overdueCount})` },
            { id: "paid", label: `Lunas (${paidCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold whitespace-nowrap transition-all ${
                selectedTab === tab.id
                  ? "bg-[#0A0A0A] text-white shadow-xs dark:bg-white dark:text-[#0A0A0A]"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            aria-label="Cari tagihan"
            placeholder="Cari no faktur, kamar, atau nama penghuni..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-neutral-200/80 bg-neutral-50 py-2 pl-10 pr-4 text-xs font-medium focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
          />
        </div>
      </div>

      {/* Invoice Data Table */}
      <InvoiceMobileList invoices={filteredInvoices} loading={isLoading} onDetail={setSelectedInvoiceForDetail} onReminder={setSelectedInvoiceForReminder} onVerify={setSelectedInvoiceForVerify} onEdit={invoice => { setInvoiceToEdit(invoice); setIsFormModalOpen(true); }} onDelete={handleDeleteInvoice} />
      <div className="hidden overflow-hidden rounded-3xl border border-white/80 bg-white shadow-spatial dark:bg-[#18181B] dark:border-white/10 sm:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-100 bg-neutral-50/80 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:bg-neutral-800/60 dark:border-white/10">
              <tr>
                <th className="px-5 py-4">No. Faktur & Periode</th>
                <th className="px-5 py-4">Kamar & Penghuni</th>
                <th className="px-5 py-4">Jatuh Tempo</th>
                <th className="px-5 py-4">Rincian Pos Tagihan</th>
                <th className="px-5 py-4">Total Tagihan</th>
                <th className="px-5 py-4">Status & Pengingat</th>
                <th className="px-5 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    <Receipt className="mx-auto h-10 w-10 text-neutral-300 dark:text-neutral-600 mb-2" />
                    <p className="font-bold text-neutral-700 dark:text-neutral-300">Tidak ada faktur tagihan ditemukan</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">Silakan buat invoice baru atau generate tagihan bulanan.</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isPaid = inv.status === "paid";
                  const isOverdue = inv.status === "overdue";

                  return (
                    <tr
                      key={inv.id}
                      className="transition-colors hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40"
                    >
                      {/* Invoice Number & Period */}
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setSelectedInvoiceForDetail(inv)}
                          className="font-mono font-black text-neutral-900 hover:text-neutral-600 dark:text-white dark:hover:text-[#D9FF43] transition-colors text-left"
                        >
                          {inv.invoice_number}
                        </button>
                        <p className="text-[11px] font-medium text-neutral-400 mt-0.5">
                          Periode: <span className="font-semibold text-neutral-700 dark:text-neutral-300">{inv.billing_period}</span>
                        </p>
                      </td>

                      {/* Room & Tenant */}
                      <td className="px-5 py-4">
                        <span className="font-black text-neutral-900 dark:text-white text-sm block">
                          Kamar {inv.room_number}
                        </span>
                        <p className="font-bold text-neutral-700 dark:text-neutral-300">
                          {inv.tenant_name}
                        </p>
                        <p className="text-[10px] font-medium text-neutral-400">{inv.tenant_phone}</p>
                      </td>

                      {/* Due Date */}
                      <td className="px-5 py-4">
                        <p className="font-bold text-neutral-800 dark:text-neutral-200">
                          {formatDateIndo(inv.due_date)}
                        </p>
                        <p className="text-[10px] text-neutral-400 mt-0.5">
                          Terbit: {formatDateIndo(inv.created_at)}
                        </p>
                      </td>

                      {/* Details */}
                      <td className="px-5 py-4">
                        <p className="font-medium text-neutral-600 dark:text-neutral-400">
                          Sewa Pokok: <span className="font-bold text-neutral-800 dark:text-neutral-200">{formatRupiah(inv.subtotal_rent)}</span>
                        </p>
                        {inv.additional_fees > 0 && (
                          <p className="text-[11px] font-semibold text-neutral-900 dark:text-[#D9FF43] mt-0.5">
                            + Biaya/Token: {formatRupiah(inv.additional_fees)}
                          </p>
                        )}
                        {inv.items && inv.items.length > 1 && (
                          <span className="text-[10px] text-neutral-400">({inv.items.length} rincian item)</span>
                        )}
                      </td>

                      {/* Total */}
                      <td className="px-5 py-4">
                        <p className="text-sm font-black text-neutral-900 dark:text-white">
                          {formatRupiah(inv.total_amount)}
                        </p>
                        {invoicePaymentSummary(inv).paid > 0 && invoicePaymentSummary(inv).outstanding > 0 && <p className="mt-1 text-[10px] text-neutral-500">Sisa {formatRupiah(invoicePaymentSummary(inv).outstanding)}</p>}
                      </td>

                      {/* Status & Reminder Tracker */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-black ${
                              isPaid
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : isOverdue
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isPaid ? "bg-emerald-500" : isOverdue ? "bg-rose-500" : "bg-amber-500"
                              }`}
                            />
                            {isPaid ? "Lunas" : isOverdue ? "Jatuh Tempo" : "Belum Bayar"}
                          </span>

                          {/* Contextual Status Reason */}
                          {isOverdue && (
                            <span className="block text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                              Lewat jatuh tempo {formatDateIndo(inv.due_date)}
                            </span>
                          )}

                          {/* Reminder History Indicator */}
                          {inv.reminder_count && inv.reminder_count > 0 ? (
                            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <BellRing className="h-3 w-3" />
                              <span>{inv.reminder_count}x Pengingat</span>
                            </p>
                          ) : !isPaid ? (
                            <p className="text-[10px] text-neutral-400">Belum diingatkan</p>
                          ) : null}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Struk / Detail Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedInvoiceForDetail(inv)}
                            title="Lihat Struk / Faktur Digital"
                            className="h-8 w-8 p-0 rounded-full"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </Button>

                          {!isPaid ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedInvoiceForReminder(inv)}
                                className="h-8 gap-1 text-xs font-bold"
                              >
                                <Send className="h-3 w-3" />
                                <span>Reminder</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="lime"
                                onClick={() => setSelectedInvoiceForVerify(inv)}
                                className="h-8 gap-1 text-xs font-black shadow-lime-glow"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Verifikasi ↗</span>
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Lunas</span>
                            </span>
                          )}

                          {/* Edit & Delete Actions */}
                          <button
                            onClick={() => {
                              setInvoiceToEdit(inv);
                              setIsFormModalOpen(true);
                            }}
                            title="Edit Faktur"
                            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          {!isPaid && (
                            <button
                              onClick={() => handleDeleteInvoice(inv)}
                              title="Hapus Faktur"
                              className="rounded-full p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. Modal Form Buat & Edit Invoice */}
      <InvoiceFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        invoiceToEdit={invoiceToEdit}
        propertyId={activePropertyId}
        onSuccess={loadData}
      />

      {/* 2. Modal Struk & Faktur Digital */}
      <InvoiceDetailModal
        isOpen={!!selectedInvoiceForDetail}
        onClose={() => setSelectedInvoiceForDetail(null)}
        invoice={selectedInvoiceForDetail}
        onOpenReminder={(inv) => setSelectedInvoiceForReminder(inv)}
      />

      {/* 3. Modal Smart Multi-Stage Reminder WhatsApp */}
      <InvoiceReminderModal
        isOpen={!!selectedInvoiceForReminder}
        onClose={() => setSelectedInvoiceForReminder(null)}
        invoice={selectedInvoiceForReminder}
        onSuccess={loadData}
      />

      {/* 4. Modal Broadcast Reminder Massal */}
      <BroadcastReminderModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        unpaidInvoices={unpaidInvoices}
        onSuccess={loadData}
      />

      {/* 5. Modal Verifikasi Pembayaran */}
      <PaymentVerificationModal
        isOpen={!!selectedInvoiceForVerify}
        onClose={() => setSelectedInvoiceForVerify(null)}
        invoice={selectedInvoiceForVerify}
        onSuccess={loadData}
      />
    </div>
  );
}
