"use client";

import React, { useState, useEffect } from "react";
import { User, Phone, ShieldCheck, UserCheck, Key, Calendar } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Room, RoomStatus, Tenant } from "@/types";
import { KostStorage } from "@/lib/storage";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/lib/notify";

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

  // Relational Tenant Connection (Primary Key: Tenant.id)
  const [tenantsList, setTenantsList] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [leaseEndDate, setLeaseEndDate] = useState<string>("");

  useEffect(() => {
    const allTenants = KostStorage.getTenants();
    setTenantsList(allTenants);

    if (roomToEdit) {
      setRoomNumber(roomToEdit.room_number);
      setFloor(roomToEdit.floor);
      setRoomType(roomToEdit.room_type || "Standard AC");
      setBasePrice(roomToEdit.base_price);
      setStatus(roomToEdit.status);
      setFacilities(roomToEdit.facilities || []);
      setNotes(roomToEdit.notes || "");
      setSelectedTenantId(roomToEdit.tenant_id || roomToEdit.current_tenant?.id || "");
      setLeaseEndDate(roomToEdit.current_tenant?.end_date || "");
    } else {
      setRoomNumber("");
      setFloor(1);
      setRoomType("Standard AC");
      setBasePrice(1500000);
      setStatus("available");
      setFacilities(["AC", "Kamar Mandi Dalam", "Kasur Springbed"]);
      setNotes("");
      setSelectedTenantId("");
      setLeaseEndDate("");
    }
  }, [roomToEdit, isOpen]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber.trim()) {
      notify.warning("Nomor Kamar Wajib Diisi", "Silakan masukkan nomor unit kamar.");
      return;
    }

    if (roomToEdit) {
      KostStorage.updateRoom(roomToEdit.id, {
        room_number: roomNumber.trim(),
        floor: Number(floor),
        room_type: roomType,
        base_price: Number(basePrice),
        status,
        facilities,
        notes,
        tenant_id: selectedTenantId || undefined,
      });

      if (selectedTenantId) {
        KostStorage.assignTenantToRoom(roomToEdit.id, selectedTenantId, leaseEndDate);
      } else if (status !== "occupied") {
        KostStorage.assignTenantToRoom(roomToEdit.id, null);
      }
      notify.success("Kamar Diperbarui", `Perubahan data Kamar ${roomNumber.trim()} berhasil disimpan.`);
    } else {
      const props = KostStorage.getProperties();
      const property_id = props[0]?.id && props[0].id.includes("-") && props[0].id.length > 20
        ? props[0].id
        : "a0000000-0000-0000-0000-000000000001";
      const created = KostStorage.addRoom({
        property_id,
        room_number: roomNumber.trim(),
        floor: Number(floor),
        room_type: roomType,
        base_price: Number(basePrice),
        status: selectedTenantId ? "occupied" : status,
        facilities,
        notes,
        tenant_id: selectedTenantId || undefined,
      });

      if (selectedTenantId) {
        KostStorage.assignTenantToRoom(created.id, selectedTenantId, leaseEndDate);
      }
      notify.success("Kamar Ditambahkan", `Kamar ${roomNumber.trim()} berhasil didaftarkan ke sistem.`);
    }

    onSuccess();
    onClose();
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
              Tipe Kamar
            </label>
            <select
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              className="w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-2.5 text-xs font-bold text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
            >
              <option value="Deluxe AC">Deluxe AC</option>
              <option value="Standard AC">Standard AC</option>
              <option value="Standard Non-AC">Standard Non-AC</option>
              <option value="VIP Balcony AC">VIP Balcony AC</option>
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

        {/* Catatan */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
            Catatan Kamar
          </label>
          <textarea
            rows={2}
            placeholder="Contoh: Dekat balkon utama, jendela menghadap barat"
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
