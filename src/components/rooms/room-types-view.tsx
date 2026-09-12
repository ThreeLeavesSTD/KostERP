"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Globe,
  DoorClosed,
  Maximize2,
  CheckCircle2,
  Sparkles,
  Image as ImageIcon,
  ShieldAlert,
} from "lucide-react";
import { RoomType, UserRole } from "@/types";
import { KostApiClient } from "@/lib/api-client";
import { formatRupiah } from "@/lib/utils";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RoomTypeModal } from "./room-type-modal";

interface RoomTypesViewProps {
  currentRole?: UserRole;
  onNavigateTab?: (tab: string) => void;
}

export function RoomTypesView({ currentRole, onNavigateTab }: RoomTypesViewProps) {
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTypeToEdit, setSelectedTypeToEdit] = useState<RoomType | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await KostApiClient.getRoomTypes();
      setRoomTypes(data);
    } catch (err) {
      console.error("Gagal memuat tipe kamar:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setSelectedTypeToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rt: RoomType) => {
    setSelectedTypeToEdit(rt);
    setIsModalOpen(true);
  };

  const handleDelete = async (rt: RoomType) => {
    if (rt.total_rooms && rt.total_rooms > 0) {
      notify.alert({
        title: "Kategori Memiliki Unit Terhubung",
        message: `Kategori "${rt.name}" saat ini masih terhubung ke ${rt.total_rooms} unit kamar. Ubah tipe kamar unit tersebut terlebih dahulu sebelum menghapus kategori ini.`,
        variant: "warning",
      });
      return;
    }

    const ok = await notify.confirmDelete({
      title: "Hapus Tipe Kamar",
      itemName: rt.name,
      itemType: "Kategori Kamar",
      itemDetails: `${formatRupiah(rt.base_price)}/bln ${rt.room_size ? `• ${rt.room_size}` : ""}`,
      message: `Apakah Anda yakin ingin menghapus kategori "${rt.name}"? Tipe ini tidak akan tampil lagi di landing page publik.`,
      warningNote: "Data showcase dan konfigurasi harga acuan kategori ini akan dihapus.",
      confirmText: "Hapus Kategori",
      cancelText: "Batal",
    });

    if (ok) {
      try {
        await KostApiClient.deleteRoomType(rt.id);
        notify.success("Tipe Kamar Dihapus", `Kategori "${rt.name}" berhasil dihapus.`);
        loadData();
      } catch (err: any) {
        notify.alert({
          title: "Gagal Menghapus",
          message: err.message || "Terjadi kesalahan saat menghapus tipe kamar.",
          variant: "danger",
        });
      }
    }
  };

  const totalTypes = roomTypes.length;
  const totalUnits = roomTypes.reduce((acc, curr) => acc + (curr.total_rooms || 0), 0);
  const totalAvailable = roomTypes.reduce((acc, curr) => acc + (curr.available_rooms || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Utama */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
              Kategori & Showcase Kamar
            </h2>
            <Badge className="bg-[#D9FF43] text-[#0A0A0A] font-black hover:bg-[#D9FF43]">
              Landing Page Sync
            </Badge>
          </div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-1 max-w-2xl leading-relaxed">
            Kelola jenis kamar (Deluxe, Standard, VIP, dll.), tarif acuan, fasilitas standar, deskripsi publik, dan galeri foto. Data ini langsung terbaca oleh landing page publik via Supabase anon key.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onNavigateTab && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab("rooms")}
              className="gap-2 rounded-2xl text-xs font-bold border-neutral-200 dark:border-white/10"
            >
              <DoorClosed className="h-4 w-4" />
              <span>Lihat Unit Kamar</span>
            </Button>
          )}

          <Button
            onClick={handleOpenAdd}
            className="gap-2 rounded-2xl px-5 py-2.5 text-xs font-black shadow-spatial bg-[#0A0A0A] text-white hover:bg-neutral-800 dark:bg-white dark:text-[#0A0A0A] transition-transform active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Tipe Kamar</span>
          </Button>
        </div>
      </div>

      {/* Sub-Navigation Switcher between Units and Showcase Categories */}
      {onNavigateTab && (
        <div className="flex items-center gap-2 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-2xl w-fit border border-neutral-200/80 dark:border-white/5">
          <button
            type="button"
            onClick={() => onNavigateTab("rooms")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <DoorClosed className="h-4 w-4 text-neutral-500" />
            <span>Unit Kamar ({totalUnits})</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-white dark:bg-[#18181B] text-neutral-900 dark:text-white shadow-xs"
          >
            <Layers className="h-4 w-4 text-emerald-500" />
            <span>Kategori & Showcase Landing Page</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#D9FF43] text-[#0A0A0A] font-black">Sync Web</span>
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-3xl bg-white p-4 shadow-spatial border border-white/80 dark:bg-[#18181B] dark:border-white/10">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
            Total Kategori
          </p>
          <p className="text-2xl font-black text-neutral-900 dark:text-white mt-0.5">
            {totalTypes} Jenis
          </p>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-spatial border border-white/80 dark:bg-[#18181B] dark:border-white/10">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
            Total Unit Terhubung
          </p>
          <p className="text-2xl font-black text-neutral-900 dark:text-white mt-0.5">
            {totalUnits} Unit
          </p>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-spatial border border-white/80 dark:bg-[#18181B] dark:border-white/10">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#254600] dark:text-[#D9FF43]">
            Kamar Siap Huni
          </p>
          <p className="text-2xl font-black text-[#254600] dark:text-[#D9FF43] mt-0.5">
            {totalAvailable} Kamar
          </p>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-spatial border border-white/80 dark:bg-[#18181B] dark:border-white/10 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            <Globe className="h-3.5 w-3.5" />
            <span>Status Sinkronisasi</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black text-neutral-900 dark:text-white">
              Publik Anon Aktif
            </span>
          </div>
        </div>
      </div>

      {/* Bento Grid Kategori Kamar */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent dark:border-white" />
        </div>
      ) : roomTypes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-neutral-300 p-12 text-center bg-white/50 dark:bg-neutral-900/50">
          <Layers className="mx-auto h-12 w-12 text-neutral-400" />
          <h3 className="mt-2 text-sm font-bold text-neutral-900 dark:text-white">
            Belum Ada Kategori Kamar
          </h3>
          <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
            Buat tipe kamar pertama Anda untuk mengatur showcase fasilitas, tarif, dan galeri foto di landing page.
          </p>
          <Button
            onClick={handleOpenAdd}
            variant="lime"
            size="sm"
            className="mt-4 font-black text-xs shadow-lime-glow"
          >
            + Tambah Tipe Kamar Pertama
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {roomTypes.map((rt) => {
            const hasPhotos = rt.photos && rt.photos.length > 0;
            const mainPhoto = hasPhotos ? rt.photos![0] : null;

            return (
              <div
                key={rt.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/80 bg-white p-5 shadow-spatial transition-all duration-300 hover:shadow-spatial-lg hover:border-neutral-300 dark:bg-[#18181B] dark:border-white/10"
              >
                <div>
                  {/* Photo Showcase Banner */}
                  <div className="relative -mx-5 -mt-5 mb-4 h-44 overflow-hidden rounded-t-3xl bg-neutral-100 dark:bg-neutral-800">
                    {mainPhoto ? (
                      <img
                        src={mainPhoto}
                        alt={rt.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-neutral-400">
                        <ImageIcon className="h-10 w-10 stroke-1" />
                      </div>
                    )}

                    {/* Photo Count Pill */}
                    {hasPhotos && (
                      <span className="absolute bottom-2.5 right-2.5 rounded-full bg-black/65 backdrop-blur-xs px-2.5 py-0.5 text-[11px] font-bold text-white shadow-xs">
                        {rt.photos!.length} Foto Showcase
                      </span>
                    )}

                    {/* Status Pill */}
                    <span
                      className={`absolute top-2.5 left-2.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        rt.is_active !== false
                          ? "bg-[#D9FF43] text-[#0A0A0A] shadow-xs"
                          : "bg-neutral-800/80 text-white"
                      }`}
                    >
                      {rt.is_active !== false ? "Tampil di Landing" : "Disembunyikan"}
                    </span>
                  </div>

                  {/* Title & Size */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">
                        {rt.name}
                      </h3>
                      {rt.room_size && (
                        <p className="text-xs font-semibold text-neutral-500 flex items-center gap-1 mt-0.5">
                          <Maximize2 className="h-3 w-3" />
                          <span>Ukuran: {rt.room_size}</span>
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                        Tarif Acuan
                      </span>
                      <span className="text-base font-black text-neutral-900 dark:text-white">
                        {formatRupiah(rt.base_price)}
                      </span>
                      <span className="text-[10px] text-neutral-400">/bln</span>
                    </div>
                  </div>

                  {/* Public Description (Landing Page) */}
                  {rt.description && (
                    <div className="mt-3 rounded-2xl bg-neutral-50 p-3 text-xs text-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-300 border border-neutral-100 dark:border-white/5">
                      <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1">
                        <Globe className="h-3 w-3 text-emerald-500" />
                        <span>Keterangan Landing Page</span>
                      </div>
                      <p className="text-[11px] font-medium leading-relaxed line-clamp-3">
                        {rt.description}
                      </p>
                    </div>
                  )}

                  {/* Facilities Badges */}
                  {rt.facilities && rt.facilities.length > 0 && (
                    <div className="mt-3.5 flex flex-wrap gap-1.5">
                      {rt.facilities.slice(0, 4).map((f) => (
                        <span
                          key={f}
                          className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                        >
                          {f}
                        </span>
                      ))}
                      {rt.facilities.length > 4 && (
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-500 dark:bg-neutral-800">
                          +{rt.facilities.length - 4} lagi
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer: Units Availability & Actions */}
                <div className="mt-5 pt-3.5 border-t border-neutral-100 dark:border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        (rt.available_rooms || 0) > 0 ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-700"
                      }`}
                    />
                    <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      {rt.total_rooms || 0} Unit
                    </span>
                    <span className="text-neutral-300 dark:text-neutral-700">•</span>
                    <span className="text-xs font-semibold text-neutral-500">
                      {rt.available_rooms || 0} Siap Huni
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(rt)}
                      title="Edit Tipe Kamar"
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-300 transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(rt)}
                      title="Hapus Tipe Kamar"
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-400 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal CRUD RoomType */}
      <RoomTypeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        roomTypeToEdit={selectedTypeToEdit}
        onSuccess={loadData}
      />
    </div>
  );
}
