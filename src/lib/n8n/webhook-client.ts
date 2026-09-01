import { formatRupiah, formatTokenPLN } from "@/lib/utils";

export interface DispatchTokenPayload {
  tenant_name: string;
  tenant_phone: string; // E.164
  room_number: string;
  nominal_amount: number;
  token_code: string;
  kwh_units?: number;
  sent_at: string;
}

export type ReminderStage = "h3_friendly" | "due_today" | "overdue_stage1" | "overdue_final" | "custom";

export interface DispatchInvoiceReminderPayload {
  tenant_name: string;
  tenant_phone: string;
  room_number: string;
  invoice_number: string;
  due_date: string;
  subtotal_rent: number;
  additional_fees: number;
  total_amount: number;
  payment_accounts: { bank_name: string; account_number?: string; account_holder?: string }[];
  reminder_stage?: ReminderStage;
  custom_note?: string;
}

export interface DispatchPaymentReceiptPayload {
  tenant_name: string;
  tenant_phone: string;
  room_number: string;
  invoice_number: string;
  amount_paid: number;
  payment_method: string;
  paid_at: string;
}

/**
 * Generate formatted WhatsApp message templates
 */
export const WhatsAppTemplates = {
  electricityToken: (p: DispatchTokenPayload) => {
    return `⚡ *TOKEN LISTRIK PLN - KOST* ⚡

Halo Kak *${p.tenant_name}* (Kamar ${p.room_number}),
Berikut adalah 20 digit kode token listrik PLN Anda:

🔑 *${formatTokenPLN(p.token_code)}*
Nominal: ${formatRupiah(p.nominal_amount)} ${p.kwh_units ? `(~${p.kwh_units} kWh)` : ""}

*Cara Pengisian di Meteran:*
1. Ketik 20 digit kode di atas pada keypad meteran.
2. Tekan tombol ENTER (tanda panah/merah).
3. Pastikan layar menampilkan tulisan "BENAR" atau "ACCEPT".

Jika ada kendala saat penginputan, silakan hubungi pengelola kost. Terima kasih! 🙏`;
  },

  invoiceReminder: (p: DispatchInvoiceReminderPayload, stage: ReminderStage = "h3_friendly") => {
    const accList = p.payment_accounts
      .filter((a) => a.account_number)
      .map((a) => `• ${a.bank_name}: *${a.account_number}* (a.n ${a.account_holder})`)
      .join("\n");

    const activeAccText = accList || "• Hubungi Admin / Penjaga Kost";

    if (stage === "h3_friendly") {
      return `👋 *PENGINGAT RAMAH: TAGIHAN SEWA KOST (H-3)* 👋

Halo Kak *${p.tenant_name}* (Kamar ${p.room_number}),
Semoga harinya menyenangkan! Kami menginformasikan bahwa tagihan sewa kamar kost Anda akan jatuh tempo dalam *3 hari* (${p.due_date}).

📄 No. Invoice: *${p.invoice_number}*
📅 Jatuh Tempo: *${p.due_date}*
💵 Biaya Pokok: ${formatRupiah(p.subtotal_rent)}
${p.additional_fees > 0 ? `➕ Biaya/Token: ${formatRupiah(p.additional_fees)}\n` : ""}💰 *TOTAL TAGIHAN: ${formatRupiah(p.total_amount)}*

*Pilihan Rekening Pembayaran (Transfer/QRIS):*
${activeAccText}

Jika sudah melakukan pembayaran, mohon kirimkan bukti transfer ke pesan ini. Terima kasih banyak Kak! 🙏✨`;
    }

    if (stage === "due_today") {
      return `⏰ *PEMBERITAHUAN: HARI INI JATUH TEMPO SEWA KOST* ⏰

Halo Kak *${p.tenant_name}* (Kamar ${p.room_number}),
Hari ini (*${p.due_date}*) adalah batas waktu pembayaran sewa kamar kost Anda:

📄 No. Invoice: *${p.invoice_number}*
📅 Batas Akhir: *Hari ini (${p.due_date})*
💰 *TOTAL TAGIHAN: ${formatRupiah(p.total_amount)}*

*Pilihan Rekening Pembayaran:*
${activeAccText}

Mohon segera menyelesaikan transaksi hari ini dan kirimkan struk transfer agar dapat langsung diverifikasi pengelola. Terima kasih atas kerjasamanya! 🙏`;
    }

    if (stage === "overdue_stage1") {
      return `⚠️ *PERINGATAN: TAGIHAN SEWA TELAH MELEWATI JATUH TEMPO* ⚠️

Kepada Yth. Kak *${p.tenant_name}* (Kamar ${p.room_number}),
Menurut catatan sistem kami, tagihan sewa kamar Anda telah *MELEWATI BATAS WAKTU JATUH TEMPO* (${p.due_date}).

📄 No. Invoice: *${p.invoice_number}*
⚠️ Status: *MENUNGGAK (OVERDUE)*
💸 *Total Kewajiban: ${formatRupiah(p.total_amount)}*

*Tujuan Rekening Pembayaran:*
${activeAccText}

Mohon segera melakukan pelunasan dan mengirimkan konfirmasi pembayaran ke pengelola kost untuk menghindari denda keterlambatan. Terima kasih. 🙏`;
    }

    if (stage === "overdue_final") {
      return `🚨 *PERINGATAN RESMI: TUNGGAKAN SEWA & PENERTIBAN KAMAR* 🚨

Kepada Sdr/i *${p.tenant_name}* (Kamar ${p.room_number}),
Pemberitahuan resmi mengenai tagihan sewa kamar kost Anda yang belum terselesaikan hingga saat ini:

📄 No. Invoice: *${p.invoice_number}*
📅 Jatuh Tempo Terlewat: *${p.due_date}*
💸 *TOTAL TUNGGAKAN: ${formatRupiah(p.total_amount)}*

*Tujuan Pembayaran:*
${activeAccText}

Harap segera menyelesaikan pembayaran dalam waktu 1x24 jam atau hubungi kantor pengelola untuk konfirmasi. Pengabaian pesan ini dapat berakibat pada penonaktifan fasilitas kamar. Terima kasih.`;
    }

    // Default / Custom
    return `📢 *PENGINGAT TAGIHAN SEWA KOST* 📢

Halo Kak *${p.tenant_name}* (Kamar ${p.room_number}),
Tagihan sewa kost Anda telah terbit dengan rincian sbb:

📄 No. Invoice: *${p.invoice_number}*
📅 Jatuh Tempo: *${p.due_date}*
💵 Biaya Sewa Pokok: ${formatRupiah(p.subtotal_rent)}
${p.additional_fees > 0 ? `➕ Biaya Tambahan / Token: ${formatRupiah(p.additional_fees)}\n` : ""}💰 *TOTAL TAGIHAN: ${formatRupiah(p.total_amount)}*
${p.custom_note ? `\nCatatan: ${p.custom_note}\n` : ""}
*Pilihan Pembayaran:*
${activeAccText}

Mohon konfirmasi & kirim bukti transfer ke nomor ini setelah melakukan pembayaran. Terima kasih! 🙏`;
  },

  paymentReceipt: (p: DispatchPaymentReceiptPayload) => {
    return `🧾 *KUITANSI PEMBAYARAN KOST (LUNAS)* 🧾

Terima kasih Kak *${p.tenant_name}* (Kamar ${p.room_number}),
Pembayaran sewa Anda telah kami verifikasi dengan rincian:

• No. Invoice: *${p.invoice_number}*
• Jumlah Dibayar: *${formatRupiah(p.amount_paid)}*
• Metode: ${p.payment_method}
• Status: *LUNAS (PAID) ✅*
• Waktu: ${new Date(p.paid_at).toLocaleString("id-ID")}

Pesan ini berfungsi sebagai bukti pembayaran resmi kost. Terima kasih atas kerjasamanya! 🙏`;
  },
};

/**
 * Trigger n8n Webhook
 */
export async function sendWebhookToN8n(endpointUrl: string, payload: Record<string, unknown>) {
  try {
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status: ${response.status}`);
    }

    return { success: true, message: "Webhook n8n berhasil dikirim" };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal terhubung ke webhook n8n";
    console.warn("n8n Webhook notice:", message);
    return { success: false, message };
  }
}
