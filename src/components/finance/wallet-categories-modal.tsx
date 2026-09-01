"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Check,
  X,
  Tag,
  Sparkles,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FinanceCategory, WalletKind } from "@/types";
import { KostStorage } from "@/lib/storage";
import { notify } from "@/lib/notify";

interface WalletCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function WalletCategoriesModal({
  isOpen,
  onClose,
  onUpdate,
}: WalletCategoriesModalProps) {
  const [activeKind, setActiveKind] = useState<WalletKind>("asset");
  const [categories, setCategories] = useState<FinanceCategory[]>([]);

  // Inline Add Category Form
  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("payments");

  const loadCategories = () => {
    setCategories(KostStorage.getFinanceCategories(activeKind));
  };

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      setIsAdding(false);
    }
  }, [isOpen, activeKind]);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    KostStorage.addFinanceCategory({
      name: newCategoryName.trim(),
      category_kind: activeKind,
      icon: newCategoryIcon,
      is_default: false,
    });

    setNewCategoryName("");
    setIsAdding(false);
    loadCategories();
    onUpdate();
    notify.success("Kategori Ditambahkan", `Kategori "${newCategoryName.trim()}" berhasil dibuat.`);
  };

  const handleDeleteCategory = async (cat: FinanceCategory) => {
    const ok = await notify.confirm({
      title: `Hapus Kategori "${cat.name}"?`,
      message: `Kategori ini akan dihapus dari daftar pilihan dompet.`,
      variant: "danger",
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
    });
    if (ok) {
      KostStorage.deleteFinanceCategory(cat.id);
      loadCategories();
      onUpdate();
      notify.success("Kategori Dihapus", `Kategori "${cat.name}" berhasil dihapus.`);
    }
  };

  const getCategoryEmoji = (cat: FinanceCategory) => {
    const name = cat.name.toLowerCase();
    if (name.includes("business") || name.includes("bisnis")) return "💵";
    if (name.includes("cash") || name.includes("tunai")) return "💵";
    if (name.includes("digital bank") || name.includes("bank")) return "🏦";
    if (name.includes("wallet") || name.includes("qris") || name.includes("ovo")) return "📱";
    if (name.includes("crypto") || name.includes("kripto")) return "₿";
    if (activeKind === "liability") return "📉";
    return "💳";
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Kelola Kategori"
      description="Kustomisasi tipe dan ikon dompet kamu"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Header matching Reference Screenshot 3 */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D9FF43]/20 text-[#0A0A0A] dark:text-[#D9FF43] border border-[#D9FF43]/30 text-xl font-black">
              🗂️
            </div>
            <div>
              <h3 className="text-base font-black text-neutral-900 dark:text-white">
                Kelola Kategori
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Kustomisasi tipe dan ikon dompet kamu
              </p>
            </div>
          </div>
        </div>

        {/* Kind Toggle Tabs matching Reference Screenshot 3 */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveKind("asset")}
            className={`flex items-center justify-center gap-2 rounded-2xl py-2.5 px-4 text-xs font-black transition-all ${
              activeKind === "asset"
                ? "bg-[#D9FF43] text-[#0A0A0A] shadow-lime-glow font-black"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-400"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>↗️ Aset</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveKind("liability")}
            className={`flex items-center justify-center gap-2 rounded-2xl py-2.5 px-4 text-xs font-black transition-all ${
              activeKind === "liability"
                ? "bg-rose-600 text-white shadow-spatial font-black"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-400"
            }`}
          >
            <TrendingDown className="h-4 w-4" />
            <span>↘️ Kewajiban</span>
          </button>
        </div>

        {/* Add Category Trigger / Form */}
        {isAdding ? (
          <form
            onSubmit={handleAddCategory}
            className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 space-y-2 animate-in fade-in duration-200"
          >
            <input
              type="text"
              required
              placeholder={`Nama kategori ${activeKind === "asset" ? "aset" : "kewajiban"} baru...`}
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAdding(false)}
                className="text-xs font-bold"
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="lime"
                size="sm"
                className="text-xs font-black shadow-lime-glow"
              >
                Simpan Kategori
              </Button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-white/10 p-3 text-xs font-bold text-neutral-500 hover:text-neutral-900 hover:border-neutral-400 dark:hover:text-white dark:hover:border-white/30 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>
              Tambah Kategori {activeKind === "asset" ? "Aset" : "Kewajiban"} Baru
            </span>
          </button>
        )}

        {/* Category List Capsule Rows matching Reference Screenshot 3 */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 hover:bg-neutral-100/80 dark:bg-neutral-900/90 dark:border-white/10 dark:hover:bg-neutral-800/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-lg font-black dark:bg-emerald-950/40">
                  {getCategoryEmoji(cat)}
                </div>
                <h4 className="text-xs font-black text-neutral-900 dark:text-white">
                  {cat.name}
                </h4>
              </div>

              <button
                type="button"
                onClick={() => handleDeleteCategory(cat)}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Hapus Kategori"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-neutral-100 dark:border-white/10">
          <Button
            variant="default"
            size="sm"
            onClick={onClose}
            className="text-xs font-bold rounded-xl"
          >
            Selesai
          </Button>
        </div>
      </div>
    </Modal>
  );
}
