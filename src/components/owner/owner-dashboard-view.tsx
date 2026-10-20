"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  AlertCircle,
  Zap,
  Building2,
  DollarSign,
  Download,
  Calendar,
  CreditCard,
  DoorClosed,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Sparkles,
  Search,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Layers,
  Activity,
  Wallet,
  Percent,
  Clock,
  Phone,
  HelpCircle,
  SlidersHorizontal,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { financeLanding } from "@/lib/permissions";
import { financeEntries, financeKpis, localDate, monthLabel, ownerCashflow, receivables } from "@/lib/finance";
import { useFinanceData } from "@/components/finance/use-finance-data";
import { FinancePropertyPicker, useFinanceWorkspace } from "@/lib/finance-workspace-context";
import { formatRupiah, formatDateIndo } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

interface OwnerDashboardViewProps {
  onNavigateTab?: (tab: string, initialPrompt?: string) => void;
}

export function OwnerDashboardView({ onNavigateTab }: OwnerDashboardViewProps) {
  const { profile, role } = useAuth();
  const { activeProperty, activePropertyId: propertyId } = useFinanceWorkspace();
  const financeTab = financeLanding(profile?.role || role, profile?.permissions);
  const propertyInfo = activeProperty || { name: "Properti Kost", address: "", city: "" };
  const { data, loading, local, error, refresh } = useFinanceData(propertyId);
  const { rooms, leases, invoices } = data;
  const electricityTransactions = data.electricity || [];
  const entries = financeEntries(data);
  const currentMonthKey = localDate().slice(0, 7);
  const currentKpis = financeKpis(data, entries, currentMonthKey);
  const currentMonthData = { income: currentKpis.revenue, expense: currentKpis.costs, count: currentKpis.rows.length };
  const ar = receivables(invoices);
  const occupiedRooms = rooms.filter(r => r.status === "occupied").length;
  const metrics = {
    totalRooms: rooms.length, occupiedRooms,
    availableRooms: rooms.filter(r => r.status === "available").length,
    maintenanceRooms: rooms.filter(r => r.status === "maintenance").length,
    occupancyRate: rooms.length ? Math.round(occupiedRooms / rooms.length * 100) : 0,
    currentMonthRevenue: currentKpis.revenue,
    targetMonthlyRevenue: rooms.reduce((t, r) => t + Number(r.base_price || 0), 0),
    totalUnpaidAmount: ar.total,
    unpaidInvoicesCount: invoices.filter(i => receivables([i]).total > 0).length,
    recentPayments: entries.filter(e => e.type === "income" && e.date.slice(0, 10) <= localDate()).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map(e => {
      const room = rooms.find(r => r.id === e.room_id);
      return { id: e.id, invoice_number: e.title, room_number: room?.room_number || "Bersama", tenant_name: room?.current_tenant?.full_name || e.category, amount: e.amount, payment_method: data.wallets.find(w => w.id === e.wallet_id)?.name || e.payment_method || "—", paid_at: e.date };
    }),
  };
  const [cashflowTimeframe, setCashflowTimeframe] = useState<"6m" | "1y" | "30d">("6m");
  const [tenantMetricView, setTenantMetricView] = useState<"occupancy" | "types">("occupancy");
  const monthlyCashflowData = ownerCashflow(data, "6m");
  const displayedCashflowData = ownerCashflow(data, cashflowTimeframe);
  const totalPeriodIncome = displayedCashflowData.reduce((s, d) => s + d.Pemasukan, 0);
  const totalPeriodExpense = displayedCashflowData.reduce((s, d) => s + d.Pengeluaran, 0);
  const totalPeriodNet = totalPeriodIncome - totalPeriodExpense;
  const netMarginPercent = totalPeriodIncome > 0 ? Math.round(totalPeriodNet / totalPeriodIncome * 1000) / 10 : null;
  // 2. Data Okupansi & Penghuni (Donut & Room Types Distribution)
  const occupancyChartData = [
    { name: "Terisi (Aktif)", value: metrics.occupiedRooms, color: "#0A0A0A" },
    { name: "Siap Huni (Tersedia)", value: metrics.availableRooms, color: "#D9FF43" },
    { name: "Perbaikan (Maintenance)", value: metrics.maintenanceRooms, color: "#F59E0B" },
  ];

  // Room Types Distribution Breakdown
  const roomTypesMap = rooms.reduce((acc, r) => {
    const type = r.room_type || "Standard AC";
    if (!acc[type]) {
      acc[type] = { total: 0, occupied: 0, revenue: 0 };
    }
    acc[type].total += 1;
    if (r.status === "occupied") {
      acc[type].occupied += 1;
      acc[type].revenue += r.base_price || 0;
    }
    return acc;
  }, {} as Record<string, { total: number; occupied: number; revenue: number }>);

  const roomTypesList = Object.entries(roomTypesMap).map(([type, stats]) => ({
    name: type,
    total: stats.total,
    occupied: stats.occupied,
    rate: stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0,
    revenue: stats.revenue,
  }));

  // Expiring Leases Watchlist (< 30 days or active)
  const activeLeases = leases.filter((l) => l.status === "active");

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Periode: currentMonthKey, "Uang Masuk (Kas)": currentKpis.revenue, "Uang Keluar (Kas)": currentKpis.costs, "Laba Bersih (Basis Kas)": currentKpis.profit, "Saldo Kas": currentKpis.cash }]), "Ringkasan Keuangan");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(entries.map(e => ({ Tanggal: e.date, Keterangan: e.title, Jenis: e.type === "income" ? "Uang Masuk" : "Uang Keluar", Kategori: e.category, Nominal: e.amount, Rekening: data.wallets.find(w => w.id === e.wallet_id)?.name || e.payment_method || "Belum dialokasikan" }))), "Transaksi Keuangan");

    // Sheet 1: Invoices
    const invoiceRows = invoices.map((i) => ({
      "No. Invoice": i.invoice_number,
      "Nomor Kamar": i.room_number,
      "Nama Penghuni": i.tenant_name,
      "No. WhatsApp": i.tenant_phone,
      "Periode Sewa": i.billing_period,
      "Biaya Sewa Pokok": i.subtotal_rent,
      "Biaya Tambahan / Token": i.additional_fees,
      "Total Tagihan": i.total_amount,
      "Jatuh Tempo": i.due_date,
      Status: i.status.toUpperCase(),
    }));
    const wsInvoices = XLSX.utils.json_to_sheet(invoiceRows);
    XLSX.utils.book_append_sheet(wb, wsInvoices, "Laporan Invoice");

    // Sheet 2: Token Listrik
    const electricity = electricityTransactions;
    const tokenRows = electricity.map((e) => ({
      "Tanggal Input": e.created_at,
      "Nomor Kamar": e.room_number,
      "Nama Penghuni": e.tenant_name,
      "Kode Token (20 Digit)": e.token_code,
      Nominal: e.nominal_amount,
      "Harga Beli": e.cost_price,
      "Harga Jual": e.selling_price,
      "Laba Bersih": e.profit_margin,
      "Status Bayar": e.payment_status,
    }));
    const wsTokens = XLSX.utils.json_to_sheet(tokenRows);
    XLSX.utils.book_append_sheet(wb, wsTokens, "Laporan Token Listrik");

    // Sheet 3: Kamar
    const roomRows = rooms.map((r) => ({
      "Nomor Kamar": r.room_number,
      Lantai: r.floor,
      Tipe: r.room_type,
      "Tarif Sewa": r.base_price,
      Status: r.status.toUpperCase(),
      "Penghuni Saat Ini": r.current_tenant?.full_name || "-",
    }));
    const wsRooms = XLSX.utils.json_to_sheet(roomRows);
    XLSX.utils.book_append_sheet(wb, wsRooms, "Inventaris Kamar");

    XLSX.writeFile(wb, `Laporan_Kost_ERP_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Export Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
              Executive Dashboard & Financial Analytics
            </h2>
            <Badge variant="lime">Live Tracking</Badge>
          </div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
            Pantau uang masuk, uang keluar, tagihan, dan okupansi penghuni dari satu dashboard.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FinancePropertyPicker className="w-full sm:w-auto" />
          {financeTab && <Button onClick={() => onNavigateTab?.(financeTab)} variant="lime" className="gap-2 text-xs font-bold"><Wallet className="h-4 w-4" />Buka Keuangan</Button>}
          <Button
            onClick={handleExportExcel}
            variant="outline"
            className="gap-2 shadow-spatial font-bold text-xs"
          >
            <Download className="h-4 w-4" />
            <span>Ekspor .XLSX</span>
          </Button>
          <Button
            onClick={() => onNavigateTab && onNavigateTab("billing")}
            variant="default"
            className="gap-2 shadow-spatial font-bold text-xs"
          >
            <Wallet className="h-4 w-4 text-[#D9FF43]" />
            <span>Kelola Tagihan</span>
          </Button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-orange-400/20 bg-orange-400/10 p-4 text-xs text-orange-600 dark:text-orange-200">Sinkronisasi finance gagal. Angka dari cache ditampilkan. {error} <button onClick={() => refresh()} className="ml-2 font-semibold underline">Coba lagi</button></div>}
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{loading ? "Memuat keuangan..." : local ? "Mode lokal · tersimpan di browser" : "Terhubung ke Supabase"} · Basis kas: uang masuk dihitung saat diterima, uang keluar saat dibayar. Angka memakai pencatatan yang sama dengan menu Keuangan.</p>

      {/* Flagship Hero Showcase Bento Card (Cosmic Obsidian & Star Ambience) */}
      <div className="relative overflow-hidden rounded-[28px] p-5 sm:p-9 bg-[#0B0C0E] border border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] text-white flex flex-col justify-between min-h-[350px]">
        {/* Breathing Radial Aura Behind Hero */}
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-radial from-[#D9FF43]/15 via-transparent to-transparent blur-3xl pointer-events-none"
          style={{ animation: "auraPulse 6s ease-in-out infinite" }}
        />

        {/* Cosmic Star Ambience */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <span className="star-particle" style={{ top: "18%", left: "12%", ["--star-size" as any]: "3px", ["--star-delay" as any]: "0s", ["--star-duration" as any]: "4.5s" }} />
          <span className="star-particle" style={{ top: "32%", right: "24%", ["--star-size" as any]: "4.5px", ["--star-delay" as any]: "1.2s", ["--star-duration" as any]: "5.2s" }} />
          <span className="star-particle" style={{ top: "74%", left: "30%", ["--star-size" as any]: "3.5px", ["--star-delay" as any]: "2.1s", ["--star-duration" as any]: "4s" }} />
          <span className="star-particle" style={{ top: "82%", right: "14%", ["--star-size" as any]: "4px", ["--star-delay" as any]: "0.8s", ["--star-duration" as any]: "6s" }} />
          <span className="star-particle" style={{ top: "22%", right: "48%", ["--star-size" as any]: "3px", ["--star-delay" as any]: "2.8s", ["--star-duration" as any]: "5s" }} />
          <span className="star-particle" style={{ top: "62%", left: "78%", ["--star-size" as any]: "4.5px", ["--star-delay" as any]: "1.6s", ["--star-duration" as any]: "4.8s" }} />
        </div>

        {/* Top Badges */}
        <div className="relative z-10 flex flex-wrap items-center gap-2">
          <span className="px-3.5 py-1 text-xs font-bold text-neutral-200 rounded-full border border-white/10 bg-[#171821] backdrop-blur-md shadow-xs">
            Bulan Berjalan · {monthLabel(currentMonthKey)}
          </span>
          <span className="text-xs font-semibold text-neutral-400">
            Kost ERP Pro Analytics
          </span>
        </div>

        {/* Large Title & Subtitle */}
        <div className="relative z-10 my-5">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            {propertyInfo.name}
          </h1>
          <p className="text-sm font-medium text-neutral-400 mt-1 max-w-xl">
            Operasional Properti{propertyInfo.city ? ` · ${propertyInfo.city}` : propertyInfo.address ? ` · ${propertyInfo.address.split(",")[0]}` : ""} · {metrics.totalRooms} Unit Kamar Total · Smart WA Webhook
          </p>
        </div>

        {/* High-Contrast Obsidian Metric Badges */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3.5 my-3">
          {/* Metric 1: Okupansi */}
          <div className="rounded-2xl p-4 flex items-center gap-3.5 transition-all duration-300 hover:scale-[1.02] border border-white/[0.09] hover:border-[#D9FF43]/40 bg-[#14151F] shadow-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#D9FF43] text-[#0A0A0A] shadow-xs">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Tingkat Okupansi
              </p>
              <p className="text-xl font-black text-white leading-tight font-mono">
                {metrics.occupancyRate}% <span className="text-xs font-medium text-neutral-400 font-sans">({metrics.occupiedRooms}/{metrics.totalRooms} Unit)</span>
              </p>
            </div>
          </div>

          {/* Metric 2: Revenue */}
          <div className="rounded-2xl p-4 flex items-center gap-3.5 transition-all duration-300 hover:scale-[1.02] border border-white/[0.09] hover:border-[#D9FF43]/40 bg-[#14151F] shadow-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#D9FF43]/15 text-[#D9FF43] border border-[#D9FF43]/30 shadow-xs">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Uang Masuk (Kas)
              </p>
              <p className="text-xl font-black text-white leading-tight font-mono">
                {formatRupiah(metrics.currentMonthRevenue)}
              </p>
            </div>
          </div>

          {/* Metric 3: Total Tunggakan */}
          <div
            onClick={() => onNavigateTab && onNavigateTab("billing")}
            className="rounded-2xl p-4 flex items-center gap-3.5 transition-all duration-300 hover:scale-[1.02] cursor-pointer border border-white/[0.09] hover:border-rose-500/40 bg-[#14151F] shadow-sm"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 shadow-xs border border-rose-500/30">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Total Tunggakan Sewa
              </p>
              <p className="text-xl font-black text-rose-400 leading-tight font-mono">
                {formatRupiah(metrics.totalUnpaidAmount)}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Card Footer */}
        <div className="relative z-10 mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="flex items-center -space-x-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D9FF43] text-[10px] font-bold text-neutral-900 ring-2 ring-[#0B0C0E]">
                {metrics.availableRooms}
              </span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[10px] font-bold text-black ring-2 ring-[#0B0C0E]">
                {metrics.occupiedRooms}
              </span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-black ring-2 ring-[#0B0C0E]">
                {metrics.maintenanceRooms}
              </span>
            </div>
            <span className="text-xs font-semibold text-neutral-300">
              {metrics.availableRooms} Kamar Siap Huni · Status Terhubung
            </span>
          </div>

          <Button
            variant="lime"
            onClick={() => onNavigateTab && onNavigateTab("rooms")}
            className="gap-2 shadow-lime-glow font-black text-xs hover:scale-105 transition-transform"
          >
            <span>Inventaris Kamar</span>
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 4 Core High-Level KPI Stat Cards with Staggered Cascading Entrance */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Saldo kas properti */}
        <div style={{ animation: "popupSpringIn 0.35s var(--spring-smooth) both", animationDelay: "0ms" }}>
          <StatCard
            title="Saldo Kas"
            value={formatRupiah(currentKpis.cash)}
            subtitle="Saldo awal + seluruh mutasi hingga hari ini"
            icon={Wallet}
            variant="blue"
            trend={{
              value: `${data.wallets.filter(w => w.wallet_kind !== "liability").length} Rekening Kas`,
              isPositive: currentKpis.cash >= 0,
            }}
          />
        </div>

        {/* Realisasi Kas Masuk (Revenue) */}
        <div style={{ animation: "popupSpringIn 0.35s var(--spring-smooth) both", animationDelay: "60ms" }}>
          <StatCard
            title="Uang Masuk (Kas)"
            value={formatRupiah(currentMonthData.income)}
            subtitle={`Target: ${formatRupiah(metrics.targetMonthlyRevenue)}`}
            icon={DollarSign}
            variant="emerald"
            trend={{
              value: `${Math.round(
                (currentMonthData.income / (metrics.targetMonthlyRevenue || 1)) * 100
              )}% Target Tercapai`,
              isPositive: currentMonthData.income > 0,
            }}
          />
        </div>

        {/* Biaya yang sudah dibayarkan */}
        <div style={{ animation: "popupSpringIn 0.35s var(--spring-smooth) both", animationDelay: "120ms" }}>
          <StatCard
            title="Uang Keluar (Kas)"
            value={formatRupiah(currentMonthData.expense)}
            subtitle={`Biaya dibayarkan · ${monthLabel(currentMonthKey)}`}
            icon={ArrowDownRight}
            variant="amber"
            trend={{
              value: "Termasuk seluruh pengeluaran lama",
              isPositive: false,
            }}
          />
        </div>

        {/* Laba bersih bulan berjalan */}
        <div style={{ animation: "popupSpringIn 0.35s var(--spring-smooth) both", animationDelay: "180ms" }}>
          <StatCard
            title="Laba Bersih"
            value={formatRupiah(currentKpis.profit)}
            subtitle="Uang masuk dikurangi biaya bulan berjalan"
            icon={TrendingUp}
            variant="rose"
            trend={{
              value: currentKpis.margin === null ? "Margin belum tersedia" : `Margin ${currentKpis.margin.toFixed(1)}%`,
              isPositive: currentKpis.profit >= 0,
            }}
          />
        </div>
      </div>

      {/* SECTION 1: DIAGRAM GARIS PEMASUKAN DAN PENGELUARAN (CASHFLOW TREND TRACKER) */}
      <div className="rounded-3xl border border-white/80 bg-white p-4 sm:p-7 shadow-spatial dark:bg-[#18181B] dark:border-white/10">
        {/* Chart Header & Controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-100 pb-5 dark:border-white/10">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-black tracking-tight text-neutral-900 dark:text-white">
                Diagram Arus Kas: Pemasukan vs Pengeluaran
              </h3>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                  netMarginPercent !== null && netMarginPercent >= 0
                    ? "bg-[#D9FF43] text-[#0A0A0A]"
                    : "bg-rose-500 text-white"
                }`}
              >
                Net Margin {netMarginPercent === null ? "—" : `${netMarginPercent}%`}
              </span>
            </div>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
              Seluruh pendapatan diterima, biaya dibayarkan, dan laba bersih pada periode yang dipilih.
            </p>
          </div>

          {/* Timeframe Selector Capsule */}
          <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-neutral-100 p-1 dark:bg-neutral-800 shrink-0">
            <button
              onClick={() => setCashflowTimeframe("6m")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                cashflowTimeframe === "6m"
                  ? "bg-[#0A0A0A] text-white shadow-xs dark:bg-white dark:text-[#0A0A0A]"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
              }`}
            >
              6 Bulan
            </button>
            <button
              onClick={() => setCashflowTimeframe("1y")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                cashflowTimeframe === "1y"
                  ? "bg-[#0A0A0A] text-white shadow-xs dark:bg-white dark:text-[#0A0A0A]"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
              }`}
            >
              1 Tahun
            </button>
            <button
              onClick={() => setCashflowTimeframe("30d")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                cashflowTimeframe === "30d"
                  ? "bg-[#0A0A0A] text-white shadow-xs dark:bg-white dark:text-[#0A0A0A]"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
              }`}
            >
              30 Hari
            </button>
          </div>
        </div>

        {/* Metric Ticker Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-5">
          <div className="rounded-2xl bg-neutral-50 p-4 border border-neutral-100 dark:bg-neutral-800/60 dark:border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                Total Pemasukan (Gross)
              </span>
              <span className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full dark:bg-emerald-950/60">
                <ArrowUpRight className="h-3 w-3 mr-0.5" /> Penerimaan
              </span>
            </div>
            <p className="text-xl font-black text-neutral-900 dark:text-white mt-1">
              {formatRupiah(totalPeriodIncome)}
            </p>
            <p className="text-[10px] text-neutral-400 mt-0.5">Sewa kamar & kas masuk operasional</p>
          </div>

          <div className="rounded-2xl bg-neutral-50 p-4 border border-neutral-100 dark:bg-neutral-800/60 dark:border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                Total Pengeluaran (Beban)
              </span>
              <span className="flex items-center text-[10px] font-bold text-neutral-700 bg-neutral-200 px-2 py-0.5 rounded-full dark:bg-neutral-700 dark:text-neutral-200">
                <ArrowDownRight className="h-3 w-3 mr-0.5" /> Biaya Operasional
              </span>
            </div>
            <p className="text-xl font-black text-neutral-900 dark:text-white mt-1">
              {formatRupiah(totalPeriodExpense)}
            </p>
            <p className="text-[10px] text-neutral-400 mt-0.5">Listrik induk, WiFi, gaji, kebersihan</p>
          </div>

          <div className="rounded-2xl bg-[#0A0A0A] p-4 text-white shadow-spatial border border-neutral-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-400">Laba Bersih Operasional</span>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  netMarginPercent !== null && netMarginPercent >= 0
                    ? "text-[#0A0A0A] bg-[#D9FF43]"
                    : "text-white bg-rose-500"
                }`}
              >
                {netMarginPercent === null ? "Margin —" : `${netMarginPercent}% Margin`}
              </span>
            </div>
            <p
              className={`text-xl font-black mt-1 ${
                totalPeriodNet >= 0 ? "text-[#D9FF43]" : "text-rose-400"
              }`}
            >
              {totalPeriodNet >= 0 ? `+${formatRupiah(totalPeriodNet)}` : formatRupiah(totalPeriodNet)}
            </p>
            <p className="text-[10px] text-neutral-400 mt-0.5">Arus kas bersih setelah biaya</p>
          </div>
        </div>

        {/* Recharts Area / Line Chart */}
        <div className="mt-6 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={displayedCashflowData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0A0A0A" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0A0A0A" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D9FF43" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#D9FF43" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.6} />
              <XAxis dataKey="period" stroke="#888888" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => {
                  if (Math.abs(val) >= 1000000)
                    return `${(val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 1)}M`;
                  if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(0)}k`;
                  return `${val}`;
                }}
              />
              <Tooltip
                cursor={{ stroke: "#D9FF43", strokeWidth: 1.5, strokeDasharray: "4 4" }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const inc = (payload.find((p) => p.dataKey === "Pemasukan")?.value as number) || 0;
                    const exp = (payload.find((p) => p.dataKey === "Pengeluaran")?.value as number) || 0;
                    const net = (payload.find((p) => p.dataKey === "LabaBersih")?.value as number) ?? (inc - exp);
                    return (
                      <div className="rounded-2xl bg-[#0B0C0E]/95 backdrop-blur-xl border border-white/10 p-3.5 shadow-2xl text-white text-xs min-w-[210px]">
                        <p className="font-black text-neutral-400 text-[11px] mb-2 border-b border-white/10 pb-1.5 flex items-center justify-between">
                          <span>Periode</span>
                          <span className="text-white font-bold">{label}</span>
                        </p>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-neutral-300">
                              <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                              Pemasukan:
                            </span>
                            <span className="font-bold text-emerald-400">{formatRupiah(inc)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-neutral-300">
                              <span className="h-2 w-2 rounded-full bg-neutral-400" />
                              Pengeluaran:
                            </span>
                            <span className="font-bold text-neutral-300">{formatRupiah(exp)}</span>
                          </div>
                          <div className="flex items-center justify-between border-t border-white/10 pt-1.5 mt-1 font-black">
                            <span className="flex items-center gap-1.5 text-[#D9FF43]">
                              <span className="h-2 w-2 rounded-full bg-[#D9FF43]" />
                              Laba Bersih:
                            </span>
                            <span className={net >= 0 ? "text-[#D9FF43]" : "text-rose-400"}>{formatRupiah(net)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Area 1: Pemasukan */}
              <Area
                type="monotone"
                dataKey="Pemasukan"
                stroke="#10B981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#incomeGradient)"
                activeDot={{ r: 6, fill: "#10B981", stroke: "#0B0C0E", strokeWidth: 3 }}
              />

              {/* Area 2: Pengeluaran */}
              <Area
                type="monotone"
                dataKey="Pengeluaran"
                stroke="#0A0A0A"
                strokeWidth={2.5}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#expenseGradient)"
                activeDot={{ r: 5, fill: "#FFFFFF", stroke: "#0B0C0E", strokeWidth: 2.5 }}
              />

              {/* Line 3: Laba Bersih */}
              <Line
                type="monotone"
                dataKey="LabaBersih"
                stroke="#84CC16"
                strokeWidth={3}
                dot={{ r: 4, fill: "#D9FF43", strokeWidth: 2, stroke: "#0A0A0A" }}
                activeDot={{ r: 7, fill: "#D9FF43", stroke: "#0B0C0E", strokeWidth: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend Custom Strip */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-6 border-t border-neutral-100 pt-4 text-xs dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#10B981]" />
            <span className="font-bold text-neutral-800 dark:text-neutral-200">Pemasukan (Gross Income)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#0A0A0A] dark:bg-white" />
            <span className="font-bold text-neutral-800 dark:text-neutral-200">Pengeluaran (Operasional)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#D9FF43] ring-1 ring-black/20" />
            <span className="font-bold text-neutral-800 dark:text-neutral-200">Laba Bersih (Net Profit)</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: DIAGRAM PENGHUNI & OKUPANSI ANALYTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Cols: Donut Chart Status Okupansi Kamar */}
        <div className="lg:col-span-5 rounded-3xl border border-white/80 bg-white p-6 shadow-spatial dark:bg-[#18181B] dark:border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4 dark:border-white/10">
            <div>
              <h3 className="text-sm font-black tracking-tight text-neutral-900 dark:text-white">
                Diagram Okupansi & Status Kamar
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Komposisi ketersediaan unit sewa saat ini
              </p>
            </div>
            <Badge variant="obsidian">{metrics.totalRooms} Unit Total</Badge>
          </div>

          <div className="my-3 flex h-52 items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={occupancyChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {occupancyChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => [`${val} Kamar`, ""]}
                  contentStyle={{
                    backgroundColor: "#0A0A0A",
                    borderRadius: "1rem",
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Centered Rate Badge */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-neutral-900 dark:text-white">
                {metrics.occupancyRate}%
              </span>
              <span className="text-[10px] font-bold text-neutral-400 uppercase">Okupansi</span>
            </div>
          </div>

          <div className="space-y-2 border-t border-neutral-100 pt-3 text-xs dark:border-white/10">
            {occupancyChartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-bold text-neutral-700 dark:text-neutral-300">
                    {item.name}
                  </span>
                </div>
                <span className="font-black text-neutral-900 dark:text-white">
                  {item.value} Unit (
                  {metrics.totalRooms > 0
                    ? Math.round((item.value / metrics.totalRooms) * 100)
                    : 0}
                  %)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right 7 Cols: Tren Historis Okupansi & Distribusi Tipe Unit */}
        <div className="lg:col-span-7 rounded-3xl border border-white/80 bg-white p-6 shadow-spatial dark:bg-[#18181B] dark:border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4 dark:border-white/10">
            <div>
              <h3 className="text-sm font-black tracking-tight text-neutral-900 dark:text-white">
                Tren Okupansi & Analisis Tipe Kamar
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Histori okupansi 6 bulan dan daya serap per tipe unit
              </p>
            </div>

            <div className="flex items-center gap-1 rounded-full bg-neutral-100 p-1 dark:bg-neutral-800">
              <button
                onClick={() => setTenantMetricView("occupancy")}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                  tenantMetricView === "occupancy"
                    ? "bg-[#0A0A0A] text-white dark:bg-white dark:text-[#0A0A0A]"
                    : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
                }`}
              >
                Tren Garis
              </button>
              <button
                onClick={() => setTenantMetricView("types")}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                  tenantMetricView === "types"
                    ? "bg-[#0A0A0A] text-white dark:bg-white dark:text-[#0A0A0A]"
                    : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
                }`}
              >
                Tipe Unit
              </button>
            </div>
          </div>

          {tenantMetricView === "occupancy" ? (
            <div>
              <div className="h-52 w-full mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyCashflowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.6} />
                    <XAxis dataKey="period" stroke="#888888" fontSize={11} tickLine={false} />
                    <YAxis
                      domain={[50, 100]}
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip
                      formatter={(val: number) => [`${val}% Okupansi`, ""]}
                      contentStyle={{
                        backgroundColor: "#0A0A0A",
                        borderRadius: "1rem",
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="okupansi"
                      stroke="#0A0A0A"
                      strokeWidth={3.5}
                      dot={{ r: 5, fill: "#D9FF43", stroke: "#0A0A0A", strokeWidth: 2 }}
                      activeDot={{ r: 7, fill: "#D9FF43" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-2xl bg-neutral-50 p-3 text-xs dark:bg-neutral-800/60">
                <span className="font-semibold text-neutral-600 dark:text-neutral-300">
                  Rata-rata Retensi Sewa Penghuni: <strong className="text-neutral-900 dark:text-white">8.4 Bulan</strong>
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  Tingkat Perpanjangan 88%
                </span>
              </div>
            </div>
          ) : (
            <div className="my-3 space-y-3">
              {roomTypesList.map((rt) => (
                <div key={rt.name} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3 text-xs dark:bg-neutral-800/50 dark:border-white/5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-neutral-900 dark:text-white text-sm">
                      {rt.name}
                    </span>
                    <span className="font-bold text-neutral-600 dark:text-neutral-300">
                      {rt.occupied}/{rt.total} Terisi ({rt.rate}%)
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#0A0A0A] dark:bg-[#D9FF43] transition-all duration-500"
                      style={{ width: `${rt.rate}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-1 text-[11px] text-neutral-400">
                    <span>Estimasi Omzet: {formatRupiah(rt.revenue)}/bln</span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                      {rt.total - rt.occupied} Kamar Kosong
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick CTA Bottom */}
          <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-white/10">
            <span className="text-xs font-semibold text-neutral-500">
              {activeLeases.length} Kontrak Sewa Aktif Terdaftar
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigateTab && onNavigateTab("tenants")}
              className="h-8 gap-1.5 text-xs font-bold"
            >
              <Users className="h-3.5 w-3.5" />
              <span>Kelola Penghuni ↗</span>
            </Button>
          </div>
        </div>
      </div>

      {/* SECTION 3: RECENT AUDIT CASHFLOW & PENDING INVOICES WATCHLIST */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Log Arus Kas Masuk Terverifikasi */}
        <div className="lg:col-span-7 rounded-3xl border border-white/80 bg-white shadow-spatial dark:bg-[#18181B] dark:border-white/10 overflow-hidden">
          <div className="flex items-center justify-between border-b border-neutral-100 p-5 dark:border-white/10">
            <div>
              <h3 className="text-sm font-black tracking-tight text-neutral-900 dark:text-white">
                Pemasukan Terbaru
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Pembayaran sewa dan pendapatan manual dari daftar transaksi
              </p>
            </div>
            <Badge variant="lime">Live Audit</Badge>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-white/5">
            {metrics.recentPayments.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500">
                Belum ada uang masuk yang tercatat.
              </div>
            ) : (
              metrics.recentPayments.slice(0, 5).map((pay) => (
                <div
                  key={pay.id}
                  className="flex items-center justify-between p-4 px-5 transition-colors hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D9FF43]/25 text-neutral-900 dark:text-[#D9FF43]">
                      <ArrowUpRight className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-neutral-900 dark:text-white">
                        Kamar {pay.room_number} • {pay.tenant_name}
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        {pay.invoice_number} • Metode: {pay.payment_method}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-black text-neutral-900 dark:text-white">
                      +{formatRupiah(pay.amount)}
                    </p>
                    <p className="text-[10px] font-medium text-neutral-400">
                      {formatDateIndo(pay.paid_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 5 Cols: Pending Invoices Watchlist */}
        <div className="lg:col-span-5 rounded-3xl border border-white/80 bg-white shadow-spatial dark:bg-[#18181B] dark:border-white/10 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3.5 dark:border-white/10">
              <div>
                <h3 className="text-sm font-black tracking-tight text-neutral-900 dark:text-white">
                  Watchlist Tagihan Belum Lunas
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Prioritas penagihan & reminder WhatsApp
                </p>
              </div>
              <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                {metrics.unpaidInvoicesCount} Tertunda
              </span>
            </div>

            <div className="mt-3 space-y-2.5">
              {invoices
                .filter((i) => receivables([i]).total > 0)
                .slice(0, 4)
                .map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded-2xl bg-neutral-50 p-3 text-xs dark:bg-neutral-800/50"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-neutral-900 dark:text-white">
                          Kamar {inv.room_number}
                        </span>
                        <span className="text-[10px] text-neutral-400">({inv.tenant_name})</span>
                      </div>
                      <p className="text-[10px] text-rose-600 font-semibold mt-0.5">
                        Jatuh tempo: {formatDateIndo(inv.due_date)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-black text-neutral-900 dark:text-white">
                        {formatRupiah(receivables([inv]).total)}
                      </p>
                      <button
                        onClick={() => onNavigateTab && onNavigateTab("billing")}
                        className="text-[10px] font-bold text-blue-600 hover:underline mt-0.5"
                      >
                        Kirim WA ↗
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="mt-4 border-t border-neutral-100 pt-3 dark:border-white/10">
            <Button
              variant="default"
              size="sm"
              onClick={() => onNavigateTab && onNavigateTab("billing")}
              className="w-full text-xs font-bold gap-1.5"
            >
              <span>Buka Seluruh Tagihan & Verifikasi</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
