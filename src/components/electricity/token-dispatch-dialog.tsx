"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ElectricityTransaction } from "@/types";
import { KostApiClient } from "@/lib/api-client";
import {
  WhatsAppTemplates,
  sendWebhookToN8n,
} from "@/lib/n8n/webhook-client";
import { Send, Copy, Check, ExternalLink, Zap } from "lucide-react";

interface TokenDispatchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: ElectricityTransaction | null;
  onSentSuccess?: () => void;
}

export function TokenDispatchDialog({
  isOpen,
  onClose,
  transaction,
  onSentSuccess,
}: TokenDispatchDialogProps) {
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  if (!transaction) return null;

  const payload = {
    tenant_name: transaction.tenant_name || "Penghuni",
    tenant_phone: transaction.tenant_phone || "",
    room_number: transaction.room_number || "-",
    nominal_amount: transaction.nominal_amount,
    token_code: transaction.token_code,
    kwh_units: transaction.kwh_units,
    sent_at: new Date().toISOString(),
  };

  const messageText = WhatsAppTemplates.electricityToken(payload);

  const handleCopyText = () => {
    navigator.clipboard.writeText(messageText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleTriggerWebhook = async () => {
    setIsSendingWebhook(true);
    setStatusMessage({ type: "info", text: "Mengirim ke Webhook n8n..." });

    const webhookUrl =
      process.env.NEXT_PUBLIC_N8N_WEBHOOK_DISPATCH_TOKEN ||
      "https://n8n.webhook.internal/token-dispatch";

    const res = await sendWebhookToN8n(webhookUrl, {
      event: "electricity.token_dispatched",
      payload,
      formatted_message: messageText,
    });

    setIsSendingWebhook(false);
    try {
      await KostApiClient.updateElectricityTransaction(transaction.id, { sent_at: new Date().toISOString() });
    } catch {}

    if (res.success) {
      setStatusMessage({
        type: "success",
        text: "Webhook n8n berhasil terkirim! Pesan diteruskan ke nomor WhatsApp penghuni.",
      });
    } else {
      // Graceful fallback notice
      setStatusMessage({
        type: "info",
        text: "Pemberitahuan: n8n webhook mode lokal/fallback. Anda dapat menyalin teks langsung ke WhatsApp.",
      });
    }

    if (onSentSuccess) onSentSuccess();
  };

  const waDirectUrl = `https://wa.me/${(transaction.tenant_phone || "").replace(
    /[^\d]/g,
    ""
  )}?text=${encodeURIComponent(messageText)}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dispatch Token Listrik via WhatsApp"
      description="Kirim 20 digit kode token langsung ke WhatsApp penghuni via webhook n8n atau salin teks manual."
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Recipient info */}
        <div className="flex items-center justify-between rounded-2xl border border-neutral-200/80 bg-neutral-50 p-3.5 text-xs dark:bg-neutral-800/60 dark:border-white/10">
          <div>
            <p className="font-extrabold text-neutral-900 dark:text-white">
              Kamar {transaction.room_number} • {transaction.tenant_name}
            </p>
            <p className="text-neutral-500 font-medium">{transaction.tenant_phone}</p>
          </div>
          <span className="rounded-full bg-[#D9FF43] px-3 py-1 text-[11px] font-extrabold text-[#0A0A0A]">
            Token PLN
          </span>
        </div>

        {/* WhatsApp Message Preview */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
            Pratinjau Format Pesan WhatsApp:
          </label>
          <div className="mt-1.5 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 font-mono text-xs whitespace-pre-wrap text-neutral-900 dark:bg-neutral-800/80 dark:border-neutral-700 dark:text-neutral-100">
            {messageText}
          </div>
        </div>

        {/* Status Alert Message */}
        {statusMessage && (
          <div
            className={`rounded-2xl p-3.5 text-xs font-semibold ${
              statusMessage.type === "success"
                ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200"
                : statusMessage.type === "error"
                ? "bg-rose-100 text-rose-900"
                : "bg-neutral-100 text-neutral-900 border border-neutral-200 dark:bg-neutral-800 dark:text-white"
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
          {/* Fallback Copy */}
          <Button
            type="button"
            variant="outline"
            onClick={handleCopyText}
            className="gap-1.5 text-xs font-bold"
          >
            {isCopied ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" />
                <span className="text-emerald-600 font-bold">Tersalin ke Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Salin Pesan WA</span>
              </>
            )}
          </Button>

          {/* Open WhatsApp Web Direct */}
          <a
            href={waDirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-bold text-neutral-900 hover:bg-neutral-50 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Buka WhatsApp ↗</span>
          </a>

          {/* Trigger n8n Webhook */}
          <Button
            type="button"
            variant="lime"
            disabled={isSendingWebhook}
            onClick={handleTriggerWebhook}
            className="gap-1.5 text-xs font-black shadow-lime-glow"
          >
            <Send className="h-4 w-4" />
            <span>{isSendingWebhook ? "Mengirim..." : "Kirim via n8n ⚡"}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
