"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet,
  Building2,
  CreditCard,
  DollarSign,
  Smartphone,
  Coins,
  X,
  Trash2,
  Save,
  Tag,
  Check,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FinanceWallet, WalletKind, FinanceCategory } from "@/types";
import { KostApiClient } from "@/lib/api-client";
import { formatRupiah } from "@/lib/utils";
import { notify } from "@/lib/notify";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletToEdit?: FinanceWallet | null;
  defaultKind?: WalletKind;
  onSuccess: () => void;
}

const AVAILABLE_ICONS = [
  { id: "payments", label: "Payments (Cash/Card)", icon: "💵" },
  { id: "bank", label: "Bank Account", icon: "🏦" },
  { id: "ewallet", label: "E-Wallet / QRIS", icon: "📱" },
  { id: "card", label: "Credit / Debit Card", icon: "💳" },
  { id: "crypto", label: "Crypto / Digital", icon: "₿" },
  { id: "business", label: "Business Asset", icon: "🏢" },
  { id: "liability", label: "Hutang / Kewajiban", icon: "📉" },
];

export function WalletModal({
  isOpen,
  onClose,
  walletToEdit,
  defaultKind = "asset",
  onSuccess,
}: WalletModalProps) {
  const [walletKind, setWalletKind] = useState<WalletKind>(defaultKind);
  const [name, setName] = useState("");
  const [categoryName, setCategoryName] = useState("Business");
  const [balance, setBalance] = useState<number>(0);
  const [selectedIcon, setSelectedIcon] = useState("payments");
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [accountNumber, setAccountNumber] = useState("");

  const [categories, setCategories] = useState<FinanceCategory[]>([]);

  useEffect(() => {
    if (isOpen) {
      let isMounted = true;
      const targetKind = walletToEdit ? (walletToEdit.wallet_kind || "asset") : defaultKind;
      KostApiClient.getFinanceCategories(targetKind)
        .then((cats) => {
          if (!isMounted) return;
          const walletCats = cats.filter(
            (c) => c.scope === "wallet" || c.category_kind === "asset" || c.category_kind === "liability" || (!c.type && !c.category_kind)
          );
          setCategories(walletCats);
        })
        .catch(() => {});

      if (walletToEdit) {
        setWalletKind(walletToEdit.wallet_kind || "asset");
        setName(walletToEdit.name);
        setCategoryName(walletToEdit.category_name || "Business");
        setBalance(walletToEdit.initial_balance || 0);
        setSelectedIcon(walletToEdit.icon || "payments");
        setAccountNumber(walletToEdit.account_number || "");
      } else {
        setWalletKind(defaultKind);
        setName("");
        setCategoryName(defaultKind === "asset" ? "Business" : "Hutang Vendor");
        setBalance(0);
        setSelectedIcon(defaultKind === "asset" ? "payments" : "liability");
        setAccountNumber("");
      }
      setShowIconPicker(false);

      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, walletToEdit, defaultKind]);

  // Hapus angka 0 di depan (leading zero) dan format kelipatan ribuan
  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, "");
    // Hapus angka 0 di depan (cth: "05000000" -> "5000000", "0" -> "0")
    const sanitized = rawDigits.replace(/^0+(?!$)/, "");
    const val = sanitized === "" ? 0 : parseInt(sanitized, 10);
    setBalance(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      notify.warning("Nama Akun Diperlukan", "Nama dompet atau rekening kas wajib diisi.");
      return;
    }

    let type: "cash" | "bank" | "ewallet" | "other" = "bank";
    if (selectedIcon === "cash" || categoryName.toLowerCase().includes("cash")) type = "cash";
    else if (selectedIcon === "ewallet" || categoryName.toLowerCase().includes("wallet") || name.toLowerCase().includes("ovo") || name.toLowerCase().includes("gopay")) type = "ewallet";

    try {
      if (walletToEdit) {
        await KostApiClient.updateWallet(walletToEdit.id, {
          name: name.trim(),
          wallet_kind: walletKind,
          category_name: categoryName,
          initial_balance: Number(balance),
          icon: selectedIcon,
          account_number: accountNumber.trim() || undefined,
          type,
        });
        notify.success("Akun Diperbarui", `Akun "${name.trim()}" berhasil disimpan.`);
      } else {
        await KostApiClient.createWallet({
          name: name.trim(),
          wallet_kind: walletKind,
          category_name: categoryName,
          initial_balance: Number(balance),
          icon: selectedIcon,
          account_number: accountNumber.trim() || undefined,
          type,
          color: walletKind === "asset" ? "#D9FF43" : "#F43F5E",
        });
        notify.success("Akun Dibuat", `Akun "${name.trim()}" berhasil ditambahkan ke daftar rekening.`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      notify.alert({ title: "Gagal Menyimpan Akun", message: err.message, variant: "danger" });
    }
  };

  const handleDelete = async () => {
    if (!walletToEdit) return;
    const ok = await notify.confirmDelete({
      title: `Hapus Akun "${walletToEdit.name}"?`,
      itemName: walletToEdit.name,
      itemType: "Akun Keuangan / Dompet",
      itemDetails: `${walletToEdit.category_name} • Saldo Awal: ${formatRupiah(walletToEdit.initial_balance)}`,
      message: `Apakah Anda yakin ingin menghapus rekening/dompet "${walletToEdit.name}"?`,
      warningNote: "Akun ini tidak akan dapat dipilih lagi pada pencatatan transaksi kas baru.",
      confirmText: "Hapus Akun Permanen",
      cancelText: "Batalkan",
    });
    if (ok) {
      try {
        await KostApiClient.deleteWallet(walletToEdit.id);
        notify.deleted(walletToEdit.name, "Akun Keuangan");
        onSuccess();
        onClose();
      } catch (err: any) {
        notify.alert({ title: "Gagal Menghapus Akun", message: err.message, variant: "danger" });
      }
    }
  };

  const currentIconObj = AVAILABLE_ICONS.find((i) => i.id === selectedIcon) || AVAILABLE_ICONS[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={walletToEdit ? "Edit Assets" : walletKind === "asset" ? "Tambah Asset" : "Tambah Liability"}
      description="Update your details"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Header matching Reference Screenshot 2 */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xl font-black">
              {currentIconObj.icon}
            </div>
            <div>
              <h3 className="text-base font-black text-neutral-900 dark:text-white">
                {walletToEdit ? "Edit Assets" : walletKind === "asset" ? "Tambah Asset" : "Tambah Liability"}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Update your details
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ICON DOMPET Box matching Reference */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
              ICON DOMPET
            </label>
            <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 border border-neutral-200 dark:bg-neutral-900/90 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0A0A0A] text-[#D9FF43] text-lg font-black dark:bg-neutral-800">
                  {currentIconObj.icon}
                </div>
                <div>
                  <h4 className="text-xs font-black text-neutral-900 dark:text-white">
                    {currentIconObj.id}
                  </h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Pilih ikon preset atau masukkan custom icon ...
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="rounded-xl border-neutral-200 bg-white font-bold text-xs hover:bg-[#D9FF43] hover:text-[#0A0A0A] dark:bg-neutral-800 dark:border-neutral-700"
              >
                Ubah Icon
              </Button>
            </div>

            {/* Inline Icon Picker */}
            {showIconPicker && (
              <div className="mt-2 p-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 grid grid-cols-2 sm:grid-cols-4 gap-2 animate-in fade-in duration-200">
                {AVAILABLE_ICONS.map((ico) => (
                  <button
                    key={ico.id}
                    type="button"
                    onClick={() => {
                      setSelectedIcon(ico.id);
                      setShowIconPicker(false);
                    }}
                    className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-left transition-all ${
                      selectedIcon === ico.id
                        ? "bg-[#0A0A0A] text-white dark:bg-white dark:text-[#0A0A0A]"
                        : "bg-white text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-300"
                    }`}
                  >
                    <span>{ico.icon}</span>
                    <span className="truncate text-[11px]">{ico.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* NAME field */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
              NAME
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: BCA, ovo, Kas Tunai Kost"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-2.5 text-xs font-bold text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-900 dark:border-white/10 dark:text-white"
            />
          </div>

          {/* CATEGORY and BALANCE (2 Column Row matching Reference) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                CATEGORY
              </label>
              <select
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-2.5 text-xs font-bold text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-900 dark:border-white/10 dark:text-white"
              >
                {Array.from(
                  new Set([
                    ...(walletKind === "asset"
                      ? ["BANK", "E-Wallet", "Kas Tunai", "Business", "Digital Bank", "Crypto"]
                      : ["Hutang Vendor", "Cicilan / Pinjaman Operasional", "Deposit Penghuni (Titipan)"]),
                    ...categories.map((c) => c.name),
                    categoryName,
                  ])
                )
                  .filter(Boolean)
                  .map((catName) => (
                    <option key={catName} value={catName}>
                      {catName}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                BALANCE
              </label>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3.5 text-xs font-black text-neutral-400">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="0"
                  value={balance === 0 ? "" : balance.toLocaleString("id-ID")}
                  onChange={handleBalanceChange}
                  className="w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 pl-10 pr-4 py-2.5 text-xs font-black text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-900 dark:border-white/10 dark:text-white"
                />
              </div>
              <p className="text-[10px] font-mono font-bold text-neutral-400 mt-1">
                Format: {formatRupiah(balance)}
              </p>
            </div>
          </div>

          {/* Optional Account Number */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
              NOMOR REKENING / ID AKUN (OPSIONAL)
            </label>
            <input
              type="text"
              placeholder="Contoh: 8920118273 / 081298765432"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-2 text-xs font-medium text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-900 dark:border-white/10 dark:text-white"
            />
          </div>

          {/* Footer Actions matching Reference Screenshot 2 */}
          <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-white/10">
            <div>
              {walletToEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40 text-xs font-bold rounded-xl"
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  <span>Delete</span>
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-xs font-bold rounded-xl"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="lime"
                size="sm"
                className="font-black text-xs rounded-xl shadow-lime-glow px-4"
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                <span>Save</span>
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}
