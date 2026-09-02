"use client";

import React, { useState, useEffect } from "react";
import { Send, Copy, Check, ExternalLink, MessageSquare, Clock, Sparkles, AlertTriangle, ShieldAlert } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Invoice, PaymentMethodConfig } from "@/types";
import { KostApiClient } from "@/lib/api-client";
import { formatDateIndo, formatRupiah } from "@/lib/utils";
import { WhatsAppTemplates, ReminderStage, sendWebhookToN8n } from "@/lib/n8n/webhook-client";
import { notify } from "@/lib/notify";

interface InvoiceReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSuccess: () => void;
}

export function InvoiceReminderModal({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}: InvoiceReminderModalProps) {
  const [stage, setStage] = useState<ReminderStage>("h3_friendly");
  const [customText, setCustomText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Auto-detect recommended strategy based on due date
  useEffect(() => {
    if (invoice && isOpen) {
      const today = new Date().toISOString().slice(0, 10);
      const isOverdue = invoice.due_date < today;
      const isToday = invoice.due_date === today;

      let initialStage: ReminderStage = "h3_friendly";
      if (isOverdue) {
        // Calculate days overdue
        const diffTime = Math.abs(new Date(today).getTime() - new Date(invoice.due_date).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        initialStage = diffDays >= 7 ? "overdue_final" : "overdue_stage1";
      } else if (isToday) {
        initialStage = "due_today";
      } else {
        initialStage = "h3_friendly";
      }

      setStage(initialStage);

      KostApiClient.getPaymentMethods()
        .then((paymentAccounts) => {
          const generated = WhatsAppTemplates.invoiceReminder(
            {
              tenant_name: invoice.tenant_name || "Penghuni",
              tenant_phone: invoice.tenant_phone || "",
              room_number: invoice.room_number || "-",
              invoice_number: invoice.invoice_number,
              due_date: formatDateIndo(invoice.due_date),
              subtotal_rent: invoice.subtotal_rent,
              additional_fees: invoice.additional_fees,
              total_amount: invoice.total_amount,
              payment_accounts: paymentAccounts,
            },
            initialStage
          );
          setCustomText(generated);
        })
        .catch(() => {});
    }
  }, [invoice, isOpen]);

  const handleSelectStage = async (newStage: ReminderStage) => {
    setStage(newStage);
    if (!invoice) return;

    let paymentAccounts: PaymentMethodConfig[] = [];
    try {
      paymentAccounts = await KostApiClient.getPaymentMethods();
    } catch {}

    const generated = WhatsAppTemplates.invoiceReminder(
      {
        tenant_name: invoice.tenant_name || "Penghuni",
        tenant_phone: invoice.tenant_phone || "",
        room_number: invoice.room_number || "-",
        invoice_number: invoice.invoice_number,
        due_date: formatDateIndo(invoice.due_date),
        subtotal_rent: invoice.subtotal_rent,
        additional_fees: invoice.additional_fees,
        total_amount: invoice.total_amount,
        payment_accounts: paymentAccounts,
      },
      newStage
    );
    setCustomText(generated);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(customText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSendViaN8n = async () => {
    if (!invoice) return;
    setIsSending(true);

    let paymentAccounts: PaymentMethodConfig[] = [];
    try {
      paymentAccounts = await KostApiClient.getPaymentMethods();
    } catch {}

    const webhookUrl =
      process.env.NEXT_PUBLIC_N8N_WEBHOOK_INVOICE_REMINDER ||
      "https://n8n.webhook.internal/invoice-reminder";

    const payload = {
      tenant_name: invoice.tenant_name || "Penghuni",
      tenant_phone: invoice.tenant_phone || "",
      room_number: invoice.room_number || "-",
      invoice_number: invoice.invoice_number,
      due_date: formatDateIndo(invoice.due_date),
      total_amount: invoice.total_amount,
      reminder_stage: stage,
      formatted_message: customText,
      payment_accounts: paymentAccounts,
    };

    await sendWebhookToN8n(webhookUrl, {
      event: "invoice.reminder_dispatched",
      payload,
    });

    try {
      await KostApiClient.updateInvoice(invoice.id, {
        reminder_count: (invoice.reminder_count || 0) + 1,
        last_reminder_at: new Date().toISOString(),
      });
    } catch {}

    setIsSending(false);
    notify.success(
      "Pengingat Terkirim",
      `Pesan pengingat tagihan berhasil dikirim ke ${invoice.tenant_name} (${invoice.tenant_phone}) via n8n.`
    );
    onSuccess();
    onClose();
  };

  if (!invoice) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Pengingat Tagihan: Kamar ${invoice.room_number}`}
      description="Pilih strategi pengingat cerdas berdasarkan tingkat jatuh tempo sewa penghuni."
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Recipient Snapshot Pod */}
        <div className="rounded-2xl bg-neutral-50 p-3.5 border border-neutral-200/80 dark:bg-neutral-800/60 dark:border-neutral-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-neutral-900 dark:text-white">
                {invoice.tenant_name}
              </span>
              <span className="rounded-full bg-[#0A0A0A] text-white px-2.5 py-0.5 text-[10px] font-bold dark:bg-white dark:text-[#0A0A0A]">
                Kamar {invoice.room_number}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              WA: <span className="font-bold text-neutral-700 dark:text-neutral-300">{invoice.tenant_phone}</span> · Faktur: <span className="font-mono font-bold">{invoice.invoice_number}</span>
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold text-neutral-400">Total Tagihan</span>
            <p className="text-base font-black text-neutral-900 dark:text-[#D9FF43]">
              {formatRupiah(invoice.total_amount)}
            </p>
            {invoice.reminder_count ? (
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                Sudah diingatkan {invoice.reminder_count}x
              </span>
            ) : (
              <span className="text-[10px] text-neutral-400">Belum pernah diingatkan</span>
            )}
          </div>
        </div>

        {/* Multi-Tier Strategy Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
            Pilih Tingkatan Pengingat (Reminder Strategy)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handleSelectStage("h3_friendly")}
              className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all ${
                stage === "h3_friendly"
                  ? "bg-emerald-500/10 border-emerald-500 text-emerald-950 dark:text-emerald-300 shadow-spatial"
                  : "bg-white border-neutral-200 hover:border-neutral-300 dark:bg-neutral-800 dark:border-neutral-700"
              }`}
            >
              <div className="flex items-center gap-1 text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                <Sparkles className="h-3.5 w-3.5" />
                <span>H-3 Ramah</span>
              </div>
              <p className="text-[10px] text-neutral-500 mt-1">
                Pemberitahuan awal santun sebelum jatuh tempo
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleSelectStage("due_today")}
              className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all ${
                stage === "due_today"
                  ? "bg-amber-500/10 border-amber-500 text-amber-950 dark:text-amber-300 shadow-spatial"
                  : "bg-white border-neutral-200 hover:border-neutral-300 dark:bg-neutral-800 dark:border-neutral-700"
              }`}
            >
              <div className="flex items-center gap-1 text-[11px] font-black text-amber-600 dark:text-amber-400">
                <Clock className="h-3.5 w-3.5" />
                <span>Hari-H</span>
              </div>
              <p className="text-[10px] text-neutral-500 mt-1">
                Batas akhir pembayaran hari ini
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleSelectStage("overdue_stage1")}
              className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all ${
                stage === "overdue_stage1"
                  ? "bg-orange-500/10 border-orange-500 text-orange-950 dark:text-orange-300 shadow-spatial"
                  : "bg-white border-neutral-200 hover:border-neutral-300 dark:bg-neutral-800 dark:border-neutral-700"
              }`}
            >
              <div className="flex items-center gap-1 text-[11px] font-black text-orange-600 dark:text-orange-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>H+1 s/d H+3</span>
              </div>
              <p className="text-[10px] text-neutral-500 mt-1">
                Teguran keterlambatan tingkat pertama
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleSelectStage("overdue_final")}
              className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all ${
                stage === "overdue_final"
                  ? "bg-rose-500/10 border-rose-500 text-rose-950 dark:text-rose-300 shadow-spatial"
                  : "bg-white border-neutral-200 hover:border-neutral-300 dark:bg-neutral-800 dark:border-neutral-700"
              }`}
            >
              <div className="flex items-center gap-1 text-[11px] font-black text-rose-600 dark:text-rose-400">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Teguran Keras</span>
              </div>
              <p className="text-[10px] text-neutral-500 mt-1">
                Peringatan resmi sanksi / pembekuan fasilitas
              </p>
            </button>
          </div>
        </div>

        {/* Live Editable Preview */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Pratinjau & Edit Pesan WhatsApp:
            </label>
            <span className="text-[10px] text-neutral-400">
              Dapat diedit manual sebelum dikirim
            </span>
          </div>
          <textarea
            rows={8}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 p-4 font-mono text-xs text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100"
          />
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-neutral-100 pt-4 dark:border-white/10">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="w-full sm:w-auto gap-1.5 text-xs font-bold"
          >
            {isCopied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-bold">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Salin Teks WA</span>
              </>
            )}
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <a
              href={`https://wa.me/${(invoice.tenant_phone || "").replace(/[^\d]/g, "")}?text=${encodeURIComponent(customText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-bold text-neutral-900 hover:bg-neutral-50 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Buka WA ↗</span>
            </a>

            <Button
              type="button"
              variant="lime"
              size="sm"
              disabled={isSending}
              onClick={handleSendViaN8n}
              className="gap-1.5 text-xs font-black shadow-lime-glow"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isSending ? "Mengirim..." : "Kirim via n8n ⚡"}</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
