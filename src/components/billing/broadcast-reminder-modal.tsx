"use client";

import React, { useState } from "react";
import { Send, CheckCircle2, AlertTriangle, Users, MessageSquare, Sparkles, Clock, ShieldAlert } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Invoice } from "@/types";
import { KostStorage } from "@/lib/storage";
import { formatDateIndo, formatRupiah } from "@/lib/utils";
import { WhatsAppTemplates, ReminderStage, sendWebhookToN8n } from "@/lib/n8n/webhook-client";
import { notify } from "@/lib/notify";

interface BroadcastReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  unpaidInvoices: Invoice[];
  onSuccess: () => void;
}

export function BroadcastReminderModal({
  isOpen,
  onClose,
  unpaidInvoices,
  onSuccess,
}: BroadcastReminderModalProps) {
  const [stage, setStage] = useState<ReminderStage>("due_today");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sentCount, setSentCount] = useState(0);

  const totalUnpaidNominal = unpaidInvoices.reduce((s, i) => s + i.total_amount, 0);

  const handleStartBroadcast = async () => {
    if (unpaidInvoices.length === 0) return;
    setIsBroadcasting(true);
    setProgress(0);
    setSentCount(0);

    const paymentAccounts = KostStorage.getPaymentMethods();
    const webhookUrl =
      process.env.NEXT_PUBLIC_N8N_WEBHOOK_INVOICE_REMINDER ||
      "https://n8n.webhook.internal/invoice-reminder";

    let count = 0;
    for (const inv of unpaidInvoices) {
      const msg = WhatsAppTemplates.invoiceReminder(
        {
          tenant_name: inv.tenant_name || "Penghuni",
          tenant_phone: inv.tenant_phone || "",
          room_number: inv.room_number || "-",
          invoice_number: inv.invoice_number,
          due_date: formatDateIndo(inv.due_date),
          subtotal_rent: inv.subtotal_rent,
          additional_fees: inv.additional_fees,
          total_amount: inv.total_amount,
          payment_accounts: paymentAccounts,
        },
        stage
      );

      await sendWebhookToN8n(webhookUrl, {
        event: "invoice.broadcast_sent",
        payload: {
          invoice_number: inv.invoice_number,
          tenant_phone: inv.tenant_phone,
          reminder_stage: stage,
          formatted_message: msg,
        },
      });

      KostStorage.recordInvoiceReminder(inv.id, stage);
      count++;
      setSentCount(count);
      setProgress(Math.round((count / unpaidInvoices.length) * 100));

      // Small delay between webhook dispatches
      await new Promise((r) => setTimeout(r, 400));
    }

    setIsBroadcasting(false);
    notify.success(
      "Broadcast Selesai",
      `Berhasil mengirim pesan pengingat tagihan ke ${count} penghuni kamar via n8n automation.`
    );
    onSuccess();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Broadcast Pengingat Tagihan Massal (n8n)"
      description="Kirimkan notifikasi tagihan serentak ke seluruh penghuni yang belum melunasi sewa."
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Recipient Overview Banner */}
        <div className="rounded-3xl border border-neutral-800 bg-[#0A0A0A] p-5 shadow-spatial text-white">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Penerima Siap Broadcast
              </span>
              <p className="mt-1 text-2xl font-black text-[#D9FF43]">
                {unpaidInvoices.length} Penghuni Kamar
              </p>
              <p className="text-xs text-neutral-300 mt-0.5">
                Total Tertagih: <span className="font-bold">{formatRupiah(totalUnpaidNominal)}</span>
              </p>
            </div>
            <span className="rounded-2xl bg-white/10 p-3 text-[#D9FF43] backdrop-blur-md">
              <Users className="h-6 w-6" />
            </span>
          </div>
        </div>

        {/* Strategy Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
            Pilih Template Pesan Pengingat Massal:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setStage("h3_friendly")}
              className={`p-3 rounded-2xl border text-left transition-all ${
                stage === "h3_friendly"
                  ? "bg-emerald-500/10 border-emerald-500 text-emerald-950 dark:text-emerald-300 shadow-spatial"
                  : "bg-white border-neutral-200 hover:border-neutral-300 dark:bg-neutral-800 dark:border-neutral-700"
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
                <Sparkles className="h-3.5 w-3.5" />
                <span>H-3 Pengingat Ramah</span>
              </div>
              <p className="text-[10px] text-neutral-500 mt-1">
                Pemberitahuan santun sebelum batas tempo
              </p>
            </button>

            <button
              type="button"
              onClick={() => setStage("due_today")}
              className={`p-3 rounded-2xl border text-left transition-all ${
                stage === "due_today"
                  ? "bg-amber-500/10 border-amber-500 text-amber-950 dark:text-amber-300 shadow-spatial"
                  : "bg-white border-neutral-200 hover:border-neutral-300 dark:bg-neutral-800 dark:border-neutral-700"
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-600 dark:text-amber-400">
                <Clock className="h-3.5 w-3.5" />
                <span>Hari-H Jatuh Tempo</span>
              </div>
              <p className="text-[10px] text-neutral-500 mt-1">
                Pengingat batas akhir pembayaran hari ini
              </p>
            </button>

            <button
              type="button"
              onClick={() => setStage("overdue_stage1")}
              className={`p-3 rounded-2xl border text-left transition-all ${
                stage === "overdue_stage1"
                  ? "bg-rose-500/10 border-rose-500 text-rose-950 dark:text-rose-300 shadow-spatial"
                  : "bg-white border-neutral-200 hover:border-neutral-300 dark:bg-neutral-800 dark:border-neutral-700"
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-black text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Peringatan Menunggak</span>
              </div>
              <p className="text-[10px] text-neutral-500 mt-1">
                Teguran keterlambatan pelunasan sewa
              </p>
            </button>
          </div>
        </div>

        {/* Recipients List Preview */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
            Daftar Kamar yang Akan Menerima Pesan:
          </label>
          <div className="max-h-48 overflow-y-auto rounded-2xl border border-neutral-200 bg-neutral-50 p-2 dark:bg-neutral-800/60 dark:border-neutral-700 space-y-1.5">
            {unpaidInvoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-xl bg-white p-2.5 text-xs border border-neutral-200/70 dark:bg-neutral-900 dark:border-neutral-700"
              >
                <div>
                  <span className="font-extrabold text-neutral-900 dark:text-white">
                    Kamar {inv.room_number}
                  </span>{" "}
                  <span className="text-neutral-500">· {inv.tenant_name} ({inv.tenant_phone})</span>
                </div>
                <span className="font-mono font-bold text-neutral-900 dark:text-[#D9FF43]">
                  {formatRupiah(inv.total_amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Bar when Broadcasting */}
        {isBroadcasting && (
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs font-bold text-neutral-600 dark:text-neutral-300">
              <span>Mengirim Webhook n8n...</span>
              <span>{sentCount} / {unpaidInvoices.length} ({progress}%)</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
              <div
                className="h-full bg-[#D9FF43] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4 dark:border-white/10">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isBroadcasting}
            onClick={onClose}
            className="text-xs font-bold"
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="lime"
            size="sm"
            disabled={isBroadcasting || unpaidInvoices.length === 0}
            onClick={handleStartBroadcast}
            className="font-black text-xs shadow-lime-glow gap-1.5"
          >
            <Send className="h-4 w-4" />
            <span>{isBroadcasting ? "Sedang Mengirim..." : `Broadcast ke ${unpaidInvoices.length} Kamar ⚡`}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
