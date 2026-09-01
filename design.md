# Dokumen Desain UI/UX Redesign: KOST ERP Pro
**Sistem ERP Operasional Kost & Distribusi Token Listrik**

---

## 1. Ringkasan Eksekutif & Visi Desain

Dokumen ini mendefinisikan panduan komprehensif untuk **Redesign UI/UX** aplikasi web **KOST ERP Pro** (Sistem ERP Operasional Kost). Desain baru mengadopsi estetika **Spatial Bento Grid & Capsule UI** modern kelas atas (*high-end modern automotive & luxury tech design*) berdasarkan referensi visual yang diberikan, dengan kombinasi warna kontras tinggi: **Electric Lime Green**, **Deep Obsidian Black**, **Architectural Soft Grey**, dan sentuhan **Frosted Glass (Glassmorphism)**.

> [!IMPORTANT]
> **Prinsip Utama Redesign:**
> 1. **100% Retensi Fitur & Fungsi**: Seluruh fungsionalitas, alur kerja (Owner, Admin, Cleaning Staff), state management (`localStorage` / Supabase), integrasi n8n WhatsApp Webhook, ekspor Excel, dan kalkulasi tarif/token dipertahankan secara utuh tanpa pengurangan.
> 2. **Peningkatan UX & Hirarki Visual**: Mengubah antarmuka tabel kaku tradisional menjadi susunan **Bento Grid** modular, **Capsule/Pill Navigation**, dan **Translucent Metric Overlays** yang intuitif, cepat diakses, dan responsif di berbagai ukuran layar.

---

## 2. Sistem Desain & Token Visual (Design Tokens)

### 2.1 Palet Warna Utama (Color Palette)

Berdasarkan referensi visual token, palet warna disusun dengan kontras presisi untuk memberikan kesan futuristik, premium, dan bersih:

```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│                 │ │                 │ │                 │ │                 │
│      WHITE      │ │   SOFT GREY     │ │   LIME GREEN    │ │  OBSIDIAN BLACK │
│     #FFFFFF     │ │     #F3F4F6     │ │     #D9FF43     │ │     #0A0A0A     │
│ RGB 255,255,255 │ │ RGB 243,244,246 │ │ RGB 217,255,67  │ │  RGB 10,10,10   │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
```

| Token Name | Hex Code | RGB | Tailwind Class / Variable | Fungsi & Penggunaan |
| :--- | :--- | :--- | :--- | :--- |
| **Accent Lime Green** | `#D9FF43` | `217, 255, 67` | `bg-[#D9FF43]`, `text-[#0A0A0A]` | Primary CTA highlight, tombol aksi aktif (*Ask/Kirim*), badge status siap huni, icon glowing highlight. |
| **Deep Obsidian Black** | `#0A0A0A` | `10, 10, 10` | `bg-[#0A0A0A]`, `text-white` | Dark Bento card, active navigation capsule, primary action buttons, dark floating docks. |
| **Architectural Canvas Grey** | `#F3F4F6` | `243, 244, 246` | `bg-[#F3F4F6]`, `dark:bg-[#0E0E10]` | Latar belakang kanvas aplikasi (*workspace backdrop*), container luar. |
| **Card Surface White** | `#FFFFFF` | `255, 255, 255` | `bg-white`, `dark:bg-[#141416]` | Permukaan kartu bento terang, modal dialog, formulir input. |
| **Frosted Glass Surface** | `rgba(255,255,255,0.75)` | `255, 255, 255, 0.75` | `backdrop-blur-md bg-white/75 border-white/40` | Floating metric pills, translucent floating badges di atas visual / kartu. |
| **Muted Slate Grey** | `#6B7280` / `#9CA3AF` | `107, 114, 128` | `text-gray-500`, `text-gray-400` | Subtitle mikro, label data sekunder, placeholder input. |
| **Border Neutral** | `#E5E7EB` / `rgba(0,0,0,0.06)`| `229, 231, 235` | `border-gray-200`, `dark:border-white/10` | Garis pemisah halus antar komponen dan bento card. |

### 2.2 Status Color Accents (Semantic Tokens)

* **Tersedia / Lunas / Sukses**: Electric Lime (`#D9FF43` / `bg-emerald-500`) dengan teks gelap kontras.
* **Terisi / Kontrak Aktif**: Deep Obsidian / Cobalt Blue (`#0A0A0A` / `#2563EB`).
* **Perbaikan / Maintenance / Pending**: Warm Amber (`#F59E0B` / `bg-amber-400`).
* **Tunggakan / Unpaid / Overdue**: Vivid Crimson (`#EF4444` / `bg-rose-500`).

---

### 2.3 Tipografi (Typography Hierarchy)

Menggunakan font modern sans-serif bergaya Neo-Grotesk (misalnya **Inter**, **Plus Jakarta Sans**, atau **Geist Sans**) dengan kontras bobot (*font weight*) yang tegas:

* **Hero / Display Title**: `text-2xl` s.d. `text-4xl`, `font-extrabold`, tracking rapat (`tracking-tight`), warna `#0A0A0A` (atau `#FFFFFF` pada kartu gelap).
* **Section Heading**: `text-lg` s.d. `text-xl`, `font-bold`, `tracking-tight`.
* **Card Subheading / Metric Value**: `text-base` s.d. `text-xl`, `font-bold`.
* **Body Text**: `text-sm`, `font-medium`, `text-gray-700` / `dark:text-gray-300`.
* **Microcopy & Caption**: `text-[11px]` s.d. `text-xs`, `font-semibold`, `tracking-wider`, `uppercase` pada label kategori.
* **Capsule Pills**: `text-xs` s.d. `text-sm`, `font-semibold`.

---

### 2.4 Bentuk, Radius, & Efek Visual (Shapes, Radius & Elevation)

* **Capsule & Pill Radii (`rounded-full`)**: Digunakan untuk top navigation bar, filter chips, tombol navigasi, dan floating quick action.
* **Bento Card Radii (`rounded-3xl` / 24px - 32px)**: Digunakan untuk seluruh kartu modular, hero dashboard, dan container utama.
* **Inner Badges & Inputs (`rounded-2xl` / 14px - 16px)**: Digunakan untuk form input, modal, dan sub-elemen kartu.
* **Translucent Glass Blur (`backdrop-blur-md` s.d. `backdrop-blur-xl`)**: Efek kaca buram dengan border 1px translucent (`border-white/30` atau `border-white/10` pada mode gelap).
* **Soft Spatial Elevation**: Bayangan halus difus (`shadow-[0_8px_30px_rgb(0,0,0,0.04)]`) tanpa garis tepi yang keras.

---

## 3. Arsitektur Tata Letak (Layout Architecture)

Mengadopsi struktur tata letak floating dock dan bento grid seperti pada gambar referensi:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│  [Logo]          [ Discover / Kamar / Sewa / Token / Billing / Audit ]         [📍 Kost] [🔔] [👤]│  <-- Top Floating Capsule Header
├────────┬─────────────────────────────────────────────────────────────────────────────────────────┤
│        │ ┌───────────────────────────────────────────────────┐ ┌───────────────────────────────┐ │
│ ┌────┐ │ │ HERO SHOWCASE BENTO CARD                          │ │ DRIVE CONCIERGE / QUICK ACT   │ │
│ │ 🏠 │ │ │ "Kost Putri Graha Asri"                           │ │ "Ready to organize dispatch"  │ │
│ │ 🚪 │ │ │ Subtitle: 24 Kamar Total · 92% Okupansi           │ ├───────────────────────────────┤ │
│ │ 👥 │ │ │                                                   │ │ PLAN / STATUS (DARK CARD)     │ │
│ │ ⚡ │ │ │ [⚡ 92% Okupansi]   [💰 Rp 28.5M Terkumpul]       │ │ "Ringkasan Tagihan & Listrik" │ │
│ │ 💳 │ │ │                                                   │ ├───────────────────────────────┤ │
│ │ 📊 │ │ │ [🟢 2 Siap Huni]  [🔵 22 Terisi]                  │ │ QUICK ACTIONS / COMPARE TRIMS │ │
│ │ ⚙️ │ │ │                                 [Kelola Kamar ↗]  │ │ [Lease] [Coverage]            │ │
│ └────┘ │ └───────────────────────────────────────────────────┘ ├───────────────────────────────┤ │
│        │                                                       │ CHAT / PROMPT ASSISTANT       │ │
│ Floating│ ┌──────────────────────┐ ┌─────────────────────────┐ │ [ Cari / Input WA... ] [Ask →]│ │
│  Slim  │ │ BENTO CARD 1         │ │ BENTO CARD 2            │ └───────────────────────────────┘ │
│  Dock  │ │ Realisasi Pendapatan │ │ Status Unit Kamar       │ ┌───────────────────────────────┐ │
│        │ │ [Bar Chart]          │ │ [Donut Chart]           │ │ DARK BENTO CARD               │ │
│        │ └──────────────────────┘ └─────────────────────────┘ │ Mutasi Arus Kas Live ↗        │ │
│        │                                                       └───────────────────────────────┘ │
└────────┴─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Spesifikasi Redesign Modul & Komponen

### 4.1 Header & Top Capsule Navigation (`Header.tsx`)

* **Konsep Baru**:
  * Menggantikan header bar kaku dengan **Floating Top Navigation Bar** bergaya capsule.
  * **Brand Mark**: Kapsul logo minimalist di kiri atas dengan logo monokrom hitam/putih.
  * **Center Navigation Pills**: Navigasi pil mengambang di tengah (contoh: `Dashboard`, `Kamar`, `Penghuni`, `Token PLN`, `Penagihan`, `Laporan`).
    * *Active State*: Pil hitam solid (`bg-[#0A0A0A] text-white shadow-md`).
    * *Inactive State*: Pil transparan lembut (`text-gray-600 hover:text-black hover:bg-black/5`).
  * **Right Utility Capsules**:
    * **Property Capsule Pill**: Pill berisi icon lokasi + nama kost aktif (`📍 Kost Putri Graha Asri`).
    * **Notification Capsule**: Pill bulat dengan lonceng notifikasi dan *live pulse indicator*.
    * **User Avatar Capsule**: Pill profil foto/inisial bulat minimalis dengan menu popover Role & Logout.

---

### 4.2 Left Floating Minimalist Dock (`Sidebar.tsx`)

* **Konsep Baru**:
  * Mengubah sidebar lebar konvensional menjadi **Floating Slim Icon Dock** di sisi kiri dengan elevasi lembut (`rounded-3xl`, `bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-white/20`).
  * Setiap menu direpresentasikan oleh icon minimalis modern dengan tooltip halus:
    * **Dashboard Owner**: Icon Grid / Speedometer.
    * **Manajemen Kamar**: Icon Door / Building.
    * **Penghuni & Kontrak**: Icon User Group.
    * **Token Listrik PLN**: Icon Bolt / Zap (dengan dot notifikasi n8n).
    * **Billing & Invoice**: Icon Receipt / Credit Card.
    * **Laporan & Audit**: Icon File Bar Chart.
  * *Active Icon*: Kotak rounded-2xl hitam (`bg-[#0A0A0A] text-white shadow-sm dark:bg-white dark:text-black`).
  * *Inactive Icon*: Stroke abu-abu lembut dengan hover state transisi halus.

---

### 4.3 Owner Executive Dashboard (`OwnerDashboardView.tsx`)

#### A. Hero Showcase Bento Card (Visual Anchor)
* Terinspirasi dari kartu mobil utama pada gambar referensi:
  * **Card Container**: Kartu besar `rounded-3xl` dengan latar belakang abu-abu arsitektural halus (`bg-[#E9ECEF]` / `bg-gradient-to-br from-[#EDEDED] to-[#E2E8F0]`).
  * **Badges Header**: Pill badge `"Multi-tenant Ready"` dan `"2026 Edition / Bulan Berjalan"`.
  * **Main Title**: Teks besar bold `"Kost Putri Graha Asri"`, subjudul `"Properti Tunggal · 24 Total Unit · Sistem Operasional Terintegrasi"`.
  * **Overlapping Translucent Metric Badges**:
    * *Metric 1 (Frosted Glass Capsule)*: Icon Lime Green bulat berapi + `"Tingkat Okupansi"`, `"92% (22/24 Unit)"`.
    * *Metric 2 (Frosted Glass Capsule)*: Icon Pin + `"Estimasi Pendapatan"`, `"Rp 28.500.000 / bln"`.
  * **Bottom Swatches & Tagging**: Mini avatar lingkaran penghuni baru + teks `"3 Kamar Siap Huni · Maintenance 0"`.
  * **Floating Action Button (Bottom Right)**: Tombol pill hitam solid dengan tanda panah miring: `[ Kelola Inventaris Kamar ↗ ]`.

#### B. Bento Grid KPI & Analitik
* **Dark Bento Card (Total Tunggakan)**:
  * Latar belakang hitam pekat (`bg-[#0A0A0A] text-white rounded-3xl p-6`).
  * Judul: `"Tunggakan Invoice Belum Terbayar"`, nilai: `"Rp 1.800.000"`.
  * Tombol aksi mini: `[ Kirim Pengingat WA ⚡ ]` beraksen Electric Lime.
* **Light Bento Card (Laba Token Listrik)**:
  * Kartu putih bersih dengan highlight icon Electric Lime Green (`bg-[#D9FF43] p-3 rounded-2xl`).
  * Menampilkan margin keuntungan bersih penjualan token listrik PLN internal.
* **Bento Chart 1 (Realisasi Pendapatan vs Target)**:
  * Bar chart minimalis dengan kombinasi warna: Bar `Terkumpul` berwarna `#0A0A0A` (atau Cobalt), Bar `Target` berwarna abu-abu muda (`#E5E7EB`).
* **Bento Chart 2 (Komposisi Okupansi Donut)**:
  * Donut chart elegan dengan palet warna: Electric Lime (`#D9FF43` - Tersedia), Deep Obsidian (`#0A0A0A` - Terisi), Warm Amber (`#F59E0B` - Maintenance).

#### C. Live Audit Arus Kas Masuk (Verified Log)
* Bento card memanjang dengan list mutasi real-time:
  * Tiap baris dikemas dalam kapsul halus dengan badge panah hijau naik (`ArrowUpRight`), nomor invoice, metode bayar (BCA/QRIS), dan nominal tebal bertinta hijau terang.

---

### 4.4 Manajemen Kamar (`RoomsView.tsx`)

* **Top Filter Capsule Dock**:
  * Capsule filter status: `[ Semua ]`, `[ 🟢 Siap Huni (2) ]`, `[ 🔵 Terisi (22) ]`, `[ 🟡 Perbaikan (0) ]`.
  * Filter Lantai: Pills bergaya segmented button `[ Semua ] [ Lt 1 ] [ Lt 2 ]`.
  * Input Pencarian: Kapsul pencarian transparan dengan icon loop minimalis.
* **Room Bento Cards**:
  * Desain kartu unit kamar dengan sudut `rounded-3xl` dan border super tipis.
  * **Header Kamar**: Nomor kamar besar tebal (`Kamar 101`), badge lantai kecil (`Lt 1`), dan status capsule pill di sudut kanan.
  * **Tarif Sewa**: Penulisan nominal rupiah yang menonjol dan bersih.
  * **Tenant Info Pod**: Jika kamar terisi, terdapat pod kapsul frosted glass berisi nama penghuni dan tombol quick WA.
  * **Facility Badges**: Tag pill fasilitas bawaan (AC, Kasur, KM Dalam) dalam warna abu-abu netral.
  * **Action Footer**:
    * Jika Kamar Tersedia: Tombol pill hitam `[ Check-in Sewa ↗ ]`.
    * Jika Kamar Terisi: Tombol pill `[ Token PLN ⚡ ]` dengan hover lime green.
    * Tombol Edit & Delete dalam lingkaran minimalis.

---

### 4.5 Manajemen Penghuni & Sewa (`TenantsView.tsx`)

* **Tenant Card Bento Grid**:
  * Menggantikan tabel datar dengan kartu profil penghuni modern.
  * **Tenant Header**: Avatar inisial dengan background soft neutral, nama lengkap, dan status kontrak pill (`🟢 Aktif`).
  * **Quick Actions**: Tombol pill hijau elektrik `[ Chat WhatsApp ↗ ]` yang langsung membuka dialog pesan WA n8n.
  * **Lease Detail Capsule**: Nomor kamar terpasang (`Kamar 204`), tanggal jatuh tempo bulanan (*Billing cycle day*), dan nominal deposit jaminan.
  * **KTP Attachment Badge**: Pill lampiran preview foto KTP dengan icon dokumen.

---

### 4.6 Distribusi Token Listrik PLN (`ElectricityView.tsx`)

* **n8n Live Webhook Header Banner**:
  * Kapsul status di bagian atas: `🟢 n8n WhatsApp Webhook: Connected & Active`.
* **Quick Dispatch Studio Card (Bento Action Panel)**:
  * Form input pembelian token dengan nuansa studio modern:
    * Dropdown nomor kamar & penghuni terhubung.
    * Input 20-digit kode token PLN dengan font monospace berjarak tegas (`tracking-widest`).
    * Kalkulasi otomatis margin harga beli vs harga jual secara langsung (*live feedback*).
    * Tombol Primary CTA: Kapsul **Electric Lime Green** `[ Kirim Token ke WhatsApp ⚡ ]` yang memicu trigger ke n8n webhook.
* **Riwayat Distribusi Token Bento Table**:
  * Riwayat kode token yang telah dikirim dengan tombol 1-klik `Salin 20 Digit` dan status pengiriman WA.

---

### 4.7 Penagihan & Invoice (`BillingView.tsx`)

* **Invoice KPI Summary**:
  * Tiga kartu bento mini: *Total Tagihan Bulan Ini*, *Invoice Terbayar (Lunas)*, dan *Invoice Menunggu Verifikasi*.
* **Invoice Action Table**:
  * Baris data terstruktur dengan badge status:
    * `Unpaid`: Badge outline merah terang dengan tombol aksi `[ Ingatkan WA ↗ ]`.
    * `Paid`: Badge hijau solid dengan nama verifikator admin.
    * `Overdue`: Badge merah gelap kontras.
* **Payment Verification Modal (`PaymentVerificationModal.tsx`)**:
  * Dialog modal `rounded-3xl` dengan preview bukti transfer gambar yang dapat diperbesar (*zoomable glass view*).
  * Tombol approval: Tombol hitam `[ Konfirmasi Pembayaran & Terbitkan Kuitansi WA ↗ ]`.

---

### 4.8 Konfigurasi Rekening & Laporan Owner (`PaymentSettingsView.tsx` & `OwnerAuditView.tsx`)

* **Metode Pembayaran Bento Cards**:
  * Kartu masing-masing rekening (BCA, Mandiri, BRI, QRIS) dengan gaya kartu perbankan modern:
    * Logo bank / icon QRIS.
    * Nomor rekening besar dengan tombol 1-klik `Salin Nomor`.
    * Nama pemilik rekening & switch toggle status aktif.
* **Laporan Arus Kas & Ekspor**:
  * Tombol ekspor Excel `[ Ekspor Laporan .XLSX ↗ ]` dalam bentuk pill elegan dengan icon download.

---

### 4.9 Halaman Login Otentikasi (`LoginForm.tsx`)

* **Spatial Minimalist Login Card**:
  * Latar belakang abu-abu arsitektural dengan kartu login mengambang `rounded-3xl` berbayangan difus tebal.
  * Brand icon monokrom di tengah atas.
  * Input field kapsul modern dengan icon user dan gembok.
  * Tombol login: Kapsul hitam pekat (`#0A0A0A`) dengan teks putih dan transisi hover skala halus (`active:scale-[0.98]`).
  * Demo Credential Badges: Tiga capsule pill untuk akun demo (*Owner*, *Admin*, *Staff*) yang dapat diklik untuk auto-fill cepat.

---

## 5. Pemetaan Komponen UI & Kode Tailwind (Tailwind CSS Tokens Mapping)

Berikut pemetaan class Tailwind CSS untuk implementasi:

| Komponen UI | Styling Tailwind CSS (Spatial Bento Theme) |
| :--- | :--- |
| **Canvas Background** | `bg-[#EDEDED] dark:bg-[#0A0A0A] min-h-screen text-[#0A0A0A] dark:text-white` |
| **Floating Nav Dock** | `bg-white/80 dark:bg-[#141416]/80 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.04)]` |
| **Primary Bento Card (Light)** | `bg-white dark:bg-[#141416] rounded-3xl border border-gray-100 dark:border-white/5 p-6 shadow-sm` |
| **Accent Bento Card (Dark)** | `bg-[#0A0A0A] text-white rounded-3xl border border-white/10 p-6 shadow-md` |
| **Translucent Metric Pill** | `bg-white/70 dark:bg-white/10 backdrop-blur-md rounded-2xl border border-white/50 dark:border-white/10 p-3 shadow-xs` |
| **Electric Lime Button (CTA)** | `bg-[#D9FF43] hover:bg-[#C8F902] text-[#0A0A0A] font-bold rounded-full px-5 py-2.5 transition-all active:scale-95 shadow-sm` |
| **Obsidian Black Button** | `bg-[#0A0A0A] hover:bg-[#222222] text-white dark:bg-white dark:text-[#0A0A0A] font-semibold rounded-full px-5 py-2.5 transition-all active:scale-95` |
| **Form Input Capsule** | `bg-[#F8F9FA] dark:bg-[#1A1A1D] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-black focus:outline-none` |
| **Status Badge (Tersedia)** | `bg-[#D9FF43]/20 text-[#2D5A00] dark:bg-[#D9FF43]/30 dark:text-[#D9FF43] border border-[#D9FF43]/40 rounded-full px-3 py-1 text-xs font-bold` |

---

## 6. Rencana Verifikasi & Uji Kualitas (Verification Plan)

1. **Uji Fungsionalitas & Alur Kerja**:
   * Memastikan pergantian role (Owner, Admin, Cleaning Staff) berfungsi 100% tanpa error sesi.
   * Memastikan data kamar, penghuni, sewa (leases), invoice, dan token listrik dapat diinput, diedit, dan dihapus seperti biasa.
   * Memastikan webhook dispatch n8n tetap mengirim payload format WhatsApp yang valid.
   * Memastikan ekspor Excel (.xlsx) menghasilkan 3 sheet laporan lengkap tanpa korupsi data.
2. **Uji Responsivitas & Tampilan**:
   * Memverifikasi tampilan desktop (Bento Grid 3-4 kolom dan floating left dock).
   * Memverifikasi tampilan tablet dan mobile (Bottom navigation dock kapsul dan single-column stacked bento cards).
3. **Uji Kontras & Aksesibilitas**:
   * Memastikan rasio kontras teks pada kartu Electric Lime Green, Obsidian Black, dan Frosted Glass memenuhi standar keterbacaan WCAG AA.
