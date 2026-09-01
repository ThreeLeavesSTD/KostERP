"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet,
  Tag,
  Plus,
  Trash2,
  Edit2,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Check,
  Building2,
  DollarSign,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FinanceWallet, FinanceCategory, TransactionType } from "@/types";
import { KostStorage } from "@/lib/storage";
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
  const [activeTab, setActiveTab] = useState<"wallets" | "categories">("wallets");
  const [categoryType, setCategoryType] = useState<TransactionType>("expense");

  const [wallets, setWallets] = useState<FinanceWallet[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);

  // New Wallet Form
  const [newWalletName, setNewWalletName] = useState("");
  const [newWalletType, setNewWalletType] = useState<"cash" | "bank" | "ewallet">("bank");
  const [newWalletAccount, setNewWalletAccount] = useState("");
  const [newWalletBalance, setNewWalletBalance] = useState<number>(0);

  // New Category Form
  const [newCategoryName, setNewCategoryName] = useState("");

  const loadData = () => {
    setWallets(KostStorage.getWallets());
    setCategories(KostStorage.getFinanceCategories());
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleAddWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWalletName.trim()) return;

    const props = KostStorage.getProperties();
    KostStorage.addWallet({
      property_id: props[0]?.id || "prop-01",
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
    loadData();
    onUpdate();
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
      KostStorage.deleteWallet(wallet.id);
      loadData();
      onUpdate();
      notify.deleted(wallet.name, "Dompet");
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    KostStorage.addFinanceCategory({
      name: newCategoryName.trim(),
      type: categoryType,
      is_default: false,
    });

    setNewCategoryName("");
    loadData();
    onUpdate();
    notify.success("Kategori Ditambahkan", `Kategori "${newCategoryName.trim()}" berhasil dibuat.`);
  };

  const handleDeleteCategory = async (cat: FinanceCategory) => {
    const ok = await notify.confirmDelete({
      title: `Hapus Kategori "${cat.name}"?`,
      itemName: cat.name,
      itemType: "Kategori Transaksi",
      itemDetails: `Tipe: ${cat.type === "income" ? "Pemasukan" : "Pengeluaran"}`,
      message: `Apakah Anda yakin ingin menghapus kategori "${cat.name}"?`,
      warningNote: "Kategori ini akan dihapus dari pilihan kategori pencatatan arus kas.",
      confirmText: "Hapus Kategori",
      cancelText: "Batalkan",
    });
    if (ok) {
      KostStorage.deleteFinanceCategory(cat.id);
      loadData();
      onUpdate();
      notify.deleted(cat.name, "Kategori");
    }
  };

  const filteredCategories = categories.filter((c) => c.type === categoryType);
  const walletBalances = KostStorage.getWalletBalances();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Kelola Dompet & Kategori Kas"
      description="Konfigurasi rekening kas operasional, saldo awal, serta daftar kategori pengeluaran & pemasukan custom."
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Top Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-white/10 pb-3">
          <button
            onClick={() => setActiveTab("wallets")}
            className={`flex items-center gap-2 rounded-2xl py-2 px-4 text-xs font-black transition-all ${
              activeTab === "wallets"
                ? "bg-[#0A0A0A] text-white dark:bg-white dark:text-[#0A0A0A]"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
            }`}
          >
            <Wallet className="h-4 w-4" />
            <span>Dompet & Rekening ({wallets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("categories")}
            className={`flex items-center gap-2 rounded-2xl py-2 px-4 text-xs font-black transition-all ${
              activeTab === "categories"
                ? "bg-[#0A0A0A] text-white dark:bg-white dark:text-[#0A0A0A]"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
            }`}
          >
            <Tag className="h-4 w-4" />
            <span>Kategori Custom ({categories.length})</span>
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
                  placeholder="Nama Akun (cth: Kas Petty, Mandiri)"
                  value={newWalletName}
                  onChange={(e) => setNewWalletName(e.target.value)}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold focus:outline-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                />
                <select
                  value={newWalletType}
                  onChange={(e) => setNewWalletType(e.target.value as any)}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold focus:outline-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                >
                  <option value="cash">💵 Kas Tunai</option>
                  <option value="bank">🏦 Rekening Bank</option>
                  <option value="ewallet">📱 QRIS / E-Wallet</option>
                </select>
                <input
                  type="text"
                  placeholder="No. Rek (Opsional)"
                  value={newWalletAccount}
                  onChange={(e) => setNewWalletAccount(e.target.value)}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium focus:outline-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                />
                <input
                  type="number"
                  placeholder="Saldo Awal (Rp)"
                  value={newWalletBalance}
                  onChange={(e) => setNewWalletBalance(Number(e.target.value))}
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
              {walletBalances.map(({ wallet, balance }) => (
                <div
                  key={wallet.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-white text-base">
                      {wallet.type === "cash" ? "💵" : wallet.type === "bank" ? "🏦" : "📱"}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-neutral-900 dark:text-white">
                        {wallet.name}
                      </h4>
                      <p className="text-[11px] text-neutral-400">
                        {wallet.account_number ? `No: ${wallet.account_number}` : "Kas Fisik"} · Saldo Awal: {formatRupiah(wallet.initial_balance)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block">Saldo Saat Ini</span>
                      <span className="text-xs font-black text-neutral-900 dark:text-white">
                        {formatRupiah(balance)}
                      </span>
                    </div>

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

        {/* TAB 2: CATEGORIES */}
        {activeTab === "categories" && (
          <div className="space-y-4">
            {/* Category Type Switcher */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCategoryType("expense")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  categoryType === "expense"
                    ? "bg-rose-600 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400"
                }`}
              >
                💸 Kategori Pengeluaran
              </button>
              <button
                onClick={() => setCategoryType("income")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  categoryType === "income"
                    ? "bg-emerald-600 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400"
                }`}
              >
                💰 Kategori Pemasukan
              </button>
            </div>

            {/* Create Category Form */}
            <form onSubmit={handleAddCategory} className="flex items-center gap-2 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700">
              <input
                type="text"
                required
                placeholder={`Nama kategori ${categoryType === "expense" ? "pengeluaran" : "pemasukan"} baru...`}
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold focus:outline-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
              />
              <Button type="submit" variant="lime" size="sm" className="font-black text-xs shrink-0">
                + Tambah Kategori
              </Button>
            </form>

            {/* Category List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {filteredCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-700"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-neutral-400" />
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">
                      {cat.name}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteCategory(cat)}
                    className="p-1 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                    title="Hapus Kategori"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
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
