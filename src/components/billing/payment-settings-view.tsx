"use client";

import React, { useState, useEffect } from "react";
import { CreditCard, Plus, Save, Trash2, CheckCircle2, QrCode } from "lucide-react";
import { PaymentMethodConfig } from "@/types";
import { KostStorage } from "@/lib/storage";
import { Button } from "@/components/ui/button";

export function PaymentSettingsView() {
  const [methods, setMethods] = useState<PaymentMethodConfig[]>([]);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setMethods(KostStorage.getPaymentMethods());
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
    const props = KostStorage.getProperties();
    const newMethod: PaymentMethodConfig = {
      id: `pm-${Date.now()}`,
      property_id: props[0]?.id || "prop-01",
      bank_name: "BCA",
      account_number: "",
      account_holder: "",
      instructions: "Transfer sesuai nominal",
      is_active: true,
    };
    setMethods([...methods, newMethod]);
  };

  const handleDeleteMethod = (id: string) => {
    setMethods(methods.filter((m) => m.id !== id));
  };

  const handleSave = () => {
    KostStorage.updatePaymentMethods(methods);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
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
                  onClick={() => handleDeleteMethod(pm.id)}
                  title="Hapus"
                  className="rounded-full p-2 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              {pm.bank_name !== "QRIS" && pm.bank_name !== "Tunai / Cash" ? (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-500">
                      Nomor Rekening
                    </label>
                    <input
                      type="text"
                      value={pm.account_number || ""}
                      onChange={(e) => handleUpdateField(pm.id, "account_number", e.target.value)}
                      placeholder="Contoh: 8830-1928-44"
                      className="mt-1 w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-2.5 font-mono text-xs font-bold dark:bg-neutral-800 dark:border-neutral-700 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-500">
                      Nama Pemilik Rekening (Atas Nama)
                    </label>
                    <input
                      type="text"
                      value={pm.account_holder || ""}
                      onChange={(e) => handleUpdateField(pm.id, "account_holder", e.target.value)}
                      placeholder="Contoh: PT Graha Kost Mandiri"
                      className="mt-1 w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-2.5 text-xs font-semibold dark:bg-neutral-800 dark:border-neutral-700 dark:text-white focus:outline-none"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-neutral-500">
                    Instruksi / Catatan Pembayaran
                  </label>
                  <input
                    type="text"
                    value={pm.instructions || ""}
                    onChange={(e) => handleUpdateField(pm.id, "instructions", e.target.value)}
                    placeholder="Contoh: Scan QRIS via GoPay / BCA Mobile"
                    className="mt-1 w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-2.5 text-xs font-semibold dark:bg-neutral-800 dark:border-neutral-700 dark:text-white focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
