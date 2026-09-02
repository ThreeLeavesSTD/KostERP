"use client";

import React, { useState, useEffect } from "react";
import { CreditCard, Plus, Save, Trash2, CheckCircle2, QrCode } from "lucide-react";
import { PaymentMethodConfig } from "@/types";
import { KostApiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export function PaymentSettingsView() {
  const [methods, setMethods] = useState<PaymentMethodConfig[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await KostApiClient.getPaymentMethods();
      setMethods(data);
    } catch (err) {
      console.error("Gagal memuat metode pembayaran:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateField = (id: string, field: keyof PaymentMethodConfig, value: any) => {
    const updated = methods.map((m) => {
      if (m.id === id) {
        return { ...m, [field]: value };
      }
      return m;
    });
    setMethods(updated);
  };

  const handleAddMethod = () => {
    const newMethod: PaymentMethodConfig = {
      id: `temp-${Date.now()}`,
      property_id: "",
      bank_name: "BCA",
      account_number: "",
      account_holder: "",
      instructions: "Transfer sesuai nominal",
      is_active: true,
    };
    setMethods([...methods, newMethod]);
  };

  const handleDeleteMethod = async (id: string) => {
    if (id.startsWith("temp-")) {
      setMethods(methods.filter((m) => m.id !== id));
      return;
    }
    try {
      await KostApiClient.deletePaymentMethod(id);
      await loadData();
    } catch (err: any) {
      alert(`Gagal menghapus metode pembayaran: ${err.message}`);
    }
  };

  const handleSave = async () => {
    try {
      for (const m of methods) {
        if (m.id.startsWith("temp-")) {
          await KostApiClient.createPaymentMethod({
            bank_name: m.bank_name,
            account_number: m.account_number,
            account_holder: m.account_holder,
            instructions: m.instructions,
            is_active: m.is_active,
          });
        } else {
          await KostApiClient.updatePaymentMethod(m.id, {
            bank_name: m.bank_name,
            account_number: m.account_number,
            account_holder: m.account_holder,
            instructions: m.instructions,
            is_active: m.is_active,
          });
        }
      }
      await loadData();
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } catch (err: any) {
      alert(`Gagal menyimpan konfigurasi: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
              Rekening & Metode Pembayaran
            </h2>
            <span className="rounded-full bg-[#D9FF43] px-2.5 py-0.5 text-xs font-bold text-[#0A0A0A]">
              {methods.length} Rekening
            </span>
          </div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
            Daftar rekening bank dan QRIS yang akan otomatis disematkan pada pesan WhatsApp penagihan sewa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleAddMethod} className="gap-1.5 text-xs font-bold shadow-spatial">
            <Plus className="h-4 w-4" />
            <span>Tambah Rekening</span>
          </Button>
          <Button onClick={handleSave} variant="default" className="gap-1.5 text-xs font-bold shadow-spatial">
            {isSaved ? <CheckCircle2 className="h-4 w-4 text-[#D9FF43]" /> : <Save className="h-4 w-4" />}
            <span>{isSaved ? "Tersimpan!" : "Simpan Konfigurasi"}</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {methods.map((pm) => (
          <div
            key={pm.id}
            className="rounded-3xl border border-white/80 bg-white p-5 shadow-spatial transition-all hover:shadow-spatial-lg dark:bg-[#18181B] dark:border-white/10"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3.5 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="rounded-2xl bg-[#0A0A0A] p-2.5 text-white dark:bg-white dark:text-[#0A0A0A]">
                  {pm.bank_name === "QRIS" ? <QrCode className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                </div>
                <input
                  type="text"
                  value={pm.bank_name}
                  onChange={(e) => handleUpdateField(pm.id, "bank_name", e.target.value)}
                  placeholder="Nama Bank (BCA/Mandiri/QRIS)"
                  className="rounded-xl font-black text-neutral-900 dark:text-white text-base bg-transparent border-0 focus:ring-2 focus:ring-[#0A0A0A] px-1.5 py-0.5"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer rounded-full bg-neutral-100 px-2.5 py-1 dark:bg-neutral-800">
                  <input
                    type="checkbox"
                    checked={pm.is_active}
                    onChange={(e) => handleUpdateField(pm.id, "is_active", e.target.checked)}
                    className="rounded text-neutral-900 focus:ring-[#0A0A0A]"
                  />
                  <span className="text-neutral-700 dark:text-neutral-300">Aktif</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleDeleteMethod(pm.id)}
                  className="rounded-full p-1 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Nomor Rekening / Merchant ID
                </label>
                <input
                  type="text"
                  value={pm.account_number}
                  onChange={(e) => handleUpdateField(pm.id, "account_number", e.target.value)}
                  placeholder="Contoh: 1234567890"
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-bold text-neutral-900 focus:border-[#0A0A0A] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Atas Nama (Pemilik Rekening)
                </label>
                <input
                  type="text"
                  value={pm.account_holder}
                  onChange={(e) => handleUpdateField(pm.id, "account_holder", e.target.value)}
                  placeholder="Contoh: Haji Slamet Riyadi"
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-semibold text-neutral-900 focus:border-[#0A0A0A] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Instruksi / Catatan Tambahan
                </label>
                <input
                  type="text"
                  value={pm.instructions || ""}
                  onChange={(e) => handleUpdateField(pm.id, "instructions", e.target.value)}
                  placeholder="Contoh: Berita transfer: Sewa Kamar [No.Kamar]"
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-600 focus:border-[#0A0A0A] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
