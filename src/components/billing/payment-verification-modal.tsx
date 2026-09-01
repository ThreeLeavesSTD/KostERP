"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Invoice } from "@/types";
import { KostStorage } from "@/lib/storage";
import { formatRupiah } from "@/lib/utils";
import {
  WhatsAppTemplates,
  sendWebhookToN8n,
} from "@/lib/n8n/webhook-client";
import { CheckCircle2, UploadCloud, Send, Copy, Check } from "lucide-react";

interface PaymentVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSuccess: () => void;
}

export function PaymentVerificationModal({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}: PaymentVerificationModalProps) {
  const [paymentMethod, setPaymentMethod] = useState("BCA Transfer");
  const [verifiedBy, setVerifiedBy] = useState("Admin Kost");
  const [proofUrl, setProofUrl] = useState(
    "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&auto=format&fit=crop&q=80"
  );
  const [notes, setNotes] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  if (!invoice) return null;

  const handleSimulateProofUpload = () => {
    setProofUrl(
      "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&auto=format&fit=crop&q=80"
    );
  };

  const receiptPayload = {
    tenant_name: invoice.tenant_name || "Penghuni",
    tenant_phone: invoice.tenant_phone || "",
    room_number: invoice.room_number || "-",
    invoice_number: invoice.invoice_number,
    amount_paid: invoice.total_amount,
    payment_method: paymentMethod,
    paid_at: new Date().toISOString(),
  };

  const receiptMessage = WhatsAppTemplates.paymentReceipt(receiptPayload);

  const handleCopyReceipt = () => {
    navigator.clipboard.writeText(receiptMessage);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    KostStorage.verifyPayment({
      invoice_id: invoice.id,
      amount_paid: invoice.total_amount,
      payment_method: paymentMethod,
      proof_url: proofUrl,
      verified_by: verifiedBy,
      notes,
    });

    // Optionally trigger n8n receipt webhook
    const webhookUrl =
      process.env.NEXT_PUBLIC_N8N_WEBHOOK_PAYMENT_RECEIPT ||
      "https://n8n.webhook.internal/payment-receipt";

    sendWebhookToN8n(webhookUrl, {
      event: "payment.verified",
      payload: receiptPayload,
      formatted_message: receiptMessage,
    });

    onSuccess();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Verifikasi Pembayaran: ${invoice.invoice_number}`}
      description="Tinjau bukti transfer, pilih metode pembayaran, dan terbitkan kuitansi digital lunas."
      maxWidth="md"
    >
      <form onSubmit={handleVerify} className="space-y-4">
        {/* Invoice Summary */}
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4 text-xs dark:bg-neutral-800/60 dark:border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-neutral-500 font-medium">Penyewa & Kamar:</span>
            <span className="font-extrabold text-neutral-900 dark:text-white">
              {invoice.tenant_name} (Kamar {invoice.room_number})
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-neutral-200/80 pt-2 dark:border-white/10">
            <span className="text-neutral-500 font-medium">Total Tagihan:</span>
            <span className="text-base font-black text-neutral-900 dark:text-white">
              {formatRupiah(invoice.total_amount)}
            </span>
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
            Metode Pembayaran Masuk <span className="text-rose-500">*</span>
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
          >
            <option value="BCA Transfer">BCA Transfer</option>
            <option value="Mandiri Transfer">Mandiri Transfer</option>
            <option value="BRI Transfer">BRI Transfer</option>
            <option value="QRIS">QRIS Instan</option>
            <option value="Tunai / Cash">Tunai / Cash (Diterima Admin)</option>
          </select>
        </div>

        {/* Proof of Payment Preview */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
            Bukti Struk Transfer / Kuitansi
          </label>
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={handleSimulateProofUpload}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-2.5 text-xs font-bold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 transition-colors"
            >
              <UploadCloud className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
              <span>{proofUrl ? "Bukti Terlampir (Demo)" : "Upload Bukti Transfer"}</span>
            </button>
            {proofUrl && (
              <span className="flex items-center gap-1 text-xs font-bold text-neutral-900 dark:text-[#D9FF43]">
                <CheckCircle2 className="h-4 w-4" />
                <span>Terlampir</span>
              </span>
            )}
          </div>
        </div>

        {/* Verified By & Notes */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Diverifikasi Oleh
            </label>
            <input
              type="text"
              value={verifiedBy}
              onChange={(e) => setVerifiedBy(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-3.5 py-2 text-xs font-medium dark:bg-neutral-800 dark:border-neutral-700 dark:text-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Catatan Internal
            </label>
            <input
              type="text"
              placeholder="Sesuai mutasi bank"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-3.5 py-2 text-xs font-medium dark:bg-neutral-800 dark:border-neutral-700 dark:text-white focus:outline-none"
            />
          </div>
        </div>

        {/* WhatsApp Receipt Preview */}
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3.5 text-xs dark:bg-neutral-800/50 dark:border-white/10">
          <div className="flex items-center justify-between">
            <span className="font-bold text-neutral-900 dark:text-white">
              Format Kuitansi Digital WA:
            </span>
            <button
              type="button"
              onClick={handleCopyReceipt}
              className="flex items-center gap-1 font-bold text-neutral-900 hover:underline text-[11px] dark:text-[#D9FF43]"
            >
              {isCopied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              <span>{isCopied ? "Tersalin!" : "Salin Kuitansi"}</span>
            </button>
          </div>
          <p className="mt-1.5 text-[11px] font-mono text-neutral-500 whitespace-pre-wrap dark:text-neutral-400">
            {receiptMessage.slice(0, 150)}...
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4 dark:border-white/10">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant="lime" className="gap-1.5 font-bold shadow-lime-glow">
            <CheckCircle2 className="h-4 w-4" />
            <span>Verifikasi & Tandai Lunas</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
