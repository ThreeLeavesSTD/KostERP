"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Save,
  CheckCircle2,
  MapPin,
  Phone,
  FileText,
  ShieldAlert,
  Sparkles,
  ImagePlus,
  UploadCloud,
  X,
  Loader2,
} from "lucide-react";
import { UserRole, Property } from "@/types";
import { KostApiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

interface PropertySettingsViewProps {
  currentRole: UserRole;
}

export function PropertySettingsView({ currentRole }: PropertySettingsViewProps) {
  const [property, setProperty] = useState<Property | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Owner-only guard
  const isOwner = currentRole === "owner";

  const loadData = async () => {
    setIsLoading(true);
    try {
      const props = await KostApiClient.getProperties();
      if (props.length > 0) {
        const p = props[0];
        setProperty(p);
        setName(p.name || "");
        setAddress(p.address || "");
        setCity(p.city || "");
        setPhone(p.phone || "");
        setDescription(p.description || "");
        setCoverImage(p.cover_image || "");
      }
    } catch (err) {
      console.error("Gagal memuat pengaturan properti:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUploadCover = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setIsUploadingCover(true);
    const supabase = createClient();
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `property-cover/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage.from("room-photos").upload(path, file);
      if (error) {
        alert(`Gagal mengunggah foto sampul: ${error.message}`);
        return;
      }
      const { data } = supabase.storage.from("room-photos").getPublicUrl(path);
      if (data?.publicUrl) {
        setCoverImage(data.publicUrl);
      }
    } catch (err: any) {
      alert(`Gagal mengunggah foto sampul: ${err.message}`);
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;

    if (!name.trim()) {
      alert("Nama properti wajib diisi.");
      return;
    }

    if (!address.trim()) {
      alert("Alamat properti wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      await KostApiClient.updateProperty(property.id, {
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        phone: phone.trim(),
        description: description.trim(),
        cover_image: coverImage.trim(),
      });

      setProperty((prev) =>
        prev
          ? {
              ...prev,
              name: name.trim(),
              address: address.trim(),
              city: city.trim(),
              phone: phone.trim(),
              description: description.trim(),
              cover_image: coverImage.trim(),
            }
          : null
      );

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } catch (err: any) {
      alert(`Gagal menyimpan pengaturan properti: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-white dark:bg-[#18181B] rounded-3xl shadow-spatial border border-neutral-100 dark:border-white/10">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h3 className="text-base font-black text-neutral-900 dark:text-white">
          Akses Ditolak
        </h3>
        <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm">
          Akses ditolak — hanya Owner yang dapat mengubah pengaturan properti.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent dark:border-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Utama */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
              Pengaturan Properti
            </h2>
            <Badge className="bg-[#D9FF43] text-[#0A0A0A] font-black hover:bg-[#D9FF43]">
              Owner
            </Badge>
          </div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-1">
            Identitas properti ini tampil sebagai judul ERP, lokasi header, dan template WhatsApp penagihan.
          </p>
        </div>

        {/* Live Preview Pill */}
        <div className="hidden sm:flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2 text-xs font-bold text-neutral-700 shadow-spatial border border-white/80 dark:bg-[#18181B] dark:text-neutral-300 dark:border-white/10">
          <Building2 className="h-4 w-4 text-neutral-500" />
          <span className="font-extrabold">{name || "Nama Properti"}</span>
          <span className="text-neutral-300 dark:text-neutral-700">•</span>
          <span className="text-neutral-500 font-medium truncate max-w-[150px]">
            {city || "Kota"}
          </span>
        </div>
      </div>

      {/* Success Notification Banner */}
      {isSaved && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 border border-emerald-200 shadow-xs dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Pengaturan properti berhasil disimpan dan langsung diperbarui ke sistem!</span>
        </div>
      )}

      {/* Form Settings Card */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-3xl bg-white p-6 shadow-spatial border border-white/80 dark:bg-[#18181B] dark:border-white/10 space-y-5">
          {/* Section 1: Nama & Kontak */}
          <div>
            <h3 className="text-xs font-extrabold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-[#0A0A0A] dark:text-white" />
              <span>Identitas & Kontak Utama</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nama Properti */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-neutral-400" />
                  <span>Nama Properti Kost</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Kost Putri Graha Asri"
                  required
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-xs font-bold text-neutral-900 focus:bg-white focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800/80 dark:border-neutral-700 dark:text-white transition-all"
                />
                <p className="text-[10px] font-semibold text-neutral-400 mt-1">
                  Nama ini akan menjadi judul utama aplikasi pada bilah header kiri atas.
                </p>
              </div>

              {/* Kota */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                  <span>Kota / Wilayah</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Contoh: Depok"
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-xs font-bold text-neutral-900 focus:bg-white focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800/80 dark:border-neutral-700 dark:text-white transition-all"
                />
              </div>

              {/* Telepon / WhatsApp */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-neutral-400" />
                  <span>No. WhatsApp / Telepon Pengelola</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contoh: +6281234567890"
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-xs font-bold text-neutral-900 focus:bg-white focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800/80 dark:border-neutral-700 dark:text-white transition-all"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-neutral-100 dark:bg-white/5 my-4" />

          {/* Section 2: Alamat & Keterangan */}
          <div>
            <h3 className="text-xs font-extrabold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-neutral-400" />
              <span>Lokasi & Deskripsi Gedung</span>
            </h3>

            <div className="space-y-4">
              {/* Alamat Lengkap */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  <span>Alamat Lengkap</span>
                  <span className="text-rose-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Contoh: Jl. Margonda Raya No. 45, Beji"
                  required
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-xs font-bold text-neutral-900 focus:bg-white focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800/80 dark:border-neutral-700 dark:text-white transition-all"
                />
                <p className="text-[10px] font-semibold text-neutral-400 mt-1">
                  Ditampilkan pada kapsul lokasi di pojok kanan atas dan digunakan di invoice WhatsApp.
                </p>
              </div>

              {/* Keterangan Properti (Deskripsi) */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-neutral-400" />
                  <span>Keterangan Properti (Fasilitas, Kebijakan, & Target)</span>
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Kost putri dekat kampus UI, WiFi dedicated + AC, keamanan CCTV 24 jam, parkir motor luas."
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-xs font-medium text-neutral-900 focus:bg-white focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800/80 dark:border-neutral-700 dark:text-white transition-all leading-relaxed"
                />
                <p className="text-[10px] font-semibold text-neutral-400 mt-1">
                  Deskripsi singkat properti (fasilitas, target penghuni, lokasi).
                </p>
              </div>

              {/* Foto Sampul Properti (Cover Hero Image) */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
                  <ImagePlus className="h-3.5 w-3.5 text-neutral-400" />
                  <span>Foto Sampul Properti (Hero Landing Page)</span>
                </label>

                {coverImage ? (
                  <div className="relative aspect-video max-w-md rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 shadow-spatial mb-2">
                    <img
                      src={coverImage}
                      alt="Cover Properti"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setCoverImage("")}
                      title="Hapus foto sampul"
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/75 text-white hover:bg-rose-600 transition-colors shadow-md"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex aspect-video max-w-md cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 hover:border-neutral-500 bg-neutral-50/50 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/40 dark:hover:bg-neutral-800 transition-all text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
                    {isUploadingCover ? (
                      <div className="flex flex-col items-center gap-1.5">
                        <Loader2 className="h-6 w-6 animate-spin text-neutral-600 dark:text-neutral-300" />
                        <span className="text-xs font-bold">Mengunggah Foto Sampul...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-center p-4">
                        <UploadCloud className="h-7 w-7 text-neutral-400" />
                        <span className="text-xs font-bold">Pilih Foto Sampul Properti</span>
                        <span className="text-[10px] text-neutral-400">Format gambar (JPG, PNG, WebP)</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploadingCover}
                      onChange={(e) => handleUploadCover(e.target.files)}
                      className="hidden"
                    />
                  </label>
                )}
                <p className="text-[10px] font-semibold text-neutral-400 mt-1">
                  Foto ini akan tampil sebagai banner hero utama di landing page publik kost Anda.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="gap-2 rounded-2xl px-6 py-2.5 text-xs font-black shadow-spatial bg-[#0A0A0A] text-white hover:bg-neutral-800 dark:bg-white dark:text-[#0A0A0A] transition-transform active:scale-95"
          >
            <Save className="h-4 w-4" />
            <span>{isSubmitting ? "Menyimpan..." : "Simpan Pengaturan Properti"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

export default PropertySettingsView;
