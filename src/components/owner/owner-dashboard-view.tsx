"use client";

import React, { useState, useEffect } from "react";
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
import { OwnerDashboardMetrics, Room, Lease, Invoice, Tenant, CashTransaction, ElectricityTransaction } from "@/types";
import { KostApiClient } from "@/lib/api-client";
import { KostStorage } from "@/lib/storage";
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
  // Initialize with local KostStorage immediately to guarantee instant render without blank screen
  const [metrics, setMetrics] = useState<OwnerDashboardMetrics>(() => KostStorage.getOwnerMetrics());
  const [rooms, setRooms] = useState<Room[]>(() => KostStorage.getRooms());
  const [leases, setLeases] = useState<Lease[]>(() => KostStorage.getLeases());
  const [invoices, setInvoices] = useState<Invoice[]>(() => KostStorage.getInvoices());
  const [tenants, setTenants] = useState<Tenant[]>(() => KostStorage.getTenants());
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>(() => KostStorage.getCashTransactions());
  const [electricityTransactions, setElectricityTransactions] = useState<ElectricityTransaction[]>(() => KostStorage.getElectricityTransactions());
  const [propertyInfo, setPropertyInfo] = useState<{ name: string; address?: string; city?: string }>(() => {
    const props = KostStorage.getProperties();
    return props.length > 0
      ? { name: props[0].name, address: props[0].address, city: props[0].city }
      : { name: "Kost Putri Graha Asri", address: "Margonda, Depok" };
  });
  const [isLoading, setIsLoading] = useState(false);

  // Timeframe selector for charts
  const [cashflowTimeframe, setCashflowTimeframe] = useState<"6m" | "1y" | "30d">("6m");
  const [tenantMetricView, setTenantMetricView] = useState<"occupancy" | "types">("occupancy");

  const loadData = async () => {
    // 1. Sync immediately from local single source of truth
    const mLocal = KostStorage.getOwnerMetrics();
    const rLocal = KostStorage.getRooms();
    const lLocal = KostStorage.getLeases();
    const invLocal = KostStorage.getInvoices();
    const tLocal = KostStorage.getTenants();
    const cashLocal = KostStorage.getCashTransactions();
    const elecLocal = KostStorage.getElectricityTransactions();
    const propsLocal = KostStorage.getProperties();

    setMetrics(mLocal);
    setRooms(rLocal);
    setLeases(lLocal);
    setInvoices(invLocal);
    setTenants(tLocal);
    setCashTransactions(cashLocal);
    setElectricityTransactions(elecLocal);
    if (propsLocal.length > 0) {
      setPropertyInfo({
        name: propsLocal[0].name,
        address: propsLocal[0].address,
        city: propsLocal[0].city,
      });
    }

    // 2. Fetch from backend API if available
    try {
      const [m, r, l, inv, t, cash, elec, props] = await Promise.all([
        KostApiClient.getDashboardSummary().catch(() => null),
        KostApiClient.getRooms().catch(() => null),
        KostApiClient.getLeases().catch(() => null),
        KostApiClient.getInvoices().catch(() => null),
        KostApiClient.getTenants().catch(() => null),
        KostApiClient.getCashTransactions().catch(() => null),
        KostApiClient.getElectricityTransactions().catch(() => null),
        KostApiClient.getProperties().catch(() => null),
      ]);
      if (m) setMetrics(m);
      if (r && r.length > 0) setRooms(r);
      if (l && l.length > 0) setLeases(l);
      if (inv && inv.length > 0) setInvoices(inv);
      if (t && t.length > 0) setTenants(t);
      if (cash && cash.length > 0) setCashTransactions(cash);
      if (elec && elec.length > 0) setElectricityTransactions(elec);
      if (props && props.length > 0) {
        setPropertyInfo({
          name: props[0].name,
          address: props[0].address,
          city: props[0].city,
        });
      }
    } catch {
      // Backend not running; local storage state is active
    }
  };

  useEffect(() => {
    loadData();
    const handleStorageChange = () => loadData();
    window.addEventListener("kost_storage_change", handleStorageChange);
    return () => window.removeEventListener("kost_storage_change", handleStorageChange);
  }, []);

  const activeMetrics = metrics || KostStorage.getOwnerMetrics();

  // Aggregate real transactions from Finance Tracker by month (PRIMARY KEY / SINGLE SOURCE OF TRUTH)
  const transactionsByMonth: Record<string, { income: number; expense: number; count: number }> = {};
  cashTransactions.forEach((tx) => {
    const m = tx.date.slice(0, 7); // e.g. "2026-03"
    if (!transactionsByMonth[m]) {
      transactionsByMonth[m] = { income: 0, expense: 0, count: 0 };
    }
    transactionsByMonth[m].count += 1;
    if (tx.type === "income") {
      transactionsByMonth[m].income += tx.amount;
    } else {
      transactionsByMonth[m].expense += tx.amount;
    }
  });

  // Current active month dynamic figures (March 2026)
  const currentMonthKey = "2026-03";
  const currentMonthData = transactionsByMonth[currentMonthKey] || {
    income: 0,
    expense: 0,
    count: 0,
  };

  // 1. Data Cashflow: Pemasukan vs Pengeluaran (Line/Area Chart)
  // Dynamic 6-Month Dataset directly from Cash Transactions Primary Keys
  const monthlyCashflowData = [
    {
      period: "Okt 2025",
      Pemasukan: transactionsByMonth["2025-10"]?.income || 0,
      Pengeluaran: transactionsByMonth["2025-10"]?.expense || 0,
      LabaBersih:
        (transactionsByMonth["2025-10"]?.income || 0) -
        (transactionsByMonth["2025-10"]?.expense || 0),
      okupansi: 78,
    },
    {
      period: "Nov 2025",
      Pemasukan: transactionsByMonth["2025-11"]?.income || 0,
      Pengeluaran: transactionsByMonth["2025-11"]?.expense || 0,
      LabaBersih:
        (transactionsByMonth["2025-11"]?.income || 0) -
        (transactionsByMonth["2025-11"]?.expense || 0),
      okupansi: 83,
    },
    {
      period: "Des 2025",
      Pemasukan: transactionsByMonth["2025-12"]?.income || 0,
      Pengeluaran: transactionsByMonth["2025-12"]?.expense || 0,
      LabaBersih:
        (transactionsByMonth["2025-12"]?.income || 0) -
        (transactionsByMonth["2025-12"]?.expense || 0),
      okupansi: 88,
    },
    {
      period: "Jan 2026",
      Pemasukan: transactionsByMonth["2026-01"]?.income || 0,
      Pengeluaran: transactionsByMonth["2026-01"]?.expense || 0,
      LabaBersih:
        (transactionsByMonth["2026-01"]?.income || 0) -
        (transactionsByMonth["2026-01"]?.expense || 0),
      okupansi: 85,
    },
    {
      period: "Feb 2026",
      Pemasukan: transactionsByMonth["2026-02"]?.income || 0,
      Pengeluaran: transactionsByMonth["2026-02"]?.expense || 0,
      LabaBersih:
        (transactionsByMonth["2026-02"]?.income || 0) -
        (transactionsByMonth["2026-02"]?.expense || 0),
      okupansi: 88,
    },
    {
      period: "Mar 2026 (Kini)",
      Pemasukan: currentMonthData.income,
      Pengeluaran: currentMonthData.expense,
      LabaBersih: currentMonthData.income - currentMonthData.expense,
      okupansi: metrics.occupancyRate || 92,
    },
  ];

  // Filtered Cashflow Data for 30d, 6m, 1y
  let displayedCashflowData = monthlyCashflowData;
  if (cashflowTimeframe === "30d") {
    displayedCashflowData = [
      {
        period: "Feb 2026",
        Pemasukan: transactionsByMonth["2026-02"]?.income || 0,
        Pengeluaran: transactionsByMonth["2026-02"]?.expense || 0,
        LabaBersih:
          (transactionsByMonth["2026-02"]?.income || 0) -
          (transactionsByMonth["2026-02"]?.expense || 0),
        okupansi: 88,
      },
      {
        period: "Mar 2026 (Kini)",
        Pemasukan: currentMonthData.income,
        Pengeluaran: currentMonthData.expense,
        LabaBersih: currentMonthData.income - currentMonthData.expense,
        okupansi: metrics.occupancyRate || 92,
      },
    ];
  } else if (cashflowTimeframe === "1y") {
    const q1Income =
      (transactionsByMonth["2026-01"]?.income || 0) +
      (transactionsByMonth["2026-02"]?.income || 0) +
      currentMonthData.income;
    const q1Expense =
      (transactionsByMonth["2026-01"]?.expense || 0) +
      (transactionsByMonth["2026-02"]?.expense || 0) +
      currentMonthData.expense;

    const q4Income = transactionsByMonth["2025-12"]?.income || 0;
    const q4Expense = transactionsByMonth["2025-12"]?.expense || 0;

    const q3Income = (transactionsByMonth["2025-10"]?.income || 0) + (transactionsByMonth["2025-11"]?.income || 0);
    const q3Expense = (transactionsByMonth["2025-10"]?.expense || 0) + (transactionsByMonth["2025-11"]?.expense || 0);

    displayedCashflowData = [
      { period: "Q3 2025", Pemasukan: q3Income, Pengeluaran: q3Expense, LabaBersih: q3Income - q3Expense, okupansi: 82 },
      { period: "Q4 2025", Pemasukan: q4Income, Pengeluaran: q4Expense, LabaBersih: q4Income - q4Expense, okupansi: 88 },
      { period: "Q1 2026", Pemasukan: q1Income, Pengeluaran: q1Expense, LabaBersih: q1Income - q1Expense, okupansi: 92 },
    ];
  }

  // Current Active Period Summary Figures
  const totalPeriodIncome =
    cashflowTimeframe === "30d"
      ? currentMonthData.income
      : displayedCashflowData.reduce((s, d) => s + d.Pemasukan, 0);

  const totalPeriodExpense =
    cashflowTimeframe === "30d"
      ? currentMonthData.expense
      : displayedCashflowData.reduce((s, d) => s + d.Pengeluaran, 0);

  const totalPeriodNet = totalPeriodIncome - totalPeriodExpense;

  const netMarginPercent =
    totalPeriodIncome > 0
      ? Math.round(((totalPeriodIncome - totalPeriodExpense) / totalPeriodIncome) * 1000) / 10
      : totalPeriodExpense > 0
      ? -100
      : 0;

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
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
              Executive Dashboard & Financial Analytics
            </h2>
            <Badge variant="lime">Live Tracking</Badge>
          </div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
            Pelacakan diagram arus kas (pemasukan & pengeluaran), metrik revenue, dan analitik okupansi penghuni.
          </p>
        </div>

        <div className="flex items-center gap-2">
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

      {/* Flagship Hero Showcase Bento Card */}
      <div className="relative overflow-hidden rounded-3xl p-7 sm:p-9 bento-hero shadow-spatial border border-white/60 dark:border-white/10 flex flex-col justify-between min-h-[340px]">
        {/* Top Badges */}
        <div className="flex items-center gap-2">
          <span className="glass-pill px-3.5 py-1 text-xs font-bold text-neutral-900 dark:text-white rounded-full">
            Bulan Berjalan · Q1 2026
          </span>
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            Kost ERP Pro Analytics
          </span>
        </div>

        {/* Large Title & Subtitle */}
        <div className="my-5">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-neutral-900 dark:text-white">
            {propertyInfo.name}
          </h1>
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mt-1 max-w-xl">
            Operasional Properti{propertyInfo.city ? ` · ${propertyInfo.city}` : propertyInfo.address ? ` · ${propertyInfo.address.split(",")[0]}` : ""} · {metrics.totalRooms} Unit Kamar Total · Smart WA Webhook
          </p>
        </div>

        {/* Overlapping Translucent Frosted Glass Metric Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3">
          {/* Metric 1: Okupansi */}
          <div className="glass-pill rounded-2xl p-3.5 flex items-center gap-3 transition-transform hover:scale-[1.02]">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#D9FF43] text-[#0A0A0A] shadow-xs">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Tingkat Okupansi
              </p>
              <p className="text-lg font-black text-neutral-900 dark:text-white leading-tight">
                {metrics.occupancyRate}% ({metrics.occupiedRooms}/{metrics.totalRooms} Unit)
              </p>
            </div>
          </div>

          {/* Metric 2: Revenue */}
          <div className="glass-pill rounded-2xl p-3.5 flex items-center gap-3 transition-transform hover:scale-[1.02]">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0A0A0A] text-white shadow-xs dark:bg-white dark:text-[#0A0A0A]">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Penerimaan Sewa Terverifikasi
              </p>
              <p className="text-lg font-black text-neutral-900 dark:text-white leading-tight">
                {formatRupiah(metrics.currentMonthRevenue)}
              </p>
            </div>
          </div>

          {/* Metric 3: Total Tunggakan */}
          <div
            onClick={() => onNavigateTab && onNavigateTab("billing")}
            className="glass-pill rounded-2xl p-3.5 flex items-center gap-3 transition-transform hover:scale-[1.02] cursor-pointer"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 shadow-xs">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Total Tunggakan Sewa
              </p>
              <p className="text-lg font-black text-rose-600 dark:text-rose-400 leading-tight">
                {formatRupiah(metrics.totalUnpaidAmount)}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Card Footer */}
        <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-neutral-300/40 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="flex items-center -space-x-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D9FF43] text-[10px] font-bold text-neutral-900 ring-2 ring-white">
                {metrics.availableRooms}
              </span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0A0A0A] text-[10px] font-bold text-white ring-2 ring-white">
                {metrics.occupiedRooms}
              </span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white ring-2 ring-white">
                {metrics.maintenanceRooms}
              </span>
            </div>
            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              {metrics.availableRooms} Kamar Siap Huni · Status Terhubung
            </span>
          </div>

          <Button
            variant="default"
            onClick={() => onNavigateTab && onNavigateTab("rooms")}
            className="gap-2 shadow-md hover:scale-105"
          >
            <span>Inventaris Kamar</span>
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 4 Core High-Level KPI Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Okupansi */}
        <StatCard
          title="Tingkat Okupansi"
          value={`${metrics.occupancyRate}%`}
          subtitle={`${metrics.occupiedRooms} dari ${metrics.totalRooms} Unit Terisi`}
          icon={Building2}
          variant="blue"
          trend={{
            value: `${metrics.availableRooms} Kamar Siap Huni`,
            isPositive: true,
          }}
        />

        {/* Realisasi Kas Masuk (Revenue) */}
        <StatCard
          title="Realisasi Revenue"
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

        {/* Laba Bersih Token Listrik */}
        <StatCard
          title="Laba Bersih Token PLN"
          value={`+${formatRupiah(metrics.electricityProfitTotal)}`}
          subtitle={`${metrics.electricityTransactionsCount} Transaksi Distribusi`}
          icon={Zap}
          variant="amber"
          trend={{
            value: "100% Margin Bersih",
            isPositive: true,
          }}
        />

        {/* Total Tunggakan */}
        <StatCard
          title="Unpaid Invoices"
          value={formatRupiah(metrics.totalUnpaidAmount)}
          subtitle={`${metrics.unpaidInvoicesCount} Kamar Belum Bayar`}
          icon={AlertCircle}
          variant="rose"
          trend={{
            value: "Perlu Reminder WA",
            isPositive: false,
          }}
        />
      </div>

      {/* SECTION 1: DIAGRAM GARIS PEMASUKAN DAN PENGELUARAN (CASHFLOW TREND TRACKER) */}
      <div className="rounded-3xl border border-white/80 bg-white p-6 sm:p-7 shadow-spatial dark:bg-[#18181B] dark:border-white/10">
        {/* Chart Header & Controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-100 pb-5 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black tracking-tight text-neutral-900 dark:text-white">
                Diagram Arus Kas: Pemasukan vs Pengeluaran
              </h3>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                  netMarginPercent >= 0
                    ? "bg-[#D9FF43] text-[#0A0A0A]"
                    : "bg-rose-500 text-white"
                }`}
              >
                Net Margin {netMarginPercent}%
              </span>
            </div>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
              Tren komparasi pemasukan sewa, beban operasional listrik & maintenance, serta laba bersih per periode.
            </p>
          </div>

          {/* Timeframe Selector Capsule */}
          <div className="flex items-center gap-1 rounded-full bg-neutral-100 p-1 dark:bg-neutral-800 shrink-0">
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
                  netMarginPercent >= 0
                    ? "text-[#0A0A0A] bg-[#D9FF43]"
                    : "text-white bg-rose-500"
                }`}
              >
                {netMarginPercent}% Margin
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
                contentStyle={{
                  backgroundColor: "#0A0A0A",
                  borderColor: "#27272A",
                  borderRadius: "1.25rem",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: "600",
                  padding: "12px 16px",
                  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)",
                }}
                formatter={(val: number, name: string) => [formatRupiah(val), name]}
              />

              {/* Area 1: Pemasukan */}
              <Area
                type="monotone"
                dataKey="Pemasukan"
                stroke="#10B981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#incomeGradient)"
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
              />

              {/* Line 3: Laba Bersih */}
              <Line
                type="monotone"
                dataKey="LabaBersih"
                stroke="#84CC16"
                strokeWidth={3}
                dot={{ r: 4, fill: "#D9FF43", strokeWidth: 2, stroke: "#0A0A0A" }}
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
                Log Penerimaan Kas Masuk Terverifikasi
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Transaksi sewa dan deposit yang telah disetujui mutasinya
              </p>
            </div>
            <Badge variant="lime">Live Audit</Badge>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-white/5">
            {metrics.recentPayments.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500">
                Belum ada mutasi pembayaran terverifikasi.
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
                {invoices.filter((i) => i.status !== "paid").length} Tertunda
              </span>
            </div>

            <div className="mt-3 space-y-2.5">
              {invoices
                .filter((i) => i.status !== "paid")
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
                        {formatRupiah(inv.total_amount)}
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
