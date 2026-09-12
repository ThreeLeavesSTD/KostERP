"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  Sparkles,
  ImagePlus,
  UploadCloud,
  X,
  Loader2,
  Globe,
  Maximize2,
  DollarSign,
  CheckCircle2,
  Plus,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { RoomType } from "@/types";
import { KostApiClient } from "@/lib/api-client";
import { notify } from "@/lib/notify";
import { createClient } from "@/lib/supabase/client";

interface RoomTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomTypeToEdit?: RoomType | null;
  onSuccess: () => void;
}

const COMMON_FACILITIES = [
  "AC",
  "Kamar Mandi Dalam",
  "Kamar Mandi Luar",
  "Kasur Springbed",
  "Lemari",
  "Lemari 2 Pintu",
  "Meja Belajar",
  "Water Heater",
  "Smart TV",
  "WiFi",
  "Balkon",
  "Dapur Pribadi",
  "Kulkas Mini",
];

export function RoomTypeModal({
  isOpen,
  onClose,
  roomTypeToEdit,
  onSuccess,
}: RoomTypeModalProps) {
  const [name, setName] = useState("");
  const [basePrice, setBasePrice] = useState<number>(1500000);
  const [roomSize, setRoomSize] = useState("");
  const [facilities, setFacilities] = useState<string[]>([
    "AC",
    "Kamar Mandi Dalam",
    "Kasur Springbed",
  ]);
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customFacility, setCustomFacility] = useState("");

  useEffect(() => {
    if (roomTypeToEdit) {
      setName(roomTypeToEdit.name || "");
      setBasePrice(roomTypeToEdit.base_price || 0);
      setRoomSize(roomTypeToEdit.room_size || "");
      setFacilities(roomTypeToEdit.facilities || []);
      setDescription(roomTypeToEdit.description || "");
      setPhotos(roomTypeToEdit.photos || []);
      setIsActive(roomTypeToEdit.is_active ?? true);
    } else {
      setName("");
      setBasePrice(1500000);
      setRoomSize("3 x 4 m");
      setFacilities(["AC", "Kamar Mandi Dalam", "Kasur Springbed", "WiFi"]);
      setDescription("");
      setPhotos([]);
      setIsActive(true);
    }
  }, [roomTypeToEdit, isOpen]);

  const toggleFacility = (fac: string) => {
    if (facilities.includes(fac)) {
      setFacilities(facilities.filter((f) => f !== fac));
    } else {
      setFacilities([...facilities, fac]);
    }
  };

  const handleAddCustomFacility = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFacility.trim()) return;
    const trimmed = customFacility.trim();
    if (!facilities.includes(trimmed)) {
      setFacilities([...facilities, trimmed]);
    }
    setCustomFacility("");
  };

  const handleUploadPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingPhotos(true);
    const supabase = createClient();
    const newUrls: string[] = [...photos];

    try {
      const folderSlug = name
        ? name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
        : "type";

      for (const file of Array.from(files)) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `room-types/${folderSlug}/${Date.now()}-${safeName}`;
        const { error } = await supabase.storage.from("room-photos").upload(path, file);

        if (error) {
          notify.alert({
            title: "Upload foto gagal",
            message: error.message,
            variant: "danger",
          });
          continue;
        }

        const { data } = supabase.storage.from("room-photos").getPublicUrl(path);
        if (data?.publicUrl) {
          newUrls.push(data.publicUrl);
        }
      }
      setPhotos(newUrls);
    } catch (err: any) {
      notify.alert({
        title: "Gagal Mengunggah Foto",
        message: err.message || "Terjadi kesalahan saat mengunggah foto tipe kamar.",
        variant: "danger",
      });
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const handleRemovePhoto = (urlToRemove: string) => {
    setPhotos(photos.filter((url) => url !== urlToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      notify.warning("Nama Tipe Kamar Wajib Diisi", "Silakan masukkan nama jenis/kategori kamar.");
      return;
    }

    setIsSubmitting(true);
    try {
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const payload: Partial<RoomType> = {
        name: name.trim(),
        slug,
        base_price: Number(basePrice) || 0,
        room_size: roomSize.trim(),
        facilities,
        description: description.trim(),
        photos,
        is_active: isActive,
      };

      if (roomTypeToEdit) {
        await KostApiClient.updateRoomType(roomTypeToEdit.id, payload);
        notify.success("Tipe Kamar Diperbarui", `Kategori "${name.trim()}" berhasil disimpan dan tersinkronisasi ke landing page.`);
      } else {
        await KostApiClient.createRoomType(payload);
        notify.success("Tipe Kamar Ditambahkan", `Kategori baru "${name.trim()}" berhasil dibuat.`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      notify.alert({
        title: "Gagal Menyimpan Tipe Kamar",
        message: err.message || "Terjadi kendala saat menghubungi server.",
        variant: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={roomTypeToEdit ? `Edit Tipe: ${roomTypeToEdit.name}` : "Tambah Kategori / Tipe Kamar"}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info Banner */}
        <div className="flex items-start gap-2.5 rounded-2xl bg-[#D9FF43]/20 p-3 text-xs font-semibold text-[#224400] dark:bg-[#D9FF43]/10 dark:text-[#D9FF43] border border-[#D9FF43]/30">
          <Globe className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="leading-snug">
            Data kategori ini (nama, tarif, ukuran, fasilitas, deskripsi, dan foto galeri) akan <strong>otomatis disinkronisasikan ke landing page publik</strong> untuk calon penyewa.
          </p>
        </div>

        {/* Basic Type Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
              Nama Jenis / Tipe Kamar *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Deluxe AC, VIP Balcony, Standard AC"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-2.5 text-xs font-bold text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
              Ukuran Kamar
            </label>
            <input
              type="text"
              placeholder="Contoh: 3 x 4 m"
              value={roomSize}
              onChange={(e) => setRoomSize(e.target.value)}
              className="w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-2.5 text-xs font-bold text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
              Tarif Sewa Acuan (Rp/bulan) *
            </label>
            <input
              type="number"
              required
              step={50000}
              min={0}
              value={basePrice}
              onChange={(e) => setBasePrice(Number(e.target.value))}
              className="w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-2.5 text-xs font-bold text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
              Status Tipe Kamar
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsActive(true)}
                className={`flex-1 rounded-2xl py-2.5 px-3 text-xs font-black transition-all ${
                  isActive
                    ? "bg-[#0A0A0A] text-white shadow-xs dark:bg-white dark:text-[#0A0A0A]"
                    : "border border-neutral-200 bg-neutral-50 text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800"
                }`}
              >
                Aktif (Tampil)
              </button>
              <button
                type="button"
                onClick={() => setIsActive(false)}
                className={`flex-1 rounded-2xl py-2.5 px-3 text-xs font-black transition-all ${
                  !isActive
                    ? "bg-rose-600 text-white shadow-xs"
                    : "border border-neutral-200 bg-neutral-50 text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800"
                }`}
              >
                Sembunyikan
              </button>
            </div>
          </div>
        </div>

        {/* Fasilitas Standar Tipe Kamar */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
            Fasilitas Standar Tipe Ini
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {COMMON_FACILITIES.map((fac) => {
              const isSelected = facilities.includes(fac);
              return (
                <button
                  type="button"
                  key={fac}
                  onClick={() => toggleFacility(fac)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-[#0A0A0A] text-white dark:bg-white dark:text-[#0A0A0A] shadow-xs"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
                  }`}
                >
                  {fac}
                </button>
              );
            })}
          </div>

          {/* Add custom facility */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Tambah fasilitas lain..."
              value={customFacility}
              onChange={(e) => setCustomFacility(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCustomFacility(e);
                }
              }}
              className="flex-1 rounded-2xl border border-neutral-200/80 bg-neutral-50 px-3.5 py-1.5 text-xs font-medium text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddCustomFacility}
              className="rounded-2xl text-xs font-bold shrink-0"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Tambah
            </Button>
          </div>
        </div>

        {/* Galeri Foto Tipe Kamar (Showcase Landing Page) */}
        <div className="rounded-3xl bg-neutral-50 p-4 border border-neutral-200/80 dark:bg-neutral-800/60 dark:border-neutral-700 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImagePlus className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
              <label className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                Galeri Foto Showcase Tipe Kamar
              </label>
            </div>
            <span className="rounded-full bg-neutral-200/70 px-2.5 py-0.5 text-[11px] font-bold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
              {photos.length} Foto
            </span>
          </div>

          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Foto ini akan menjadi galeri utama showcase tipe kamar di landing page publik.
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {photos.map((url, idx) => (
              <div
                key={url + idx}
                className="group relative aspect-video rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 shadow-xs"
              >
                <img
                  src={url}
                  alt={`Tipe ${name} ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(url)}
                  title="Hapus foto"
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors shadow-sm"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            <label className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 hover:border-neutral-500 bg-white/50 hover:bg-white dark:border-neutral-700 dark:bg-neutral-900/50 dark:hover:bg-neutral-900 transition-all text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
              {isUploadingPhotos ? (
                <div className="flex flex-col items-center gap-1">
                  <Loader2 className="h-5 w-5 animate-spin text-neutral-600 dark:text-neutral-300" />
                  <span className="text-[10px] font-bold">Mengunggah...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-center p-2">
                  <UploadCloud className="h-5 w-5 text-neutral-400" />
                  <span className="text-[10px] font-bold">+ Upload Foto</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={isUploadingPhotos}
                onChange={(e) => handleUploadPhotos(e.target.files)}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Deskripsi / Keterangan Kamar (Landing Page) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-neutral-500" />
              <span>Deskripsi / Keterangan Tipe Kamar (Landing Page)</span>
            </label>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Publik</span>
          </div>
          <textarea
            rows={4}
            placeholder="Contoh: Kamar Deluxe lantai 1 dengan pencahayaan alami yang baik, meja kerja lebar, kasur queen springbed empuk, dan kamar mandi dalam shower air panas."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 p-3 text-xs font-medium text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white leading-relaxed"
          />
          <p className="text-[10px] text-neutral-400 mt-1">
            Deskripsi ini akan dibaca oleh landing page publik untuk memperkenalkan keunggulan tipe kamar ini ke calon penyewa.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4 dark:border-white/10">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs font-bold"
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="lime"
            size="sm"
            disabled={isSubmitting}
            className="font-black text-xs shadow-lime-glow"
          >
            {isSubmitting ? "Menyimpan..." : roomTypeToEdit ? "Simpan Perubahan Tipe" : "Buat Tipe Kamar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
