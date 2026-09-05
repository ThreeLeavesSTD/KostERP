"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet,
  Tag,
  Plus,
  Trash2,
  Building2,
  Smartphone,
  Coins,
  Shield,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FinanceWallet, FinanceCategory, TransactionType } from "@/types";
import { KostApiClient } from "@/lib/api-client";
import { formatRupiah } from "@/lib/utils";
import { notify } from "@/lib/notify";

interface ManageWalletsCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function ManageWalletsCategoriesModal({
  isOpen,
  onClose,
  onUpdate,
}: ManageWalletsCategoriesModalProps) {
  const [activeTab, setActiveTab] = useState<"wallets" | "wallet-categories" | "tx-categories">("wallets");
  
  // Wallet Category Sub-type: Asset (Bank/Ewallet/Cash) vs Liability (Hutang)
  const [walletKindType, setWalletKindType] = useState<"asset" | "liability">("asset");
  
  // Transaction Category Sub-type: Expense (Operasional/Biaya) vs Income (Sewa/Token)
  const [txCategoryType, setTxCategoryType] = useState<TransactionType>("expense");

  const [wallets, setWallets] = useState<FinanceWallet[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);

  // New Wallet Form
  const [newWalletName, setNewWalletName] = useState("");
  const [newWalletType, setNewWalletType] = useState<"cash" | "bank" | "ewallet">("bank");
  const [newWalletAccount, setNewWalletAccount] = useState("");
  const [newWalletBalance, setNewWalletBalance] = useState<number>(0);

  // New Wallet Category Form (e.g. BANK, E-Wallet, Kas Tunai)
  const [newWalletCatName, setNewWalletCatName] = useState("");

  // New Transaction Category Form (e.g. Operasional Kost, Listrik PLN, WiFi)
  const [newTxCatName, setNewTxCatName] = useState("");

  const loadData = async () => {
    try {
      const [w, c] = await Promise.all([
        KostApiClient.getWallets(),
        KostApiClient.getFinanceCategories(),
      ]);
      setWallets(w);
      setCategories(c);
    } catch (err) {
      console.error("Gagal memuat wallet/categories:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWalletName.trim()) return;

    try {
      await KostApiClient.createWallet({
        name: newWalletName.trim(),
        wallet_kind: "asset",
        type: newWalletType,
        account_number: newWalletAccount.trim() || undefined,
        initial_balance: Number(newWalletBalance) || 0,
        color: newWalletType === "cash" ? "#D9FF43" : newWalletType === "bank" ? "#3B82F6" : "#10B981",
      });

      setNewWalletName("");
      setNewWalletAccount("");
      setNewWalletBalance(0);
      await loadData();
      onUpdate();
    } catch (err: any) {
      notify.alert({ title: "Gagal Tambah Dompet", message: err.message, variant: "danger" });
    }
  };

  const handleDeleteWallet = async (wallet: FinanceWallet) => {
    const ok = await notify.confirmDelete({
      title: `Hapus Dompet "${wallet.name}"?`,
      itemName: wallet.name,
      itemType: "Akun Dompet",
      itemDetails: `Kategori: ${wallet.category_name} • Nomor Rekening: ${wallet.account_number || "-"}`,
      message: `Apakah Anda yakin ingin menghapus akun dompet/rekening "${wallet.name}"?`,
      warningNote: "Akun ini tidak akan muncul pada pilihan transaksi mendatang.",
      confirmText: "Hapus Dompet",
      cancelText: "Batalkan",
    });
    if (ok) {
      try {
        await KostApiClient.deleteWallet(wallet.id);
        await loadData();
        onUpdate();
        notify.deleted(wallet.name, "Dompet");
      } catch (err: any) {
        notify.alert({ title: "Gagal Menghapus Dompet", message: err.message, variant: "danger" });
      }
    }
  };

  // Tambah Kategori Wallet (BANK, E-Wallet, Kas Tunai, dll)
  const handleAddWalletCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWalletCatName.trim()) return;

    try {
      await KostApiClient.createFinanceCategory({
        name: newWalletCatName.trim(),
        scope: "wallet",
        category_kind: walletKindType,
        icon: walletKindType === "asset" ? "bank" : "liability",
        is_default: false,
      });

      setNewWalletCatName("");
      await loadData();
      onUpdate();
      notify.success("Kategori Wallet Ditambahkan", `Kategori wallet "${newWalletCatName.trim()}" siap digunakan.`);
    } catch (err: any) {
      notify.alert({ title: "Gagal Tambah Kategori Wallet", message: err.message, variant: "danger" });
    }
  };

  // Tambah Kategori Transaksi (Operasional Kost, Listrik, Sewa Kamar, dll)
  const handleAddTxCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTxCatName.trim()) return;

    try {
      await KostApiClient.createFinanceCategory({
        name: newTxCatName.trim(),
        scope: "transaction",
        type: txCategoryType,
        category_kind: txCategoryType,
        icon: txCategoryType === "expense" ? "MoreHorizontal" : "Tag",
        is_default: false,
      });

      setNewTxCatName("");
      await loadData();
      onUpdate();
      notify.success("Kategori Transaksi Ditambahkan", `Kategori transaksi "${newTxCatName.trim()}" siap digunakan.`);
    } catch (err: any) {
      notify.alert({ title: "Gagal Tambah Kategori Transaksi", message: err.message, variant: "danger" });
    }
  };

  const handleDeleteCategory = async (cat: FinanceCategory) => {
    const isWalletCat = cat.scope === "wallet" || cat.category_kind === "asset" || cat.category_kind === "liability";
    const ok = await notify.confirmDelete({
      title: `Hapus Kategori "${cat.name}"?`,
      itemName: cat.name,
      itemType: isWalletCat ? "Kategori Wallet" : "Kategori Transaksi",
      itemDetails: `Tipe: ${isWalletCat ? "Wallet / Rekening" : cat.type === "expense" ? "Pengeluaran (Operasional)" : "Pemasukan"}`,
      message: `Apakah Anda yakin ingin menghapus kategori "${cat.name}"?`,
      confirmText: "Hapus Kategori",
      cancelText: "Batal",
    });
    if (ok) {
      try {
        await KostApiClient.deleteFinanceCategory(cat.id);
        await loadData();
        onUpdate();
        notify.deleted(cat.name, "Kategori");
      } catch (err: any) {
        notify.alert({ title: "Gagal Menghapus Kategori", message: err.message, variant: "danger" });
      }
    }
  };

  // Filter Kategori Wallet: BANK, E-Wallet, Cash, dll
  const filteredWalletCategories = categories.filter((c) => {
    const isWallet =
      c.scope === "wallet" ||
      c.category_kind === "asset" ||
      c.category_kind === "liability" ||
      (!c.type && ["bank", "cash", "e-wallet", "ewallet", "business", "crypto", "digital bank", "hutang vendor", "cicilan / pinjaman", "deposit penghuni"].includes(c.name.toLowerCase()));
    if (!isWallet) return false;
    return walletKindType === "asset" ? c.category_kind !== "liability" : c.category_kind === "liability";
  });

  // Filter Kategori Transaksi: Operasional Kost, Listrik, WiFi, dll
  const filteredTxCategories = categories.filter((c) => {
    const isTx =
      c.scope === "transaction" ||
      c.type === "expense" ||
      c.type === "income" ||
      c.category_kind === "expense" ||
      c.category_kind === "income";
    if (!isTx) return false;
    return c.type === txCategoryType || c.category_kind === txCategoryType;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Kelola Dompet, Kategori Wallet & Transaksi"
      description="Pemisahan jelas antara Kategori Akun Dompet (BANK, E-Wallet) dan Kategori Transaksi (Operasional Kost, Listrik, Sewa)."
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Top 3 Tab Switcher: Wallets, Wallet Categories, Transaction Categories */}
        <div className="flex items-center gap-1.5 border-b border-neutral-100 dark:border-white/10 pb-3 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab("wallets")}
            className={`flex items-center gap-2 rounded-2xl py-2 px-3.5 text-xs font-black transition-all shrink-0 ${
              activeTab === "wallets"
                ? "bg-[#0A0A0A] text-white dark:bg-white dark:text-[#0A0A0A]"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
            }`}
          >
            <Wallet className="h-4 w-4" />
            <span>Akun Dompet ({wallets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("wallet-categories")}
            className={`flex items-center gap-2 rounded-2xl py-2 px-3.5 text-xs font-black transition-all shrink-0 ${
              activeTab === "wallet-categories"
                ? "bg-[#0A0A0A] text-white dark:bg-white dark:text-[#0A0A0A]"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Kategori Wallet (BANK/E-Wallet)</span>
          </button>

          <button
            onClick={() => setActiveTab("tx-categories")}
            className={`flex items-center gap-2 rounded-2xl py-2 px-3.5 text-xs font-black transition-all shrink-0 ${
              activeTab === "tx-categories"
                ? "bg-[#0A0A0A] text-white dark:bg-white dark:text-[#0A0A0A]"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
            }`}
          >
            <Tag className="h-4 w-4" />
            <span>Kategori Transaksi (Operasional)</span>
          </button>
        </div>

        {/* TAB 1: WALLETS */}
        {activeTab === "wallets" && (
          <div className="space-y-4">
            {/* Create Wallet Form */}
            <form onSubmit={handleAddWallet} className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700 space-y-2.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                + Tambah Akun Dompet / Rekening Kas
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Nama Akun (cth: BCA KOST, Mandiri)"
                  value={newWalletName}
                  onChange={(e) => setNewWalletName(e.target.value)}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold focus:outline-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                />
                <select
                  value={newWalletType}
                  onChange={(e) => setNewWalletType(e.target.value as any)}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold focus:outline-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                >
                  <option value="bank">🏦 Rekening Bank</option>
                  <option value="ewallet">📱 QRIS / E-Wallet</option>
                  <option value="cash">💵 Kas Tunai</option>
                </select>
                <input
                  type="text"
                  placeholder="No. Rek (Opsional)"
                  value={newWalletAccount}
                  onChange={(e) => setNewWalletAccount(e.target.value)}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium focus:outline-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Saldo Awal (Rp)"
                  value={newWalletBalance === 0 ? "" : newWalletBalance.toLocaleString("id-ID")}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    const sanitized = raw.replace(/^0+(?!$)/, "");
                    setNewWalletBalance(sanitized === "" ? 0 : parseInt(sanitized, 10));
                  }}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold focus:outline-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="lime" size="sm" className="font-black text-xs">
                  Simpan Dompet Baru
                </Button>
              </div>
            </form>

            {/* Wallets List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {wallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900 font-bold dark:bg-neutral-800 dark:text-white">
                      {wallet.type === "cash" ? "💵" : wallet.type === "bank" ? "🏦" : "📱"}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-neutral-900 dark:text-white">
                        {wallet.name}
                      </h4>
                      <p className="text-[11px] font-medium text-neutral-400">
                        {wallet.account_number ? `No: ${wallet.account_number}` : "Kas Fisik"} · Saldo: {formatRupiah(wallet.initial_balance)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                      {wallet.category_name || "BANK"}
                    </span>

                    <button
                      onClick={() => handleDeleteWallet(wallet)}
                      className="p-1.5 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                      title="Hapus Dompet"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: WALLET CATEGORIES (BANK, E-WALLET, KAS TUNAI, DLL) */}
        {activeTab === "wallet-categories" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWalletKindType("asset")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    walletKindType === "asset"
                      ? "bg-[#D9FF43] text-[#0A0A0A] shadow-lime-glow font-black"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400"
                  }`}
                >
                  🏦 Kategori Aset (Bank / E-Wallet / Kas)
                </button>
                <button
                  onClick={() => setWalletKindType("liability")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    walletKindType === "liability"
                      ? "bg-rose-600 text-white font-black"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400"
                  }`}
                >
                  📉 Kategori Kewajiban (Hutang / Cicilan)
                </button>
              </div>
            </div>

            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Kategori ini khusus menentukan jenis rekening/dompet keuangan (contoh: <strong>BANK</strong>, <strong>E-Wallet</strong>, <strong>Kas Tunai</strong>).
            </p>

            {/* Create Wallet Category Form */}
            <form onSubmit={handleAddWalletCategory} className="flex items-center gap-2 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700">
              <input
                type="text"
                required
                placeholder="Tambah kategori wallet baru (cth: BANK, E-Wallet, Koperasi)..."
                value={newWalletCatName}
                onChange={(e) => setNewWalletCatName(e.target.value)}
                className="flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold focus:outline-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
              />
              <Button type="submit" variant="lime" size="sm" className="font-black text-xs shrink-0">
                + Tambah Kategori Wallet
              </Button>
            </form>

            {/* Wallet Category List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {filteredWalletCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-700"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-neutral-100 text-xs font-bold dark:bg-neutral-800">
                      🏷️
                    </span>
                    <span className="text-xs font-black text-neutral-900 dark:text-white">
                      {cat.name}
                    </span>
                  </div>

                  {!cat.is_default && (
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-1 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                      title="Hapus Kategori Wallet"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: TRANSACTION CATEGORIES (OPERASIONAL KOST, LISTRIK, SEWA KAMAR, DLL) */}
        {activeTab === "tx-categories" && (
          <div className="space-y-4">
            {/* Category Type Switcher */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTxCategoryType("expense")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  txCategoryType === "expense"
                    ? "bg-rose-600 text-white font-black"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400"
                }`}
              >
                💸 Pengeluaran (Operasional Kost, WiFi, Gaji)
              </button>
              <button
                onClick={() => setTxCategoryType("income")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  txCategoryType === "income"
                    ? "bg-emerald-600 text-white font-black"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400"
                }`}
              >
                💰 Pemasukan (Sewa Kamar, Token PLN)
              </button>
            </div>

            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Kategori ini digunakan saat mencatat transaksi operasional (contoh: <strong>Operasional Kost</strong>, <strong>Listrik PLN</strong>, <strong>WiFi</strong>, <strong>Sewa Kamar</strong>).
            </p>

            {/* Create Category Form */}
            <form onSubmit={handleAddTxCategory} className="flex items-center gap-2 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700">
              <input
                type="text"
                required
                placeholder={`Nama kategori ${txCategoryType === "expense" ? "pengeluaran (cth: Operasional Kost)" : "pemasukan (cth: Sewa Kamar)"}...`}
                value={newTxCatName}
                onChange={(e) => setNewTxCatName(e.target.value)}
                className="flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold focus:outline-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
              />
              <Button type="submit" variant="lime" size="sm" className="font-black text-xs shrink-0">
                + Tambah Kategori Transaksi
              </Button>
            </form>

            {/* Category List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {filteredTxCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-700"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-neutral-100 text-xs font-bold dark:bg-neutral-800">
                      {txCategoryType === "expense" ? "💸" : "💰"}
                    </span>
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">
                      {cat.name}
                    </span>
                  </div>

                  {!cat.is_default && (
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-1 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                      title="Hapus Kategori Transaksi"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-neutral-100 dark:border-white/10">
          <Button variant="default" size="sm" onClick={onClose} className="text-xs font-bold">
            Selesai
          </Button>
        </div>
      </div>
    </Modal>
  );
}
