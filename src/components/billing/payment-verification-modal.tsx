"use client";

import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FinanceWallet, Invoice } from "@/types";
import { FinanceApi } from "@/lib/finance-api";
import { invoicePaymentSummary, walletCategoryLabel } from "@/lib/finance";
import { formatRupiah, formatRupiahInput, parseRupiahInput } from "@/lib/utils";
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
  const [verifiedBy, setVerifiedBy] = useState("Admin Kost");
  const [proofUrl, setProofUrl] = useState(
    "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&auto=format&fit=crop&q=80"
  );
  const [notes, setNotes] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [wallets, setWallets] = useState<FinanceWallet[]>([]);
  const [walletId, setWalletId] = useState("");
  const [amount, setAmount] = useState(0);
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const summary = invoice ? invoicePaymentSummary(invoice) : { paid: 0, outstanding: 0, settled: false };
  const selectedWallet = wallets.find((wallet) => wallet.id === walletId);

  useEffect(() => {
    if (!isOpen || !invoice) return;
    let cancelled = false;
    setAmount(summary.outstanding);
    setError("");
    setLoadingWallets(true);
    FinanceApi.getWallets(invoice.property_id)
      .then((rows) => {
        if (cancelled) return;
        const eligible = rows.filter((wallet) => wallet.property_id === invoice.property_id && wallet.wallet_kind !== "liability");
        setWallets(eligible);
        setWalletId((current) => eligible.some((wallet) => wallet.id === current) ? current : eligible.find((wallet) => wallet.is_default)?.id || eligible[0]?.id || "");
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Wallet tidak dapat dimuat.");
      })
      .finally(() => { if (!cancelled) setLoadingWallets(false); });
    return () => { cancelled = true; };
  }, [isOpen, invoice?.id, invoice?.property_id, summary.outstanding]);

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
    amount_paid: amount,
    payment_method: selectedWallet?.name || "Belum dipilih",
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
    if (!walletId || !selectedWallet) { setError("Pilih wallet penerimaan terlebih dahulu."); return; }
    if (!Number.isFinite(amount) || amount <= 0 || amount > summary.outstanding) { setError("Nominal harus positif dan tidak boleh melebihi sisa tagihan."); return; }

    try {
      setError("");
      setIsSaving(true);
      await FinanceApi.recordInvoicePayment({
        invoice_id: invoice.id,
        amount_paid: amount,
        wallet_id: walletId,
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
    } catch (err: any) {
      setError(err?.message || "Pembayaran gagal dicatat.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Verifikasi Pembayaran: ${invoice.invoice_number}`}
      description="Catat nominal yang benar-benar diterima ke wallet yang sesuai. Pembayaran dapat dilakukan sebagian."
      maxWidth="md"
    >
      <form onSubmit={handleVerify} className="space-y-4">
        {/* Invoice Summary */}
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4 text-xs dark:bg-neutral-800/60 dark:border-white/10">
          <div className="flex items-center justify-between gap-3">
            <span className="text-neutral-500 font-medium">Penyewa & kamar</span>
            <span className="text-right font-extrabold text-neutral-900 dark:text-white">{invoice.tenant_name || "Penghuni"} · {invoice.room_number || "—"}</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 border-t border-neutral-200/80 pt-2 text-[11px] dark:border-white/10">
            <div><span className="block text-neutral-500">Tagihan</span><strong className="mt-1 block text-neutral-900 dark:text-white">{formatRupiah(invoice.total_amount)}</strong></div>
            <div><span className="block text-neutral-500">Sudah dibayar</span><strong className="mt-1 block text-neutral-900 dark:text-white">{formatRupiah(summary.paid)}</strong></div>
            <div><span className="block text-neutral-500">Sisa</span><strong className="mt-1 block text-neutral-900 dark:text-[#D9FF43]">{formatRupiah(summary.outstanding)}</strong></div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">Nominal diterima <span className="text-rose-500">*</span>
            <input required type="text" inputMode="numeric" maxLength={20} value={formatRupiahInput(amount)} onChange={(event) => setAmount(parseRupiahInput(event.target.value))} className="mt-1 w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white" />
            <span className="mt-1 block font-normal text-neutral-500">Boleh dicicil · maksimum {formatRupiah(summary.outstanding)}</span>
          </label>
          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">Masuk ke wallet <span className="text-rose-500">*</span>
            <select required value={walletId} disabled={loadingWallets || !wallets.length} onChange={(event) => setWalletId(event.target.value)} className="mt-1 w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white">
              <option value="">{loadingWallets ? "Memuat wallet..." : "Pilih wallet / rekening"}</option>
              {wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{walletCategoryLabel(wallet)} · {wallet.name}</option>)}
            </select>
          </label>
        </div>
        {!wallets.length && !loadingWallets && <p className="rounded-xl border border-orange-300/20 bg-orange-300/5 p-3 text-xs text-orange-700 dark:text-orange-200">Belum ada wallet kas untuk properti ini. Tambahkan wallet di Keuangan → Transaksi → Rekening & Kas.</p>}

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

        {error && <p role="alert" className="text-xs text-rose-600 dark:text-rose-300">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4 dark:border-white/10">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={loadingWallets || isSaving || !wallets.length || summary.outstanding <= 0} variant="lime" className="gap-1.5 font-bold shadow-lime-glow">
            <CheckCircle2 className="h-4 w-4" />
            <span>{isSaving ? "Menyimpan..." : amount >= summary.outstanding ? "Catat & Lunas" : "Catat Pembayaran"}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
