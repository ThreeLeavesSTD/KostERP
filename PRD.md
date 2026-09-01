# Product Requirement Document (PRD)

## Sistem ERP Operasional Kost

---

## 1. Ringkasan Produk

ERP Operasional Kost adalah platform manajemen internal berbasis web responsif untuk mengotomatisasi pencatatan data penghuni, status kamar, penjualan token listrik internal, penagihan sewa, dan laporan keuangan bagi pemilik kost (Owner) dan staf pengelola (Admin). Sistem ini dirancang *multi-tenant ready* berbasis properti tunggal agar mudah diimplementasikan kembali ke klien lain di masa mendatang.

---

## 2. Aktor & Hak Akses

| Peran | Tanggung Jawab Utama | Akses Modul |
| :--- | :--- | :--- |
| **Owner** | Pemilik bisnis / pembuat keputusan | Akses penuh ke seluruh modul sistem (Semua menu Admin + Dashboard finansial, ringkasan okupansi, konfigurasi rekening pembayaran, laporan audit). |
| **Admin / Karyawan** | Operasional harian lapangan | Input/edit kamar, input data penghuni, input token listrik, verifikasi pembayaran, trigger notifikasi manual. |
| **Staff Bersih-bersih** | Menjaga kebersihan dan perawatan | Hanya melihat daftar kamar untuk update status perawatan & kebersihan kamar. |

*Sistem dilengkapi dengan fitur otentikasi (Login) yang memisahkan sesi masing-masing aktor menggunakan kredensial (Username/Password).*

---

## 3. Spesifikasi Fitur Utama

### A. Dashboard Owner (`/owner/dashboard`)

* **KPI Metrics:**
  * **Tingkat Okupansi**: Kamar Terisi / Total Kamar dlm %.
  * **Pendapatan Sewa Bulanan**: Terkumpul vs Target.
  * **Total Tunggakan**: Daftar & total nominal unpaid invoice.
  * **Laba Penjualan Token Listrik**: Margin harga jual vs harga beli.
* **Ringkasan Finansial:** Log arus kas masuk terverifikasi, riwayat pembayaran per periode, serta ekspor laporan (CSV/Excel).

### B. Manajemen Kamar (`/admin/rooms`)

* **Inventaris Kamar:** Penomoran kamar, tipe kamar, lantai, dan harga sewa bulanan.
* **Status Kamar (Real-time):**
  * `Tersedia` (Hijau)
  * `Terisi` (Biru)
  * `Perbaikan/Maintenance` (Kuning)
* **Katalog Fasilitas:** Tagging fasilitas bawaan (AC, Kasur, Kamar Mandi Dalam, dll).

### C. Manajemen Penghuni & Kontrak (`/admin/tenants`)

* **Data Diri:** Nama lengkap, nomor WhatsApp (format E.164 untuk n8n), NIK, kontak darurat, dan file upload foto KTP.
* **Manajemen Sewa (Leases):**
  * Mapping Penghuni $\leftrightarrow$ Kamar.
  * Tanggal mulai sewa, durasi sewa, dan tanggal penagihan bulanan (*billing cycle day*).
  * Nominal deposit jaminan awal.
  * Status kontrak: `Aktif`, `Selesai`, `Dibatalkan`.

### D. Penjualan & Distribusi Token Listrik (`/admin/electricity`)

* **Pencatatan Token:** Form input pembelian token oleh penghuni (Nomor Kamar, Nominal/kWh, 20 Digit Kode Token PLN, Harga Beli, Harga Jual).
* **Metode Bayar Token:** Bayar langsung (*Cash/Transfer*) atau Ditagihkan ke invoice bulanan.
* **Auto-Dispatch WhatsApp:** Tombol aksi kirim token langsung ke WhatsApp penghuni via webhook n8n setelah status terbayar.

### E. Penagihan & Pembayaran Fleksibel (`/admin/billing`)

* **Sistem Invoice:**
  * Generate invoice otomatis sesuai tanggal jatuh tempo bulanan penghuni.
  * Komponen tagihan: Harga sewa pokok + biaya tambahan/token listrik (jika ada).
* **Konfigurasi Metode Pembayaran (Custom Payment):**
  * Admin/Owner dapat mengatur metode: Tunai, Transfer Manual (BCA/Mandiri/BRI), QRIS, atau Payment Gateway Link.
  * Informasi nomor rekening dan panduan transfer muncul otomatis pada template invoice WA.
* **Verifikasi Pembayaran:**
  * Admin mengunggah/meninjau bukti transfer.
  * Status: `Unpaid` $\rightarrow$ `Paid` $\rightarrow$ `Overdue`.
  * Verifikasi mengubah status kamar dan men-trigger pesan kuitansi ke penghuni.

---

## 4. Alur Integrasi WhatsApp & n8n

```
┌─────────────────┐       ┌─────────────────┐       ┌────────────────────────┐
│  Supabase / App │──────▶│   n8n Webhook   │──────▶│ WhatsApp Provider API  │
│  (Trigger Event)│       │(Format Template)│       │   (Kirim ke Penghuni)  │
└─────────────────┘       └─────────────────┘       └────────────────────────┘
```

1. **Pengingat Jatuh Tempo (H-3 & Hari H):** Trigger terjadwal (CRON) mengirim data tagihan + nomor rekening tujuan ke n8n $\rightarrow$ dikirim via WhatsApp.
2. **Pengiriman Token Listrik:** Admin klik simpan & kirim token $\rightarrow$ n8n memformat 20 digit kode dan instruksi $\rightarrow$ dikirim instan ke WhatsApp penghuni.
3. **Konfirmasi Pembayaran:** Admin verifikasi bayar $\rightarrow$ n8n mengirim kuitansi digital ringkas via WhatsApp.

---

## 5. Skema Relasi Basis Data (PostgreSQL)

```
[properties]
   ├── [rooms] ────────┐
   │                   ├── [leases] ───┬─── [invoices] ─── [payments]
   └── [tenants] ──────┘               │
                                       └─── [electricity_transactions]
```

### Definisi Kolom Tabel:

* **`properties`**: `id`, `name`, `address`, `created_at`
* **`rooms`**: `id`, `property_id`, `room_number`, `floor`, `base_price`, `status`, `created_at`
* **`tenants`**: `id`, `property_id`, `full_name`, `phone_number`, `id_card_number`, `id_card_url`, `emergency_contact (JSONB)`
* **`leases`**: `id`, `property_id`, `room_id`, `tenant_id`, `start_date`, `end_date`, `billing_cycle_day`, `deposit_amount`, `status`
* **`invoices`**: `id`, `property_id`, `lease_id`, `invoice_number`, `subtotal_rent`, `additional_fees`, `total_amount`, `due_date`, `status`
* **`payments`**: `id`, `invoice_id`, `amount_paid`, `payment_method`, `proof_url`, `verified_by`, `paid_at`
* **`electricity_transactions`**: `id`, `property_id`, `lease_id`, `token_code`, `cost_price`, `selling_price`, `payment_status`, `sent_at`

---

## 6. Pertanyaan untuk Improvement Sistem

1. **Mekanisme Stok Token Listrik:** Apakah admin memasukkan 20 digit kode token secara *on-demand* (beli baru saat ada pesanan) atau sistem perlu fitur *inventory pool* (stok token di-input di awal, lalu otomatis di-assign saat ada pembelian)?
2. **Format Pesan WhatsApp:** Apakah pesan WA cukup berupa teks rapi dengan tautan kuitansi, atau perlu n8n meng-generate file PDF kuitansi/invoice resmi sebagai lampiran dokumen?
3. **Pencatatan Biaya Operasional (Expenses):** Apakah perlu ditambahkan modul pencatatan pengeluaran harian kost (gaji penjaga, tagihan WiFi, air PAM, perbaikan) agar dashboard Owner bisa menampilkan laba bersih (*Net Profit*) secara akurat?

---

## 7. Roadmap Pengembangan & Prioritas Feature (Matrix)

| Fase | Fokus Fitur | Prioritas | Target Milestone |
| :--- | :--- | :--- | :--- |
| **Fase 1 (MVP)** | Database Penghuni (ID No HP), Modul Data Kamar, Check-In/Out, Billing Sewa Manual & Ops Expense basic. | **P0 (CRITICAL)** | Minggu 1 - 3 |
| **Fase 2 (Automasi)** | Integrasi n8n WhatsApp Alert, Pencatatan Token Listrik, Ticketing Komplain Staf. | **P1 (HIGH)** | Minggu 4 - 6 |
| **Fase 3 (Integrasi)** | Integrasi Payment Gateway Third-Party, Dashboard Analitik Cash Flow Owner lengkap. | **P2 (MEDIUM)** | Minggu 7 - 8 |
