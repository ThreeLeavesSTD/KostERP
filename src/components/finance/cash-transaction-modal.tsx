"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingDown,
  TrendingUp,
  Receipt,
  Calendar,
  Wallet,
  Tag,
  Plus,
  Check,
  X,
  CreditCard,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { CashTransaction, TransactionType, FinanceWallet, FinanceCategory } from "@/types";
import { KostStorage } from "@/lib/storage";
import { formatRupiah } from "@/lib/utils";
import { notify } from "@/lib/notify";

interface CashTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionToEdit?: CashTransaction | null;
  onSuccess: () => void;
  currentRole?: string;
}

export function CashTransactionModal({
  isOpen,
  onClose,
  transactionToEdit,
  onSuccess,
  currentRole = "Owner",
}: CashTransactionModalProps) {
  const [type, setType] = useState<TransactionType>("expense");
  const [categoryName, setCategoryName] = useState("");
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState<number>(100000);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  // Lists from Storage
  const [categoriesList, setCategoriesList] = useState<FinanceCategory[]>([]);
  const [walletsList, setWalletsList] = useState<FinanceWallet[]>([]);

  // Inline Quick Add Modals/Toggles
  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showAddWalletInput, setShowAddWalletInput] = useState(false);
  const [newWalletName, setNewWalletName] = useState("");
  const [newWalletInitialBalance, setNewWalletInitialBalance] = useState<number>(0);
  const [newWalletType, setNewWalletType] = useState<"cash" | "bank" | "ewallet">("cash");

  const refreshLists = (currentType: TransactionType) => {
    const cats = KostStorage.getFinanceCategories(currentType);
    const wals = KostStorage.getWallets();
    setCategoriesList(cats);
    setWalletsList(wals);

    if (!categoryName && cats.length > 0) {
      setCategoryName(cats[0].name);
    }
    if (!selectedWalletId && wals.length > 0) {
      setSelectedWalletId(wals[0].id);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const initialType = transactionToEdit ? transactionToEdit.type : "expense";
      setType(initialType);
      const cats = KostStorage.getFinanceCategories(initialType);
      const wals = KostStorage.getWallets();
      setCategoriesList(cats);
      setWalletsList(wals);

      if (transactionToEdit) {
        setCategoryName(transactionToEdit.category_name || transactionToEdit.category || (cats[0]?.name || ""));
        setSelectedWalletId(transactionToEdit.wallet_id || (wals[0]?.id || ""));
        setTitle(transactionToEdit.title);
        setAmount(transactionToEdit.amount);
        setDate(transactionToEdit.date);
        setNotes(transactionToEdit.notes || "");
      } else {
        setCategoryName(cats[0]?.name || "");
        setSelectedWalletId(wals[0]?.id || "");
        setTitle("");
        setAmount(100000);
        setDate(new Date().toISOString().slice(0, 10));
        setNotes("");
      }
      setShowAddCategoryInput(false);
      setShowAddWalletInput(false);
    }
  }, [transactionToEdit, isOpen]);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const cats = KostStorage.getFinanceCategories(newType);
    setCategoriesList(cats);
    if (cats.length > 0) {
      setCategoryName(cats[0].name);
    }
  };

  const handleCreateNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    const created = KostStorage.addFinanceCategory({
      name: newCategoryName.trim(),
      type,
      is_default: false,
    });

    const updatedCats = KostStorage.getFinanceCategories(type);
    setCategoriesList(updatedCats);
    setCategoryName(created.name);
    setNewCategoryName("");
    setShowAddCategoryInput(false);
  };

  const handleCreateNewWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWalletName.trim()) return;

    const props = KostStorage.getProperties();
    const created = KostStorage.addWallet({
      property_id: props[0]?.id || "prop-01",
      name: newWalletName.trim(),
      wallet_kind: "asset",
      type: newWalletType,
      initial_balance: Number(newWalletInitialBalance) || 0,
      color: newWalletType === "cash" ? "#D9FF43" : newWalletType === "bank" ? "#3B82F6" : "#10B981",
    });

    const updatedWallets = KostStorage.getWallets();
    setWalletsList(updatedWallets);
    setSelectedWalletId(created.id);
    setNewWalletName("");
    setNewWalletInitialBalance(0);
    setShowAddWalletInput(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      notify.warning("Keterangan Diperlukan", "Nama atau keterangan transaksi wajib diisi.");
      return;
    }
    if (amount <= 0) {
      notify.warning("Nominal Tidak Valid", "Nominal transaksi harus lebih dari Rp 0.");
      return;
    }

    const matchedWallet = walletsList.find((w) => w.id === selectedWalletId);
    const recordedBy =
      currentRole.charAt(0).toUpperCase() + currentRole.slice(1).replace("_", " ");

    if (transactionToEdit) {
      KostStorage.updateCashTransaction(transactionToEdit.id, {
        type,
        category: categoryName,
        category_name: categoryName,
        wallet_id: selectedWalletId,
        wallet_name: matchedWallet?.name || "Kas Tunai",
        title: title.trim(),
        amount: Number(amount),
        date,
        payment_method: matchedWallet?.name || "Kas Tunai",
        notes: notes.trim(),
      });
      notify.success("Transaksi Diperbarui", `Catatan "${title.trim()}" berhasil disimpan.`);
    } else {
      const props = KostStorage.getProperties();
      const property_id = props[0]?.id && props[0].id.includes("-") && props[0].id.length > 20
        ? props[0].id
        : "a0000000-0000-0000-0000-000000000001";
      KostStorage.addCashTransaction({
        property_id,
        type,
        category: categoryName,
        category_name: categoryName,
        wallet_id: selectedWalletId,
        wallet_name: matchedWallet?.name || "Kas Tunai",
        title: title.trim(),
        amount: Number(amount),
        date,
        payment_method: matchedWallet?.name || "Kas Tunai",
        notes: notes.trim(),
        recorded_by: recordedBy,
      });
      notify.success(
        "Transaksi Dibukukan",
        `${type === "income" ? "Pemasukan" : "Pengeluaran"} "${title.trim()}" senilai ${formatRupiah(amount)} berhasil dicatat.`
      );
    }

    onSuccess();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        transactionToEdit
          ? "Edit Transaksi Kas Operasional"
          : "Catat Arus Kas Baru"
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Type Switcher (Expense / Income) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
            Jenis Arus Kas
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleTypeChange("expense")}
              className={`flex items-center justify-center gap-2 rounded-2xl py-2.5 px-4 text-xs font-black transition-all ${
                type === "expense"
                  ? "bg-rose-600 text-white shadow-spatial scale-[1.01]"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
              }`}
            >
              <TrendingDown className="h-4 w-4" />
              <span>💸 Pengeluaran (Expense)</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange("income")}
              className={`flex items-center justify-center gap-2 rounded-2xl py-2.5 px-4 text-xs font-black transition-all ${
                type === "income"
                  ? "bg-[#0A0A0A] text-[#D9FF43] shadow-spatial scale-[1.01] dark:bg-white dark:text-[#0A0A0A]"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>💰 Pemasukan (Income)</span>
            </button>
          </div>
        </div>

        {/* Row 1: Kategori & Dompet/Rekening (Compact Dropdown Columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Column 1: Kategori Dropdown */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                Kategori {type === "expense" ? "Pengeluaran" : "Pemasukan"}
              </label>
              <button
                type="button"
                onClick={() => setShowAddCategoryInput(!showAddCategoryInput)}
                className="text-[11px] font-bold text-neutral-900 hover:underline dark:text-[#D9FF43] flex items-center gap-0.5"
              >
                <Plus className="h-3 w-3" />
                <span>Kategori Baru</span>
              </button>
            </div>

            {showAddCategoryInput ? (
              <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                <input
                  type="text"
                  placeholder="Nama kategori baru..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                  autoFocus
                />
                <Button
                  type="button"
                  size="sm"
                  variant="lime"
                  onClick={handleCreateNewCategory}
                  className="h-8 px-2.5 text-xs font-black shrink-0"
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAddCategoryInput(false)}
                  className="h-8 px-2 text-xs shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <select
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-3.5 py-2.5 text-xs font-bold text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              >
                {categoriesList.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Column 2: Dompet / Akun Kas Dropdown */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                Dompet / Akun Kas
              </label>
              <button
                type="button"
                onClick={() => setShowAddWalletInput(!showAddWalletInput)}
                className="text-[11px] font-bold text-neutral-900 hover:underline dark:text-[#D9FF43] flex items-center gap-0.5"
              >
                <Plus className="h-3 w-3" />
                <span>Dompet Baru</span>
              </button>
            </div>

            {showAddWalletInput ? (
              <div className="space-y-1.5 p-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 animate-in fade-in duration-200">
                <input
                  type="text"
                  placeholder="Nama Dompet (cth: Kas Petty, Mandiri)"
                  value={newWalletName}
                  onChange={(e) => setNewWalletName(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-bold focus:outline-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                  autoFocus
                />
                <div className="flex items-center gap-1.5">
                  <select
                    value={newWalletType}
                    onChange={(e) => setNewWalletType(e.target.value as any)}
                    className="rounded-xl border border-neutral-200 bg-white px-2 py-1 text-[11px] font-bold dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                  >
                    <option value="cash">Tunai (Cash)</option>
                    <option value="bank">Bank</option>
                    <option value="ewallet">E-Wallet</option>
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    variant="lime"
                    onClick={handleCreateNewWallet}
                    className="h-7 px-2.5 text-[11px] font-black shrink-0"
                  >
                    Simpan
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowAddWalletInput(false)}
                    className="h-7 px-1.5 text-[11px] shrink-0"
                  >
                    Batal
                  </Button>
                </div>
              </div>
            ) : (
              <select
                value={selectedWalletId}
                onChange={(e) => setSelectedWalletId(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-3.5 py-2.5 text-xs font-bold text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              >
                {walletsList.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.type === "cash" ? "💵" : w.type === "bank" ? "🏦" : "📱"} {w.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Row 2: Keterangan & Nominal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
              Keterangan Transaksi *
            </label>
            <input
              type="text"
              required
              placeholder={
                type === "expense"
                  ? "Contoh: Beli Galon Air & Sabun Pel"
                  : "Contoh: Sewa Parkir Mobil Bulan Ini"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-3.5 py-2.5 text-xs font-bold text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
              Nominal (Rp) *
            </label>
            <input
              type="number"
              required
              min={1000}
              step={5000}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-3.5 py-2.5 text-xs font-bold text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
            />
            <p className="text-[10px] font-mono font-bold text-neutral-400 mt-0.5">
              Format: {formatRupiah(amount)}
            </p>
          </div>
        </div>

        {/* Row 3: Tanggal & Catatan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
              Tanggal Transaksi
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-3.5 py-2.5 text-xs font-bold text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
              Catatan / No. Bukti Nota (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: No Nota #1290, toko Berkah"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-3.5 py-2.5 text-xs font-medium text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-2 border-t border-neutral-100 pt-3 dark:border-white/10">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs font-bold"
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant={type === "expense" ? "destructive" : "lime"}
            size="sm"
            className="font-black text-xs shadow-xs"
          >
            {transactionToEdit
              ? "Simpan Perubahan"
              : type === "expense"
              ? "Simpan Pengeluaran"
              : "Simpan Pemasukan"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
