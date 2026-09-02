"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Tenant } from "@/types";
import { KostApiClient } from "@/lib/api-client";
import { normalizePhoneNumber } from "@/lib/utils";
import { UploadCloud, CheckCircle2 } from "lucide-react";
import { notify } from "@/lib/notify";

interface TenantFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantToEdit?: Tenant | null;
  onSuccess: () => void;
}

export function TenantFormModal({
  isOpen,
  onClose,
  tenantToEdit,
  onSuccess,
}: TenantFormModalProps) {
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [idCardNumber, setIdCardNumber] = useState("");
  const [idCardUrl, setIdCardUrl] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelation, setEmergencyRelation] = useState("Orang Tua");

  useEffect(() => {
    if (tenantToEdit) {
      setFullName(tenantToEdit.full_name);
      setPhoneNumber(tenantToEdit.phone_number);
      setIdCardNumber(tenantToEdit.id_card_number || "");
      setIdCardUrl(tenantToEdit.id_card_url || "");
      setEmergencyName(tenantToEdit.emergency_contact_name || "");
      setEmergencyPhone(tenantToEdit.emergency_contact_phone || "");
      setEmergencyRelation(tenantToEdit.emergency_contact_relation || "Orang Tua");
    } else {
      setFullName("");
      setPhoneNumber("");
      setIdCardNumber("");
      setIdCardUrl("");
      setEmergencyName("");
      setEmergencyPhone("");
      setEmergencyRelation("Orang Tua");
    }
  }, [tenantToEdit, isOpen]);

  const handleSimulateUploadKTP = () => {
    // Simulated upload for demo
    const sampleKtpUrl =
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80";
    setIdCardUrl(sampleKtpUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      notify.warning("Nama Lengkap Wajib Diisi", "Silakan masukkan nama lengkap penghuni.");
      return;
    }
    if (!phoneNumber.trim()) {
      notify.warning("Nomor WhatsApp Wajib Diisi", "Silakan masukkan nomor telepon / WhatsApp penghuni.");
      return;
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    try {
      if (tenantToEdit) {
        await KostApiClient.updateTenant(tenantToEdit.id, {
          full_name: fullName.trim(),
          phone_number: normalizedPhone,
          id_card_number: idCardNumber.trim(),
          id_card_url: idCardUrl,
          emergency_contact_name: emergencyName.trim(),
          emergency_contact_phone: emergencyPhone ? normalizePhoneNumber(emergencyPhone) : undefined,
          emergency_contact_relation: emergencyRelation,
        });
        notify.success("Profil Penghuni Diperbarui", `Data ${fullName.trim()} berhasil disimpan.`);
      } else {
        await KostApiClient.createTenant({
          full_name: fullName.trim(),
          phone_number: normalizedPhone,
          id_card_number: idCardNumber.trim(),
          id_card_url: idCardUrl,
          emergency_contact_name: emergencyName.trim(),
          emergency_contact_phone: emergencyPhone ? normalizePhoneNumber(emergencyPhone) : undefined,
          emergency_contact_relation: emergencyRelation,
        });
        notify.success("Penghuni Didaftarkan", `Profil ${fullName.trim()} berhasil ditambahkan ke database.`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      notify.alert({
        title: "Gagal Menyimpan Data",
        message: err.message || "Terjadi kesalahan saat menghubungi server.",
        variant: "danger",
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tenantToEdit ? `Edit Data Penghuni: ${tenantToEdit.full_name}` : "Daftarkan Penghuni Baru"}
      description="Pencatatan data identitas KTP, nomor WhatsApp format E.164, dan kontak darurat."
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Siti Nurhaliza"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Nomor WhatsApp Aktif <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: 081234567890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
            />
            <p className="mt-1 text-[10px] font-medium text-neutral-400">
              Otomatis dinormalisasi ke format E.164 (+62...) untuk n8n
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Nomor KTP / NIK (Opsional)
            </label>
            <input
              type="text"
              maxLength={16}
              placeholder="16 Digit NIK"
              value={idCardNumber}
              onChange={(e) => setIdCardNumber(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
            />
          </div>

          {/* Upload Foto KTP */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Dokumen Foto KTP
            </label>
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={handleSimulateUploadKTP}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-2.5 text-xs font-bold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 transition-colors"
              >
                <UploadCloud className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                <span>{idCardUrl ? "Ganti Foto KTP" : "Upload File Foto KTP"}</span>
              </button>
              {idCardUrl && (
                <span className="flex items-center gap-1 text-xs font-bold text-neutral-900 dark:text-[#D9FF43]">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Terunggah</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50/80 p-4 dark:bg-neutral-800/40 dark:border-white/10">
          <p className="text-xs font-bold text-neutral-900 dark:text-white">
            Kontak Darurat (Keluarga/Wali)
          </p>
          <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                Nama Kontak
              </label>
              <input
                type="text"
                placeholder="Contoh: Ahmad Fauzi"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-white p-2.5 text-xs font-medium dark:bg-neutral-900 dark:border-neutral-700 dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                Hubungan / Relasi
              </label>
              <select
                value={emergencyRelation}
                onChange={(e) => setEmergencyRelation(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-white p-2.5 text-xs font-medium dark:bg-neutral-900 dark:border-neutral-700 dark:text-white focus:outline-none"
              >
                <option value="Orang Tua">Orang Tua</option>
                <option value="Suami / Istri">Suami / Istri</option>
                <option value="Kakak / Adik">Kakak / Adik</option>
                <option value="Wali / Teman">Wali / Teman</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                Nomor HP Darurat
              </label>
              <input
                type="text"
                placeholder="0812..."
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-white p-2.5 text-xs font-medium dark:bg-neutral-900 dark:border-neutral-700 dark:text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4 dark:border-white/10">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant="default">
            {tenantToEdit ? "Simpan Perubahan" : "Daftarkan Penghuni"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
