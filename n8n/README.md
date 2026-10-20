# Chatbot Kost ERP

Workflow tersimpan: [Kost ERP - Chatbot Concierge AI](https://n8n.noud.web.id/workflow/x3bREDqBdkVrxlio).

Status: draft, belum aktif. Validasi 23 node berhasil. Uji input kosong berhasil. Uji AI pada 7 Oktober 2026 berhenti dengan HTTP 401: `Authentication Error, Key is blocked`.

## Alur

POST webhook `kostChatbotz` → normalisasi pesan dan sesi → validasi 1–4000 karakter → AI Agent dengan 14 tools baca Supabase, kalkulator dan memori → balasan JSON.

Kredensial database: **Kost ERP** (`supabaseApi`). Daftar tabel dan kolom berhasil dibaca langsung melalui kredensial ini.

Kredensial model: **OpenAI account** (`openAiApi`). Saat diuji, kredensial memakai endpoint kompatibel OpenAI `https://ai.sumopod.com/v1`, dan kuncinya diblokir oleh penyedia tersebut. Perbaiki atau ganti kunci langsung di halaman Credentials n8n, lalu uji ulang sebelum Publish.

Workflow menggunakan model `gpt-4.1-mini`; akses model pada endpoint tersebut belum dapat dikonfirmasi karena autentikasi ditolak.

## Data ERP

Tools membaca `properties`, `rooms`, `room_types`, `tenant_directory`, `leases`, `invoices`, `payments`, `electricity_transactions`, `room_complaints`, `finance_wallets`, `cash_transactions`, `leads`, `survey_schedules`, dan `payment_methods_config`.

Operasi tool hanya `getAll`. Direktori penghuni memakai view `tenant_directory`, yang tidak memuat NIK atau foto KTP. Data dibaca kembali ketika pertanyaan membutuhkan informasi ERP terbaru. Tools mengambil seluruh baris dengan urutan stabil; volume data besar dapat memerlukan optimasi query dan ringkasan.

## Kontrak aplikasi

Production URL setelah Publish: `https://n8n.noud.web.id/webhook/kostChatbotz`.

Test URL ketika n8n menunggu test webhook: `https://n8n.noud.web.id/webhook-test/kostChatbotz`.

Payload:

```json
{
  "message": "Kamar mana yang kosong?",
  "chatInput": "Kamar mana yang kosong?",
  "sessionId": "ID-percakapan-unik",
  "context": {}
}
```

Balasan:

```json
{
  "success": true,
  "reply": "Jawaban dari AI berdasarkan hasil tools ERP",
  "output": "Jawaban dari AI berdasarkan hasil tools ERP",
  "actionType": "general",
  "source": "n8n_webhook",
  "sessionId": "kost-erp:ID-percakapan-unik"
}
```

Helper aplikasi sekarang mengirim sesi unik per akun dan tab browser. Timeout delegasi ke backend dinaikkan menjadi 35 detik agar tidak mengirim permintaan kedua setelah AI berjalan lebih dari 4 detik. Pemeriksaan `npx tsc --noEmit --incremental false` berhasil.

## Berkas

- `kost-erp-chatbot.sdk.js`: sumber Workflow SDK yang sudah divalidasi.
- `kost-erp-chatbot.json`: ekspor workflow untuk import melalui n8n. Berisi referensi kredensial, tanpa API key; pilih kembali kredensial jika diimpor ke instance lain.

## Menjalankan

1. Perbaiki kredensial **OpenAI account** langsung di n8n, termasuk endpoint dan izin model.
2. Uji pertanyaan kamar kosong dan tagihan dengan data ERP nyata.
3. Publish workflow untuk mendaftarkan production webhook.
4. Gunakan chatbot Kost ERP; URL aplikasi sudah sesuai.

Contoh pertanyaan: "Berapa kamar kosong?", "Tagihan mana yang jatuh tempo?", "Ringkas arus kas bulan ini", "Keluhan apa yang belum selesai?", dan "Siapa yang dijadwalkan survei minggu ini?".
