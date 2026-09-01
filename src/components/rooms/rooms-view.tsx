"use client";

import React, { useState, useEffect } from "react";
import {
  DoorClosed,
  Plus,
  Search,
  Filter,
  Layers,
  Edit2,
  Trash2,
  UserCheck,
  UserPlus,
  Zap,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  Bot,
  FileText,
} from "lucide-react";
import { Room, RoomStatus, RoomComplaint } from "@/types";
import { KostStorage } from "@/lib/storage";
import { formatRupiah, getRoomStatusInfo } from "@/lib/utils";
import { notify } from "@/lib/notify";
import { RoomModal } from "./room-modal";
import { RoomComplaintsModal } from "./room-complaints-modal";
import { Button } from "@/components/ui/button";

interface RoomsViewProps {
  onCreateLeaseForRoom?: (roomId: string) => void;
  onOpenElectricityForRoom?: (roomId: string) => void;
}

export function RoomsView({
  onCreateLeaseForRoom,
  onOpenElectricityForRoom,
}: RoomsViewProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [complaints, setComplaints] = useState<RoomComplaint[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFloor, setSelectedFloor] = useState<number | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<RoomStatus | "with_complaints" | "all">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roomToEdit, setRoomToEdit] = useState<Room | null>(null);

  // Complaints Modal State
  const [isComplaintsModalOpen, setIsComplaintsModalOpen] = useState(false);
  const [selectedRoomForComplaints, setSelectedRoomForComplaints] = useState<string | undefined>(undefined);

  const loadData = () => {
    setRooms(KostStorage.getRooms());
    setComplaints(KostStorage.getComplaints());
  };

  useEffect(() => {
    loadData();
    const handleStorageChange = () => loadData();
    window.addEventListener("kost_storage_change", handleStorageChange);
    return () => window.removeEventListener("kost_storage_change", handleStorageChange);
  }, []);

  const floors = Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b);

  const activeComplaints = complaints.filter(
    (c) => c.status === "pending" || c.status === "in_progress"
  );

  const filteredRooms = rooms.filter((r) => {
    const matchesSearch =
      r.room_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.room_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.current_tenant?.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFloor = selectedFloor === "all" || r.floor === selectedFloor;
    
    let matchesStatus = true;
    if (selectedStatus === "with_complaints") {
      matchesStatus = complaints.some(
        (c) =>
          (c.room_id === r.id || c.room_number === r.room_number) &&
          (c.status === "pending" || c.status === "in_progress")
      );
    } else if (selectedStatus !== "all") {
      matchesStatus = r.status === selectedStatus;
    }

    return matchesSearch && matchesFloor && matchesStatus;
  });

  const availableCount = rooms.filter((r) => r.status === "available").length;
  const occupiedCount = rooms.filter((r) => r.status === "occupied").length;
  const maintenanceCount = rooms.filter((r) => r.status === "maintenance").length;
  const roomsWithComplaintsCount = rooms.filter((r) =>
    complaints.some(
      (c) =>
        (c.room_id === r.id || c.room_number === r.room_number) &&
        (c.status === "pending" || c.status === "in_progress")
    )
  ).length;

  const handleDeleteRoom = async (room: Room) => {
    if (room.status === "occupied") {
      notify.alert({
        title: "Kamar Sedang Terisi",
        message: `Kamar ${room.room_number} sedang dihuni oleh ${room.current_tenant?.full_name || "penghuni"}. Selesaikan atau putus kontrak sewa terlebih dahulu sebelum menghapus unit kamar.`,
        variant: "warning",
        buttonText: "Saya Mengerti",
      });
      return;
    }

    const ok = await notify.confirmDelete({
      title: `Hapus Kamar ${room.room_number}?`,
      itemName: `Kamar ${room.room_number}`,
      itemType: "Unit Kamar",
      itemDetails: `${room.room_type} • Lantai ${room.floor} • ${formatRupiah(room.base_price)}/bln`,
      message: `Apakah Anda yakin ingin menghapus Unit Kamar ${room.room_number}? Tindakan ini akan menghapus data kamar dari server database Supabase.`,
      warningNote: `Seluruh riwayat inventaris dan fasilitas terkait kamar ${room.room_number} akan dihapus secara permanen.`,
      confirmText: "Hapus Kamar Permanen",
      cancelText: "Batalkan",
    });

    if (ok) {
      KostStorage.deleteRoom(room.id);
      loadData();
      notify.deleted(`Kamar ${room.room_number}`, "Kamar");
    }
  };

  const handleQuickStatusChange = (room: Room, newStatus: RoomStatus) => {
    KostStorage.updateRoom(room.id, { status: newStatus });
    loadData();
    notify.info(
      "Status Kamar Diperbarui",
      `Kamar ${room.room_number} kini berstatus ${newStatus === "available" ? "Siap Huni" : newStatus === "occupied" ? "Terisi" : "Maintenance"}.`
    );
  };

  const handleOpenRoomComplaints = (roomNum?: string) => {
    setSelectedRoomForComplaints(roomNum);
    setIsComplaintsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
              Inventaris & Manajemen Kamar
            </h2>
            <span className="rounded-full bg-[#D9FF43] px-2.5 py-0.5 text-xs font-bold text-[#0A0A0A]">
              {rooms.length} Unit
            </span>
          </div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
            Pantau ketersediaan kamar, check-in sewa, dan keluhan penghuni tercatat otomatis via WhatsApp CS AI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleOpenRoomComplaints(undefined)}
            variant="outline"
            className="gap-2 shadow-spatial font-bold text-xs border-emerald-500/30 text-emerald-800 dark:text-emerald-300 bg-white dark:bg-[#18181B]"
          >
            <Bot className="h-4 w-4 text-emerald-600 dark:text-[#D9FF43]" />
            <span>Tiket Keluhan WA AI ({activeComplaints.length})</span>
          </Button>

          <Button
            onClick={() => {
              setRoomToEdit(null);
              setIsModalOpen(true);
            }}
            variant="lime"
            className="gap-2 font-black text-xs shadow-lime-glow"
          >
            <Plus className="h-4 w-4" />
            <span>+ Tambah Kamar</span>
          </Button>
        </div>
      </div>

      {/* Summary Capsule Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => setSelectedStatus(selectedStatus === "available" ? "all" : "available")}
          className={`flex items-center justify-between rounded-3xl p-4 transition-all duration-200 border ${
            selectedStatus === "available"
              ? "bg-[#D9FF43]/20 border-[#D9FF43] shadow-spatial scale-[1.02]"
              : "bg-white border-white/80 dark:bg-[#18181B] dark:border-white/10 hover:border-neutral-300"
          }`}
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Siap Huni</p>
            <p className="text-2xl font-black text-neutral-900 dark:text-white mt-0.5">{availableCount}</p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D9FF43] text-[#0A0A0A] font-bold shadow-xs">
            {availableCount}
          </span>
        </button>

        <button
          onClick={() => setSelectedStatus(selectedStatus === "occupied" ? "all" : "occupied")}
          className={`flex items-center justify-between rounded-3xl p-4 transition-all duration-200 border ${
            selectedStatus === "occupied"
              ? "bg-[#0A0A0A] text-white border-neutral-900 shadow-spatial scale-[1.02] dark:bg-white dark:text-[#0A0A0A]"
              : "bg-white border-white/80 dark:bg-[#18181B] dark:border-white/10 hover:border-neutral-300"
          }`}
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Terisi (Aktif)</p>
            <p className="text-2xl font-black mt-0.5">{occupiedCount}</p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0A0A0A] text-white font-bold shadow-xs dark:bg-neutral-800 dark:text-white">
            {occupiedCount}
          </span>
        </button>

        <button
          onClick={() => setSelectedStatus(selectedStatus === "maintenance" ? "all" : "maintenance")}
          className={`flex items-center justify-between rounded-3xl p-4 transition-all duration-200 border ${
            selectedStatus === "maintenance"
              ? "bg-amber-500/20 border-amber-500 shadow-spatial scale-[1.02]"
              : "bg-white border-white/80 dark:bg-[#18181B] dark:border-white/10 hover:border-neutral-300"
          }`}
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Perbaikan</p>
            <p className="text-2xl font-black text-amber-800 dark:text-amber-300 mt-0.5">{maintenanceCount}</p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-white font-bold shadow-xs">
            {maintenanceCount}
          </span>
        </button>

        <button
          onClick={() => setSelectedStatus(selectedStatus === "with_complaints" ? "all" : "with_complaints")}
          className={`flex items-center justify-between rounded-3xl p-4 transition-all duration-200 border ${
            selectedStatus === "with_complaints"
              ? "bg-rose-500/20 border-rose-500 shadow-spatial scale-[1.02]"
              : "bg-white border-white/80 dark:bg-[#18181B] dark:border-white/10 hover:border-neutral-300"
          }`}
        >
          <div>
            <div className="flex items-center gap-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Keluhan WA AI
              </p>
              {activeComplaints.length > 0 && (
                <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping" />
              )}
            </div>
            <p className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-0.5">
              {activeComplaints.length} Tiket
            </p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-600 text-white font-bold shadow-xs">
            <MessageSquare className="h-5 w-5" />
          </span>
        </button>
      </div>

      {/* Search & Floor Capsule Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between rounded-3xl bg-white p-3 shadow-spatial border border-white/80 dark:bg-[#18181B] dark:border-white/10">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari nomor kamar, tipe, atau nama penghuni..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-neutral-200/80 bg-neutral-50 py-2.5 pl-10 pr-4 text-xs font-medium focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
          />
        </div>

        {/* Floor Filter Capsule */}
        <div className="flex items-center gap-1.5 rounded-full bg-neutral-100 p-1 dark:bg-neutral-800 shrink-0">
          <button
            onClick={() => setSelectedFloor("all")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
              selectedFloor === "all"
                ? "bg-[#0A0A0A] text-white shadow-xs dark:bg-white dark:text-[#0A0A0A]"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
            }`}
          >
            Semua Lt
          </button>
          {floors.map((fl) => (
            <button
              key={fl}
              onClick={() => setSelectedFloor(fl)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                selectedFloor === fl
                  ? "bg-[#0A0A0A] text-white shadow-xs dark:bg-white dark:text-[#0A0A0A]"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
              }`}
            >
              Lt {fl}
            </button>
          ))}
        </div>
      </div>

      {/* Rooms Bento Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredRooms.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-dashed border-neutral-300 p-12 text-center bg-white/50 dark:bg-neutral-900/50">
            <DoorClosed className="mx-auto h-12 w-12 text-neutral-400" />
            <h3 className="mt-2 text-sm font-bold text-neutral-900 dark:text-white">
              Tidak ada kamar ditemukan
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Sesuaikan kata kunci pencarian atau filter status kamar.
            </p>
          </div>
        ) : (
          filteredRooms.map((room) => {
            const isOccupied = room.status === "occupied";
            const isAvailable = room.status === "available";

            return (
              <div
                key={room.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/80 bg-white p-5 shadow-spatial transition-all duration-300 hover:shadow-spatial-lg hover:border-neutral-300 dark:bg-[#18181B] dark:border-white/10"
              >
                {/* Card Top: Room Number & Status Capsule */}
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
                          Kamar {room.room_number}
                        </span>
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                          Lt {room.floor}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-neutral-500 mt-0.5">{room.room_type}</p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-bold ${
                        isAvailable
                          ? "bg-[#D9FF43]/30 text-[#254600] dark:text-[#D9FF43]"
                          : isOccupied
                          ? "bg-[#0A0A0A] text-white dark:bg-white dark:text-[#0A0A0A]"
                          : "bg-amber-500/20 text-amber-800 dark:text-amber-300"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isAvailable ? "bg-[#254600] dark:bg-[#D9FF43]" : isOccupied ? "bg-white dark:bg-[#0A0A0A]" : "bg-amber-500"
                        }`}
                      />
                      {isAvailable ? "Siap Huni" : isOccupied ? "Terisi" : "Perbaikan"}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="mt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Tarif Sewa</p>
                    <p className="text-lg font-black text-neutral-900 dark:text-white">
                      {formatRupiah(room.base_price)}
                      <span className="text-xs font-normal text-neutral-400"> / bulan</span>
                    </p>
                  </div>

                  {/* Occupant Frosted Capsule Pod */}
                  {isOccupied && room.current_tenant && (
                    <div className="mt-3.5 rounded-2xl glass-panel p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 font-black text-neutral-900 dark:text-white truncate">
                          <UserCheck className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300 shrink-0" />
                          <span className="truncate">{room.current_tenant.full_name}</span>
                        </div>
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 shrink-0">
                          Penghuni
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                        <span>WA: {room.current_tenant.phone_number}</span>
                        {room.current_tenant.id_card_number && (
                          <span className="text-[10px] text-neutral-400">NIK: {room.current_tenant.id_card_number.slice(-4)}****</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Active WhatsApp CS AI Complaint Box */}
                  {(() => {
                    const roomComplaints = complaints.filter(
                      (c) => c.room_id === room.id || c.room_number === room.room_number
                    );
                    const activeRoomComplaints = roomComplaints.filter(
                      (c) => c.status === "pending" || c.status === "in_progress"
                    );
                    const hasUrgent = activeRoomComplaints.some(
                      (c) => c.priority === "urgent" || c.priority === "high"
                    );

                    if (activeRoomComplaints.length === 0) return null;

                    return (
                      <button
                        type="button"
                        onClick={() => handleOpenRoomComplaints(room.room_number)}
                        className={`mt-3 w-full text-left rounded-2xl p-2.5 border transition-all ${
                          hasUrgent
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200 hover:bg-rose-500/20"
                            : "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                            <MessageSquare className="h-3 w-3 shrink-0" />
                            <span>{activeRoomComplaints.length} Tiket WA AI</span>
                          </span>
                          <span className="text-[10px] font-bold text-neutral-500 underline dark:text-neutral-400">
                            Rincian ↗
                          </span>
                        </div>
                        <p className="text-[11px] font-bold line-clamp-1 leading-snug">
                          "{activeRoomComplaints[0].ai_extracted_summary}"
                        </p>
                      </button>
                    );
                  })()}

                  {/* Keterangan Kamar (Room Notes) */}
                  {room.notes && (
                    <div className="mt-3 rounded-2xl bg-neutral-50 p-2.5 text-xs text-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-300 border border-neutral-100 dark:border-white/5 flex items-start gap-2">
                      <FileText className="h-3.5 w-3.5 text-neutral-400 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block">
                          Keterangan Kamar
                        </span>
                        <p className="text-[11px] font-medium leading-snug break-words mt-0.5">
                          {room.notes}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Facilities Pills */}
                  <div className="mt-3.5 flex flex-wrap gap-1.5">
                    {room.facilities?.slice(0, 3).map((f) => (
                      <span
                        key={f}
                        className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                      >
                        {f}
                      </span>
                    ))}
                    {room.facilities && room.facilities.length > 3 && (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-500 dark:bg-neutral-800">
                        +{room.facilities.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-3.5 dark:border-white/10">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setRoomToEdit(room);
                        setIsModalOpen(true);
                      }}
                      title="Edit Kamar"
                      className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteRoom(room)}
                      title="Hapus Kamar"
                      className="rounded-full p-2 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Primary Context Action */}
                  {isAvailable ? (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => onCreateLeaseForRoom && onCreateLeaseForRoom(room.id)}
                      className="h-8 gap-1.5 text-xs font-bold"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>Check-in ↗</span>
                    </Button>
                  ) : isOccupied ? (
                    <Button
                      size="sm"
                      variant="lime"
                      onClick={() => onOpenElectricityForRoom && onOpenElectricityForRoom(room.id)}
                      className="h-8 gap-1.5 text-xs font-bold"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      <span>Token PLN</span>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickStatusChange(room, "available")}
                      className="h-8 text-xs font-bold"
                    >
                      Siap Huni
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Create / Edit Room */}
      <RoomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        roomToEdit={roomToEdit}
        onSuccess={loadData}
      />

      {/* Modal WhatsApp CS AI Room Complaints & Supabase DB Tickets */}
      <RoomComplaintsModal
        isOpen={isComplaintsModalOpen}
        onClose={() => setIsComplaintsModalOpen(false)}
        roomNumber={selectedRoomForComplaints}
        complaints={
          selectedRoomForComplaints
            ? complaints.filter(
                (c) =>
                  c.room_number === selectedRoomForComplaints ||
                  c.room_id === selectedRoomForComplaints
              )
            : complaints
        }
        onRefresh={loadData}
      />
    </div>
  );
}
