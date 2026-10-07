"use client";

import React, { useState, useEffect } from "react";
import { User, Phone, ShieldCheck, UserCheck, Key, Calendar, Globe, Layers, Info } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Room, RoomStatus, RoomType, Tenant } from "@/types";
import { KostApiClient } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/lib/notify";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/utils";

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomToEdit?: Room | null;
  onSuccess: () => void;
}

const COMMON_FACILITIES = [
  "AC",
  "Kamar Mandi Dalam",
  "Kamar Mandi Luar",
  "Kasur Springbed",
  "Lemari",
  "Meja Belajar",
  "Water Heater",
  "Smart TV",
  "WiFi",
  "Balkon",
];

export function RoomModal({ isOpen, onClose, roomToEdit, onSuccess }: RoomModalProps) {
  const [roomNumber, setRoomNumber] = useState("");
  const [floor, setFloor] = useState(1);
  const [roomType, setRoomType] = useState("Standard AC");
  const [basePrice, setBasePrice] = useState(1500000);
  const [status, setStatus] = useState<RoomStatus>("available");
  const [facilities, setFacilities] = useState<string[]>([
    "AC",
    "Kamar Mandi Dalam",
    "Kasur Springbed",
  ]);
  const [notes, setNotes] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>("");
  const [isCustomType, setIsCustomType] = useState(false);

  // Relational Tenant Connection (Primary Key: Tenant.id)
  const [tenantsList, setTenantsList] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [leaseEndDate, setLeaseEndDate] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      KostApiClient.getTenants(),
      KostApiClient.getRoomTypes(),
    ])
      .then(([tenantsData, typesData]) => {
        if (!isMounted) return;
        setTenantsList(tenantsData);
        setRoomTypes(typesData);

        if (roomToEdit) {
          setRoomNumber(roomToEdit.room_number);
          setFloor(roomToEdit.floor);
          setRoomType(roomToEdit.room_type || "Standard AC");
          setBasePrice(roomToEdit.base_price);
          setStatus(roomToEdit.status);
          setFacilities(roomToEdit.facilities || []);
          setNotes(roomToEdit.notes || "");
          setDescription(roomToEdit.description || "");
          setPhotos(roomToEdit.photos || []);
          setSelectedTenantId(roomToEdit.tenant_id || roomToEdit.current_tenant?.id || "");
          setLeaseEndDate(roomToEdit.current_tenant?.end_date || "");

          const matchedType = typesData.find(
            (t) => t.id === roomToEdit.room_type_id || t.name.toLowerCase() === (roomToEdit.room_type || "").toLowerCase()
          );
          if (matchedType) {
            setSelectedRoomTypeId(matchedType.id);
            setIsCustomType(false);
          } else if (roomToEdit.room_type) {
            setIsCustomType(true);
          }
        } else {
          setRoomNumber("");
          setFloor(1);
          setStatus("available");
          setNotes("");
          setDescription("");
          setPhotos([]);
          setSelectedTenantId("");
          setLeaseEndDate("");

          if (typesData.length > 0) {
            const first = typesData[0];
            setSelectedRoomTypeId(first.id);
            setRoomType(first.name);
            setBasePrice(first.base_price);
            setFacilities(first.facilities || ["AC", "Kamar Mandi Dalam", "Kasur Springbed"]);
            setIsCustomType(false);
          } else {
            setRoomType("Standard AC");
            setBasePrice(1500000);
            setFacilities(["AC", "Kamar Mandi Dalam", "Kasur Springbed"]);
          }
        }
      })
      .catch((err) => console.error("Gagal memuat data kamar modal:", err));

    return () => {
      isMounted = false;
    };
  }, [roomToEdit, isOpen]);

  const handleRoomTypeSelect = (typeId: string) => {
    setSelectedRoomTypeId(typeId);
    const matched = roomTypes.find((rt) => rt.id === typeId);
    if (matched) {
      setRoomType(matched.name);
      setBasePrice(matched.base_price);
      if (matched.facilities && matched.facilities.length > 0) {
        setFacilities(matched.facilities);
      }
      if (matched.description) {
        setDescription(matched.description);
      }
    }
  };

  const toggleFacility = (fac: string) => {
    if (facilities.includes(fac)) {
      setFacilities(facilities.filter((f) => f !== fac));
    } else {
      setFacilities([...facilities, fac]);
    }
  };

  const handleTenantSelect = (tId: string) => {
    setSelectedTenantId(tId);
    if (tId) {
      setStatus("occupied");
      if (!leaseEndDate) {
        const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
        setLeaseEndDate(nextYear);
      }
    } else if (status === "occupied") {
      setStatus("available");
    }
  };

  const selectedTenantObj = tenantsList.find((t) => t.id === selectedTenantId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber.trim()) {
      notify.warning("Nomor Kamar Wajib Diisi", "Silakan masukkan nomor unit kamar.");
      return;
    }

    try {
      if (roomToEdit) {
        await KostApiClient.updateRoom(roomToEdit.id, {
          room_number: roomNumber.trim(),
          floor: Number(floor),
          room_type: roomType,
          room_type_id: selectedRoomTypeId || undefined,
          base_price: Number(basePrice),
          status,
          facilities,
          notes,
          description,
          photos,
        });

        notify.success("Kamar Diperbarui", `Perubahan data Kamar ${roomNumber.trim()} berhasil disimpan.`);
      } else {
        await KostApiClient.createRoom({
          room_number: roomNumber.trim(),
          floor: Number(floor),
          room_type: roomType,
          room_type_id: selectedRoomTypeId || undefined,
          base_price: Number(basePrice),
          status,
          facilities,
          notes,
          description,
          photos,
        });

        notify.success("Kamar Ditambahkan", `Kamar ${roomNumber.trim()} berhasil didaftarkan ke sistem.`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      notify.alert({
        title: "Gagal Menyimpan Kamar",
        message: err.message || "Terjadi kesalahan saat menghubungi server.",
        variant: "danger",
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={roomToEdit ? `Edit Kamar ${roomToEdit.room_number}` : "Tambah Kamar Baru"}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Room Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
              Nomor Kamar *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: 101"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              className="w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-2.5 text-xs font-bold text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
              Lantai
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={floor}
              onChange={(e) => setFloor(Number(e.target.value))}
              className="w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-2.5 text-xs font-bold text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
            />
          </div>
        </div>

        {/* Tipe / Kategori Kamar & Tarif */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Kategori / Tipe Kamar *
                </label>
              </div>
              <select
                value={isCustomType ? "__custom__" : (selectedRoomTypeId || "")}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__custom__") {
                    setIsCustomType(true);
                    setSelectedRoomTypeId("");
                  } else {
                    setIsCustomType(false);
                    handleRoomTypeSelect(val);
                  }
                }}
                className="w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-2.5 text-xs font-bold text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              >
                <option value="">-- Pilih Kategori Kamar --</option>
                {roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name} {rt.room_size ? `(${rt.room_size})` : ""} - {formatRupiah(rt.base_price)}/bln
                  </option>
                ))}
                <option value="__custom__">+ Input Nama Tipe Kustom...</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                Tarif Sewa Bulanan (Rp) *
              </label>
              <input
                type="number"
                required
                step={50000}
                min={100000}
                value={basePrice}
                onChange={(e) => setBasePrice(Number(e.target.value))}
                className="w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-2.5 text-xs font-bold text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              />
            </div>
          </div>

          {isCustomType && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                Nama Tipe Kamar Kustom *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Studio Executive"
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-2.5 text-xs font-bold text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              />
            </div>
          )}

          {/* Connected Room Type Showcase Card */}
          {roomTypes.find((t) => t.id === selectedRoomTypeId || t.name.toLowerCase() === roomType.toLowerCase()) && (() => {
            const selectedTypeObj = roomTypes.find((t) => t.id === selectedRoomTypeId || t.name.toLowerCase() === roomType.toLowerCase())!;
            return (
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {selectedTypeObj.photos?.[0] ? (
                    <img
                      src={selectedTypeObj.photos[0]}
                      alt={selectedTypeObj.name}
                      className="h-10 w-10 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700 shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shrink-0">
                      <Layers className="h-5 w-5 text-emerald-600 dark:text-[#D9FF43]" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-neutral-900 dark:text-white truncate">
                        Kategori: {selectedTypeObj.name}
                      </span>
                      {selectedTypeObj.room_size && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-white/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                          {selectedTypeObj.room_size}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400 truncate">
                      {selectedTypeObj.description || "Foto & keterangan landing page terhubung langsung ke kategori ini"}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                    <Globe className="h-3 w-3" /> Sync Web
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Status Kamar */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
            Status Unit Kamar
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                id: "available",
                label: "Tersedia / Siap Huni",
                color: "bg-[#D9FF43] text-[#0A0A0A] font-black shadow-lime-glow",
              },
              {
                id: "occupied",
                label: "Terisi (Penghuni Aktif)",
                color: "bg-[#0A0A0A] text-white font-black dark:bg-white dark:text-[#0A0A0A]",
              },
              {
                id: "maintenance",
                label: "Perbaikan",
                color: "bg-amber-500 text-white font-black",
              },
            ].map((st) => (
              <button
                type="button"
                key={st.id}
                onClick={() => {
                  setStatus(st.id as RoomStatus);
                  if (st.id === "available") {
                    setSelectedTenantId("");
                  }
                }}
                className={`rounded-2xl border p-2.5 text-center text-xs font-bold transition-all ${
                  status === st.id
                    ? st.color
                    : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* PENGHUNI KAMAR */}
        <div className="rounded-3xl bg-neutral-50 p-4 border border-neutral-200/80 dark:bg-neutral-800/60 dark:border-neutral-700 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
              <label className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                Penghuni Kamar
              </label>
            </div>
            {selectedTenantObj ? (
              <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 text-[11px] font-bold border border-emerald-500/20">
                Penyewa Aktif
              </span>
            ) : (
              <span className="rounded-full bg-neutral-200/70 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300 px-2.5 py-0.5 text-[11px] font-bold">
                Kamar Kosong
              </span>
            )}
          </div>

          <div>
            <select
              value={selectedTenantId}
              onChange={(e) => handleTenantSelect(e.target.value)}
              className="w-full rounded-2xl border border-neutral-200 bg-white p-3 text-xs font-bold text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
            >
              <option value="">-- Pilih Penghuni (atau Kosongkan) --</option>
              {tenantsList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name} · {t.phone_number} {t.id_card_number ? `(NIK: ${t.id_card_number})` : ""}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
              Pilih dari data penghuni yang sudah terdaftar. Data kontak akan otomatis terhubung ke kamar ini.
            </p>
          </div>

          {/* Connected Tenant Live Preview */}
          {selectedTenantObj && (
            <div className="rounded-2xl bg-white p-3.5 border border-neutral-200/80 dark:bg-neutral-900 dark:border-neutral-700 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0A0A0A] text-[#D9FF43] font-black text-xs shadow-xs dark:bg-white dark:text-[#0A0A0A]">
                    {selectedTenantObj.full_name[0]}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-neutral-900 dark:text-white text-xs">
                      {selectedTenantObj.full_name}
                    </h4>
                    <p className="text-[11px] font-medium text-neutral-500">
                      Penghuni Terdaftar
                    </p>
                  </div>
                </div>
                <Badge variant="success">Data Terhubung</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-600 dark:text-neutral-300 pt-2 border-t border-neutral-100 dark:border-white/5">
                <div>
                  <span className="text-neutral-400">WhatsApp: </span>
                  <span className="font-bold text-neutral-800 dark:text-neutral-200">{selectedTenantObj.phone_number}</span>
                </div>
                <div>
                  <span className="text-neutral-400">NIK KTP: </span>
                  <span className="font-bold text-neutral-800 dark:text-neutral-200">{selectedTenantObj.id_card_number || "-"}</span>
                </div>
                {selectedTenantObj.emergency_contact_name && (
                  <div className="col-span-2">
                    <span className="text-neutral-400">Kontak Darurat: </span>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">{selectedTenantObj.emergency_contact_name} ({selectedTenantObj.emergency_contact_phone})</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Fasilitas Kamar */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
            Fasilitas Kamar Bawaan
          </label>
          <div className="flex flex-wrap gap-1.5">
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
        </div>

        {/* Showcase Banner: Explaining Landing Page Centralization */}
        <div className="rounded-2xl p-3.5 bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
          <Globe className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <p className="font-bold">
              Foto Kamar Terpusat pada Kategori Showcase ({roomType || "Kategori"})
            </p>
            <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
              Galeri foto, fasilitas standar, dan harga acuan website publik dikelola pada menu <strong>Kategori & Showcase Landing Page</strong>. Unit nomor {roomNumber || "ini"} otomatis tampil di website publik mengikuti foto kategori tersebut.
            </p>
          </div>
        </div>

        {/* Keterangan Tambahan Unit (Opsional) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-neutral-500" />
              <span>Keterangan Tambahan Unit {roomNumber || ""} (Opsional)</span>
            </label>
            <span className="text-[10px] font-semibold text-neutral-500">Unit Spesifik</span>
          </div>
          <textarea
            rows={2}
            placeholder="Contoh: Unit sudut dengan sirkulasi angin sepoi-sepoi, dekat tangga utama."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 p-3 text-xs font-medium text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
          />
        </div>

        {/* Catatan Kamar (Internal Pengelola) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
            Catatan Kamar (Internal Pengelola)
          </label>
          <textarea
            rows={2}
            placeholder="Contoh: Dekat pintu gerbang depan, meteran listrik nomor 4"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 p-3 text-xs font-medium text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4 dark:border-white/10">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs font-bold">
            Batal
          </Button>
          <Button type="submit" variant="lime" size="sm" className="font-black text-xs shadow-lime-glow">
            {roomToEdit ? "Simpan Perubahan Relasi" : "Simpan Unit Kamar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
