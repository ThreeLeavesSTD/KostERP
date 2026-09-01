"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingDown,
  TrendingUp,
  Wallet,
  Plus,
  Search,
  Download,
  Calendar,
  CreditCard,
  Edit2,
  Trash2,
  Receipt,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Percent,
  CheckCircle2,
  MoreVertical,
  SlidersHorizontal,
  FolderKanban,
  ArrowRight,
  Building2,
  Scan,
} from "lucide-react";
import { CashTransaction, TransactionType, UserRole, FinanceWallet, WalletKind, FinanceCategory } from "@/types";
import { KostStorage } from "@/lib/storage";
import { formatRupiah, formatDateIndo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CashTransactionModal } from "./cash-transaction-modal";
import { WalletModal } from "./wallet-modal";
import { WalletCategoriesModal } from "./wallet-categories-modal";
import { notify } from "@/lib/notify";

interface CashFlowViewProps {
  currentRole?: UserRole;
}

type MainViewMode = "wallets" | "transactions";
type TimeFilter = "all" | "today" | "week" | "month" | "year" | "custom";

export function CashFlowView({ currentRole = "owner" }: CashFlowViewProps) {
  // Main View Toggle: "wallets" (Screenshot 1) vs "transactions" (Screenshot 4)
  const [mainViewMode, setMainViewMode] = useState<MainViewMode>("wallets");

  // State Data
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [wallets, setWallets] = useState<FinanceWallet[]>([]);
  const [walletBalances, setWalletBalances] = useState<
    { wallet: FinanceWallet; balance: number; totalIncome: number; totalExpense: number }[]
  >([]);

  // Modals
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<CashTransaction | null>(null);

  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [walletToEdit, setWalletToEdit] = useState<FinanceWallet | null>(null);
  const [walletModalKind, setWalletModalKind] = useState<WalletKind>("asset");

  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);

  // Filters for Transactions View (Screenshot 4)
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [walletFilter, setWalletFilter] = useState("all");

  const loadData = () => {
    const list = KostStorage.getCashTransactions();
    const wals = KostStorage.getWallets();
    const balances = KostStorage.getWalletBalances();
    setTransactions(list);
    setWallets(wals);
    setWalletBalances(balances);
  };

  useEffect(() => {
    loadData();
    const handleStorageChange = () => loadData();
    window.addEventListener("kost_storage_change", handleStorageChange);
    return () => window.removeEventListener("kost_storage_change", handleStorageChange);
  }, []);

  // Assets and Liabilities Separation
  const assetWallets = walletBalances.filter((wb) => wb.wallet.wallet_kind !== "liability");
  const liabilityWallets = walletBalances.filter((wb) => wb.wallet.wallet_kind === "liability");

  const totalAssets = assetWallets.reduce((acc, wb) => acc + wb.balance, 0);
  const totalLiabilities = liabilityWallets.reduce((acc, wb) => acc + wb.balance, 0);
  const netWorth = totalAssets - totalLiabilities;

  // Filtered Transactions
  const filteredTransactions = transactions.filter((tx) => {
    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = tx.title.toLowerCase().includes(q);
      const matchNotes = tx.notes?.toLowerCase().includes(q);
      const matchCat = tx.category_name?.toLowerCase().includes(q) || tx.category.toLowerCase().includes(q);
      const matchWallet = tx.wallet_name?.toLowerCase().includes(q) || tx.payment_method.toLowerCase().includes(q);
      if (!matchTitle && !matchNotes && !matchCat && !matchWallet) return false;
    }

    // Category Filter
    if (categoryFilter !== "all") {
      const matchCat = tx.category === categoryFilter || tx.category_name === categoryFilter;
      if (!matchCat) return false;
    }

    // Wallet Filter
    if (walletFilter !== "all") {
      const matchWallet = tx.wallet_id === walletFilter || tx.wallet_name?.toLowerCase() === walletFilter.toLowerCase();
      if (!matchWallet) return false;
    }

    // Time Filters
    if (timeFilter === "custom") {
      if (fromDate && tx.date < fromDate) return false;
      if (toDate && tx.date > toDate) return false;
    } else if (timeFilter === "today") {
      const today = new Date().toISOString().slice(0, 10);
      if (tx.date !== today) return false;
    } else if (timeFilter === "month") {
      const currentMonth = new Date().toISOString().slice(0, 7);
      if (!tx.date.startsWith(currentMonth)) return false;
    } else if (timeFilter === "year") {
      const currentYear = new Date().getFullYear().toString();
      if (!tx.date.startsWith(currentYear)) return false;
    }

    return true;
  });

  // Calculate Income, Expense, and Net Margin for Transactions View
  let totalIncome = 0;
  let totalExpense = 0;
  filteredTransactions.forEach((tx) => {
    if (tx.type === "income") totalIncome += tx.amount;
    else totalExpense += tx.amount;
  });
  const netMargin = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 1000) / 10 : 0;

  const handleDeleteTransaction = async (tx: CashTransaction) => {
    const ok = await notify.confirmDelete({
      title: "Hapus Catatan Transaksi?",
      itemName: tx.title,
      itemType: tx.type === "income" ? "Pemasukan Kas" : "Pengeluaran Kas",
      itemDetails: `${tx.category_name || tx.category} • ${formatRupiah(tx.amount)} • ${tx.date}`,
      message: `Apakah Anda yakin ingin menghapus catatan pembukuan "${tx.title}" senilai ${formatRupiah(tx.amount)}?`,
      warningNote: "Saldo dompet kas/rekening terkait akan dihitung ulang secara otomatis.",
      confirmText: "Hapus Transaksi Permanen",
      cancelText: "Batalkan",
    });
    if (ok) {
      KostStorage.deleteCashTransaction(tx.id);
      loadData();
      notify.deleted(tx.title, "Transaksi");
    }
  };

  const handleExportCsv = () => {
    const headers = ["ID", "Tanggal", "Tipe", "Kategori", "Dompet/Rekening", "Keterangan", "Nominal (Rp)", "Pencatat", "Catatan"];
    const rows = filteredTransactions.map((tx) => [
      tx.id,
      tx.date,
      tx.type === "income" ? "Pemasukan" : "Pengeluaran",
      tx.category_name || tx.category,
      tx.wallet_name || tx.payment_method || "-",
      `"${tx.title.replace(/"/g, '""')}"`,
      tx.amount,
      tx.recorded_by || "-",
      `"${(tx.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan_transaksi_kas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-20 relative">
      {/* Top View Mode Switcher Capsule */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-neutral-200/80 dark:border-white/10">
        <div className="flex items-center gap-1.5 p-1 bg-white/80 dark:bg-[#18181B] rounded-2xl border border-neutral-200/80 dark:border-white/10 shadow-spatial w-fit">
          <button
            onClick={() => setMainViewMode("wallets")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              mainViewMode === "wallets"
                ? "bg-[#0A0A0A] text-[#D9FF43] shadow-spatial dark:bg-white dark:text-[#0A0A0A]"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            }`}
          >
            <Wallet className="h-4 w-4" />
            <span>💳 Wallets & Aset</span>
          </button>

          <button
            onClick={() => setMainViewMode("transactions")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              mainViewMode === "transactions"
                ? "bg-[#0A0A0A] text-[#D9FF43] shadow-spatial dark:bg-white dark:text-[#0A0A0A]"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            }`}
          >
            <Receipt className="h-4 w-4" />
            <span>📜 Transactions ({transactions.length})</span>
          </button>
        </div>

        {/* Global Quick Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCategoriesModalOpen(true)}
            className="rounded-2xl border-neutral-200/80 bg-white font-bold text-xs shadow-spatial dark:bg-[#18181B] dark:border-neutral-700"
          >
            <FolderKanban className="h-3.5 w-3.5 mr-1.5 text-neutral-500" />
            <span>Kategori Dompet</span>
          </Button>

          <Button
            variant="lime"
            size="sm"
            onClick={() => {
              setTransactionToEdit(null);
              setIsTransactionModalOpen(true);
            }}
            className="rounded-2xl font-black text-xs shadow-lime-glow"
          >
            <Plus className="h-4 w-4 mr-1" />
            <span>+ New Transaction</span>
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. WALLETS VIEW (LAYOUT & CONCEPT MATCHING SCREENSHOT 1) */}
      {/* ========================================================================= */}
      {mainViewMode === "wallets" && (
        <div className="space-y-6">
          {/* Header Title matching Screenshot 1 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0A0A0A] text-[#D9FF43] font-black text-lg shadow-spatial dark:bg-white dark:text-[#0A0A0A]">
                💳
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
                  Wallets
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Manage your assets and liabilities.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCategoriesModalOpen(true)}
              className="rounded-2xl border-neutral-200/80 bg-white font-black text-xs shadow-spatial dark:bg-[#18181B] dark:border-neutral-700"
            >
              <FolderKanban className="h-3.5 w-3.5 mr-1.5 text-[#D9FF43] fill-[#D9FF43]/20" />
              <span>Kategori Dompet</span>
            </Button>
          </div>

          {/* NET WORTH HERO BANNER (MATCHING SCREENSHOT 1) */}
          <div className="rounded-3xl bg-[#0A0A0A] text-white p-6 sm:p-7 shadow-spatial border border-neutral-800 dark:bg-[#18181B] dark:border-white/10 relative overflow-hidden">
            {/* Background subtle glow */}
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#D9FF43]/5 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Left 7 Cols: Net Worth */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center gap-2 text-[#D9FF43] font-black text-xs tracking-wider uppercase">
                  <span>💵</span>
                  <span>NET WORTH</span>
                </div>

                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-mono">
                  {formatRupiah(netWorth)}
                </h1>

                {/* Glowing Progress bar matching reference */}
                <div className="space-y-1 pt-1">
                  <div className="h-1.5 w-full rounded-full bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 via-[#D9FF43] to-emerald-400 rounded-full"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <p className="text-[11px] font-bold text-neutral-400">
                    100% of total assets
                  </p>
                </div>
              </div>

              {/* Right 5 Cols: Total Assets & Liabilities Pods */}
              <div className="lg:col-span-5 grid grid-cols-2 gap-4 border-t lg:border-t-0 lg:border-l border-neutral-800 lg:pl-6 pt-4 lg:pt-0">
                {/* Total Assets */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-black">
                    <ArrowUpRight className="h-4 w-4" />
                    <span>TOTAL ASSETS</span>
                  </div>
                  <p className="text-lg sm:text-xl font-black text-white font-mono">
                    {formatRupiah(totalAssets)}
                  </p>
                  <p className="text-[11px] text-neutral-400 font-medium">
                    {assetWallets.length} accounts
                  </p>
                </div>

                {/* Total Liabilities */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-400 text-xs font-black">
                    <ArrowDownLeft className="h-4 w-4" />
                    <span>TOTAL LIABILITIES</span>
                  </div>
                  <p className="text-lg sm:text-xl font-black text-white font-mono">
                    {formatRupiah(totalLiabilities)}
                  </p>
                  <p className="text-[11px] text-neutral-400 font-medium">
                    {liabilityWallets.length} accounts
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ASSETS SECTION (MATCHING SCREENSHOT 1) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
                <h3 className="text-base font-black text-neutral-900 dark:text-white">
                  Assets
                </h3>
                <span className="rounded-full bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 text-xs font-black text-neutral-700 dark:text-neutral-300">
                  {assetWallets.length}
                </span>
              </div>

              <button
                onClick={() => {
                  setWalletToEdit(null);
                  setWalletModalKind("asset");
                  setIsWalletModalOpen(true);
                }}
                className="flex items-center gap-1.5 text-xs font-black text-neutral-900 hover:text-[#0A0A0A] dark:text-[#D9FF43] hover:underline"
              >
                <Plus className="h-4 w-4" />
                <span>Add Asset</span>
              </button>
            </div>

            {/* Assets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {assetWallets.map(({ wallet, balance }) => {
                const portion = totalAssets > 0 ? Math.round((balance / totalAssets) * 1000) / 10 : 0;
                return (
                  <div
                    key={wallet.id}
                    onClick={() => {
                      setWalletToEdit(wallet);
                      setWalletModalKind("asset");
                      setIsWalletModalOpen(true);
                    }}
                    className="p-5 rounded-3xl bg-white dark:bg-[#18181B] border border-neutral-200/80 dark:border-white/10 shadow-spatial hover:border-[#D9FF43] dark:hover:border-[#D9FF43]/50 transition-all cursor-pointer group space-y-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0A0A0A] text-[#D9FF43] text-lg font-black dark:bg-neutral-800 shadow-xs group-hover:scale-105 transition-transform">
                        {wallet.icon === "bank" ? "🏦" : wallet.icon === "cash" ? "💵" : wallet.icon === "ewallet" ? "📱" : "💵"}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-neutral-900 dark:text-white">
                          {wallet.name}
                        </h4>
                        <p className="text-xs font-medium text-neutral-400">
                          {wallet.category_name || "Business"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xl font-black font-mono text-neutral-900 dark:text-white">
                        {formatRupiah(balance)}
                      </p>
                    </div>

                    {/* Progress Portion Bar matching Reference */}
                    <div className="space-y-1">
                      <div className="h-1.5 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(portion, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 font-bold">
                        <span>Porsi aset</span>
                        <span>{portion}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add Asset Empty Card matching Reference */}
              <div
                onClick={() => {
                  setWalletToEdit(null);
                  setWalletModalKind("asset");
                  setIsWalletModalOpen(true);
                }}
                className="p-6 rounded-3xl border-2 border-dashed border-neutral-200 dark:border-white/10 hover:border-neutral-400 dark:hover:border-white/30 flex flex-col items-center justify-center gap-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-all cursor-pointer min-h-[160px]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-lg">
                  +
                </div>
                <span className="text-xs font-black">Add Asset</span>
              </div>
            </div>
          </div>

          {/* LIABILITIES SECTION (MATCHING SCREENSHOT 1) */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  <ArrowDownLeft className="h-4 w-4" />
                </div>
                <h3 className="text-base font-black text-neutral-900 dark:text-white">
                  Liabilities
                </h3>
                <span className="rounded-full bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 text-xs font-black text-neutral-700 dark:text-neutral-300">
                  {liabilityWallets.length}
                </span>
              </div>

              <button
                onClick={() => {
                  setWalletToEdit(null);
                  setWalletModalKind("liability");
                  setIsWalletModalOpen(true);
                }}
                className="flex items-center gap-1.5 text-xs font-black text-rose-600 hover:underline"
              >
                <Plus className="h-4 w-4" />
                <span>Add Liability</span>
              </button>
            </div>

            {/* Liabilities Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {liabilityWallets.map(({ wallet, balance }) => (
                <div
                  key={wallet.id}
                  onClick={() => {
                    setWalletToEdit(wallet);
                    setWalletModalKind("liability");
                    setIsWalletModalOpen(true);
                  }}
                  className="p-5 rounded-3xl bg-white dark:bg-[#18181B] border border-neutral-200/80 dark:border-white/10 shadow-spatial hover:border-rose-500 transition-all cursor-pointer group space-y-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 text-lg font-black dark:bg-rose-950/40">
                      📉
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-neutral-900 dark:text-white">
                        {wallet.name}
                      </h4>
                      <p className="text-xs font-medium text-neutral-400">
                        {wallet.category_name || "Hutang Vendor"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xl font-black font-mono text-rose-600 dark:text-rose-400">
                      {formatRupiah(balance)}
                    </p>
                  </div>
                </div>
              ))}

              {/* Add Liability Empty Card */}
              <div
                onClick={() => {
                  setWalletToEdit(null);
                  setWalletModalKind("liability");
                  setIsWalletModalOpen(true);
                }}
                className="p-6 rounded-3xl border-2 border-dashed border-neutral-200 dark:border-white/10 hover:border-neutral-400 dark:hover:border-white/30 flex flex-col items-center justify-center gap-2 text-neutral-400 hover:text-rose-600 transition-all cursor-pointer min-h-[140px]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-lg">
                  +
                </div>
                <span className="text-xs font-black">Add Liability</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TRANSACTIONS VIEW (LAYOUT & CONCEPT MATCHING SCREENSHOT 4) */}
      {/* ========================================================================= */}
      {mainViewMode === "transactions" && (
        <div className="space-y-6">
          {/* Header Title matching Screenshot 4 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0A0A0A] text-[#D9FF43] font-black text-lg shadow-spatial dark:bg-white dark:text-[#0A0A0A]">
                🧾
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
                  Transactions
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Where does your money go?
                </p>
              </div>
            </div>

            {/* Actions Pills matching Screenshot 4 */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCategoriesModalOpen(true)}
                className="rounded-2xl border-neutral-200 bg-white font-bold text-xs shadow-spatial dark:bg-[#18181B] dark:border-neutral-700"
              >
                <FolderKanban className="h-3.5 w-3.5 mr-1.5" />
                <span>Kategori</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setMainViewMode("wallets")}
                className="rounded-2xl border-neutral-200 bg-white font-bold text-xs shadow-spatial dark:bg-[#18181B] dark:border-neutral-700"
              >
                <Wallet className="h-3.5 w-3.5 mr-1.5" />
                <span>Wallet</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                className="rounded-2xl border-neutral-200 bg-white font-bold text-xs shadow-spatial dark:bg-[#18181B] dark:border-neutral-700"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                <span>Export</span>
              </Button>

              <Button
                variant="lime"
                size="sm"
                onClick={() => {
                  setTransactionToEdit(null);
                  setIsTransactionModalOpen(true);
                }}
                className="rounded-2xl font-black text-xs shadow-lime-glow"
              >
                <Plus className="h-4 w-4 mr-1" />
                <span>+ New Transaction</span>
              </Button>
            </div>
          </div>

          {/* TOP 3 BENTO CARDS MATCHING SCREENSHOT 4 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 1. INCOME CARD */}
            <div className="rounded-3xl bg-[#0A0A0A] text-white p-5 shadow-spatial border border-neutral-800 dark:bg-[#18181B] dark:border-white/10 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                  <ArrowDownLeft className="h-4 w-4" />
                </div>
                <span className="text-xs font-black tracking-wider uppercase text-neutral-400">
                  INCOME
                </span>
              </div>
              <h3 className="text-2xl font-black text-emerald-400 font-mono">
                {formatRupiah(totalIncome)}
              </h3>
            </div>

            {/* 2. EXPENSE CARD */}
            <div className="rounded-3xl bg-[#0A0A0A] text-white p-5 shadow-spatial border border-neutral-800 dark:bg-[#18181B] dark:border-white/10 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
                <span className="text-xs font-black tracking-wider uppercase text-neutral-400">
                  EXPENSE
                </span>
              </div>
              <h3 className="text-2xl font-black text-rose-400 font-mono">
                {formatRupiah(totalExpense)}
              </h3>
            </div>

            {/* 3. NET MARGIN CARD */}
            <div className="rounded-3xl bg-[#0A0A0A] text-white p-5 shadow-spatial border border-neutral-800 dark:bg-[#18181B] dark:border-white/10 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#D9FF43]/20 text-[#D9FF43]">
                  <Percent className="h-4 w-4" />
                </div>
                <span className="text-xs font-black tracking-wider uppercase text-neutral-400">
                  NET MARGIN
                </span>
              </div>
              <h3 className="text-2xl font-black text-[#D9FF43] font-mono">
                {netMargin}%
              </h3>
            </div>
          </div>

          {/* SEARCH & FILTERS CONTAINER MATCHING SCREENSHOT 4 */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#18181B] border border-neutral-200/80 dark:border-white/10 shadow-spatial space-y-4">
            {/* Big Search Bar */}
            <div className="relative">
              <Search className="h-4 w-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search notes, categories, wallets, or recorder..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 dark:bg-neutral-900 py-3 pl-11 pr-4 text-xs font-bold focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:border-white/10 dark:text-white"
              />
            </div>

            {/* Time Filter Capsule & Date Pickers */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {(
                  [
                    { id: "all", label: "ALL" },
                    { id: "today", label: "TODAY" },
                    { id: "month", label: "THIS MONTH" },
                    { id: "year", label: "THIS YEAR" },
                    { id: "custom", label: "📅 CUSTOM" },
                  ] as const
                ).map((tf) => (
                  <button
                    key={tf.id}
                    onClick={() => setTimeFilter(tf.id)}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition-all ${
                      timeFilter === tf.id
                        ? "bg-[#D9FF43] text-[#0A0A0A] shadow-lime-glow"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-400"
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>

              {/* Date Range Pickers (From / To) matching Screenshot 4 */}
              {timeFilter === "custom" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">
                      FROM
                    </label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 dark:bg-neutral-900 px-3.5 py-2 text-xs font-bold dark:border-white/10 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">
                      TO
                    </label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 dark:bg-neutral-900 px-3.5 py-2 text-xs font-bold dark:border-white/10 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Transactions Feed List */}
          <div className="rounded-3xl bg-white shadow-spatial border border-neutral-200/80 dark:bg-[#18181B] dark:border-white/10 overflow-hidden">
            <div className="p-4 border-b border-neutral-100 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-neutral-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                  Transactions ({filteredTransactions.length})
                </h3>
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="p-12 text-center text-neutral-400 space-y-2">
                <Receipt className="h-10 w-10 mx-auto text-neutral-300 dark:text-neutral-600" />
                <p className="text-sm font-bold text-neutral-600 dark:text-neutral-300">
                  No transactions found.
                </p>
                <p className="text-xs">
                  Click <strong>+ New Transaction</strong> to add expenses or incomes.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-white/5">
                {filteredTransactions.map((tx) => {
                  const isExpense = tx.type === "expense";
                  return (
                    <div
                      key={tx.id}
                      className="p-4 hover:bg-neutral-50/70 transition-colors dark:hover:bg-neutral-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      {/* Left: Icon & Info */}
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-black ${
                            isExpense
                              ? "bg-rose-500/10 text-rose-500"
                              : "bg-emerald-500/10 text-emerald-500"
                          }`}
                        >
                          {isExpense ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <ArrowDownLeft className="h-4 w-4" />
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-black text-neutral-900 dark:text-white">
                              {tx.title}
                            </h4>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isExpense
                                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                              }`}
                            >
                              {tx.category_name || tx.category}
                            </span>
                            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 flex items-center gap-1">
                              <Wallet className="h-3 w-3" />
                              <span>{tx.wallet_name || tx.payment_method}</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-neutral-400 flex-wrap">
                            <span>{formatDateIndo(tx.date)}</span>
                            <span>•</span>
                            <span>Recorded by: <strong className="text-neutral-600 dark:text-neutral-300">{tx.recorded_by || "Owner"}</strong></span>
                            {tx.notes && (
                              <>
                                <span>•</span>
                                <span className="italic text-neutral-500">"{tx.notes}"</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount & Actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-13 sm:pl-0">
                        <div className="text-right">
                          <span
                            className={`text-sm font-black font-mono ${
                              isExpense
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {isExpense ? `-${formatRupiah(tx.amount)}` : `+${formatRupiah(tx.amount)}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setTransactionToEdit(tx);
                              setIsTransactionModalOpen(true);
                            }}
                            title="Edit Transaksi"
                            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:text-white dark:hover:bg-neutral-800 transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(tx)}
                            title="Hapus Catatan"
                            className="p-1.5 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FLOATING ACTION BUTTON (FAB) MATCHING SCREENSHOT 1 */}
      <button
        onClick={() => {
          setTransactionToEdit(null);
          setIsTransactionModalOpen(true);
        }}
        title="Quick Add Transaction"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D9FF43] text-[#0A0A0A] shadow-lime-glow hover:scale-110 active:scale-95 transition-all text-2xl font-black"
      >
        +
      </button>

      {/* TRANSACTION MODAL */}
      <CashTransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => {
          setIsTransactionModalOpen(false);
          setTransactionToEdit(null);
        }}
        transactionToEdit={transactionToEdit}
        onSuccess={loadData}
        currentRole={currentRole}
      />

      {/* WALLET / ASSET / LIABILITY MODAL (SCREENSHOT 2) */}
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => {
          setIsWalletModalOpen(false);
          setWalletToEdit(null);
        }}
        walletToEdit={walletToEdit}
        defaultKind={walletModalKind}
        onSuccess={loadData}
      />

      {/* WALLET CATEGORIES MODAL (SCREENSHOT 3) */}
      <WalletCategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
        onUpdate={loadData}
      />
    </div>
  );
}
