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
import { KostApiClient } from "@/lib/api-client";
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

  const refreshLists = async (currentType: TransactionType) => {
    try {
      const [cats, wals] = await Promise.all([
        KostApiClient.getFinanceCategories(currentType),
        KostApiClient.getWallets(),
      ]);
      const filteredCats = cats.filter(
        (c) =>
          (c.type === currentType || c.category_kind === currentType || c.scope === "transaction") &&
          c.scope !== "wallet" &&
          c.category_kind !== "asset" &&
          c.category_kind !== "liability"
      );
      setCategoriesList(filteredCats);
      setWalletsList(wals);

      if (!categoryName && filteredCats.length > 0) {
        setCategoryName(filteredCats[0].name);
      }
      if (!selectedWalletId && wals.length > 0) {
        setSelectedWalletId(wals[0].id);
      }
    } catch {}
  };

  useEffect(() => {
    if (isOpen) {
      let isMounted = true;
      const initialType = transactionToEdit ? transactionToEdit.type : "expense";
      setType(initialType);

      Promise.all([KostApiClient.getFinanceCategories(initialType), KostApiClient.getWallets()])
        .then(([cats, wals]) => {
          if (!isMounted) return;
          const filteredCats = cats.filter(
            (c) =>
              (c.type === initialType || c.category_kind === initialType || c.scope === "transaction") &&
              c.scope !== "wallet" &&
              c.category_kind !== "asset" &&
              c.category_kind !== "liability"
          );
          setCategoriesList(filteredCats);
          setWalletsList(wals);

          if (transactionToEdit) {
            setCategoryName(transactionToEdit.category_name || transactionToEdit.category || (filteredCats[0]?.name || ""));
            setSelectedWalletId(transactionToEdit.wallet_id || (wals[0]?.id || ""));
            setTitle(transactionToEdit.title);
            setAmount(transactionToEdit.amount);
            setDate(transactionToEdit.date);
            setNotes(transactionToEdit.notes || "");
          } else {
            setCategoryName(filteredCats[0]?.name || "");
            setSelectedWalletId(wals[0]?.id || "");
            setTitle("");
            setAmount(100000);
            setDate(new Date().toISOString().slice(0, 10));
            setNotes("");
          }
        })
        .catch(() => {});

      setShowAddCategoryInput(false);
      setShowAddWalletInput(false);

      return () => {
        isMounted = false;
      };
    }
  }, [transactionToEdit, isOpen]);

  // Hapus angka 0 di depan dan format kelipatan ribuan
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, "");
    const sanitized = rawDigits.replace(/^0+(?!$)/, "");
    const val = sanitized === "" ? 0 : parseInt(sanitized, 10);
    setAmount(val);
  };

  const handleTypeChange = async (newType: TransactionType) => {
    setType(newType);
    try {
      const cats = await KostApiClient.getFinanceCategories(newType);
      const filteredCats = cats.filter(
        (c) =>
          (c.type === newType || c.category_kind === newType || c.scope === "transaction") &&
          c.scope !== "wallet" &&
          c.category_kind !== "asset" &&
          c.category_kind !== "liability"
      );
      setCategoriesList(filteredCats);
      if (filteredCats.length > 0) {
        setCategoryName(filteredCats[0].name);
      }
    } catch {}
  };

  const handleCreateNewCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const created = await KostApiClient.createFinanceCategory({
        name: newCategoryName.trim(),
        scope: "transaction",
        type,
        category_kind: type,
        is_default: false,
      });

      await refreshLists(type);
      setCategoryName(created.name);
      setNewCategoryName("");
      setShowAddCategoryInput(false);
    } catch (err: any) {
      notify.alert({ title: "Gagal Tambah Kategori", message: err.message, variant: "danger" });
    }
  };

  const handleCreateNewWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWalletName.trim()) return;

    try {
      const created = await KostApiClient.createWallet({
        name: newWalletName.trim(),
        wallet_kind: "asset",
        type: newWalletType,
        initial_balance: Number(newWalletInitialBalance) || 0,
        color: newWalletType === "cash" ? "#D9FF43" : newWalletType === "bank" ? "#3B82F6" : "#10B981",
      });

      await refreshLists(type);
      setSelectedWalletId(created.id);
      setNewWalletName("");
      setNewWalletInitialBalance(0);
      setShowAddWalletInput(false);
    } catch (err: any) {
      notify.alert({ title: "Gagal Tambah Dompet", message: err.message, variant: "danger" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      if (transactionToEdit) {
        await KostApiClient.updateCashTransaction(transactionToEdit.id, {
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
        await KostApiClient.createCashTransaction({
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
    } catch (err: any) {
      notify.alert({
        title: "Gagal Menyimpan Transaksi",
        message: err.message || "Terjadi kesalahan pada server.",
        variant: "danger",
      });
    }
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                Nominal (Rp) *
              </label>
              {amount > 0 && (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  Kelipatan 1.000
                </span>
              )}
            </div>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3.5 text-xs font-black text-neutral-400">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                required
                placeholder="0"
                value={amount === 0 ? "" : amount.toLocaleString("id-ID")}
                onChange={handleAmountChange}
                className="w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 pl-10 pr-3.5 py-2.5 text-xs font-bold text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              />
            </div>
            <p className="text-[10px] font-mono font-bold text-neutral-400 mt-1">
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
