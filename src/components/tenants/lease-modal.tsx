"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Room, Tenant } from "@/types";
import { KostApiClient } from "@/lib/api-client";
import { formatRupiah } from "@/lib/utils";
import { notify } from "@/lib/notify";

interface LeaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedRoomId?: string;
  preselectedTenantId?: string;
  onSuccess: () => void;
}

export function LeaseModal({
  isOpen,
  onClose,
  preselectedRoomId,
  preselectedTenantId,
  onSuccess,
}: LeaseModalProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);

  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [durationMonths, setDurationMonths] = useState(12);
  const [billingCycleDay, setBillingCycleDay] = useState(1);
  const [rentAmount, setRentAmount] = useState(1500000);
  const [depositAmount, setDepositAmount] = useState(500000);

  useEffect(() => {
    if (isOpen) {
      let isMounted = true;
      Promise.all([KostApiClient.getRooms(), KostApiClient.getTenants()])
        .then(([allRooms, allTenants]) => {
          if (!isMounted) return;
          setRooms(allRooms);
          setTenants(allTenants);

          const availableRooms = allRooms.filter((r) => r.status === "available");
          const defaultRoom = preselectedRoomId
            ? allRooms.find((r) => r.id === preselectedRoomId)
            : availableRooms[0];

          if (defaultRoom) {
            setSelectedRoomId(defaultRoom.id);
            setRentAmount(defaultRoom.base_price);
          }

          if (preselectedTenantId) {
            setSelectedTenantId(preselectedTenantId);
          } else if (allTenants.length > 0) {
            setSelectedTenantId(allTenants[0].id);
          }
        })
        .catch((err) => console.error("Gagal memuat room/tenant:", err));

      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, preselectedRoomId, preselectedTenantId]);

  const handleRoomChange = (roomId: string) => {
    setSelectedRoomId(roomId);
    const found = rooms.find((r) => r.id === roomId);
    if (found) {
      setRentAmount(found.base_price);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId) {
      notify.warning("Pilih Kamar", "Silakan pilih unit kamar yang akan disewa.");
      return;
    }
    if (!selectedTenantId) {
      notify.warning("Pilih Penghuni", "Silakan pilih data penghuni penyewa.");
      return;
    }

    // Calculate End Date
    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + durationMonths);
    const endDateStr = end.toISOString().slice(0, 10);

    try {
      await KostApiClient.createLease({
        room_id: selectedRoomId,
        tenant_id: selectedTenantId,
        start_date: startDate,
        end_date: endDateStr,
        billing_cycle_day: Number(billingCycleDay),
        rent_amount: Number(rentAmount),
        deposit_amount: Number(depositAmount),
        status: "active",
      });

      // Update status kamar menjadi occupied
      await KostApiClient.updateRoom(selectedRoomId, { status: "occupied" });

      notify.success("Kontrak Sewa Aktif", "Kontrak sewa berhasil dibuat.");
      onSuccess();
      onClose();
    } catch (err: any) {
      notify.alert({
        title: "Gagal Membuat Kontrak",
        message: err.message || "Terjadi kesalahan saat menghubungi server.",
        variant: "danger",
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Check-in & Pembuatan Kontrak Sewa"
      description="Mapping Penghuni ke Kamar, atur tanggal siklus tagihan, dan generate invoice pertama otomatis."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Room Selection */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
            Pilih Unit Kamar <span className="text-rose-500">*</span>
          </label>
          <select
            required
            value={selectedRoomId}
            onChange={(e) => handleRoomChange(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
          >
            {rooms
              .filter((r) => r.status === "available" || r.id === preselectedRoomId)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  Kamar {r.room_number} (Lt {r.floor} - {r.room_type}) - {formatRupiah(r.base_price)}/bln
                </option>
              ))}
          </select>
        </div>

        {/* Tenant Selection */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
            Pilih Penghuni (Tenant) <span className="text-rose-500">*</span>
          </label>
          <select
            required
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name} ({t.phone_number})
              </option>
            ))}
          </select>
        </div>

        {/* Lease Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Tanggal Mulai Sewa
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Durasi Sewa
            </label>
            <select
              value={durationMonths}
              onChange={(e) => setDurationMonths(Number(e.target.value))}
              className="mt-1 w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
            >
              <option value={1}>1 Bulan</option>
              <option value={3}>3 Bulan</option>
              <option value={6}>6 Bulan</option>
              <option value={12}>12 Bulan (1 Tahun)</option>
            </select>
          </div>
        </div>

        {/* Billing cycle & Pricing */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Tgl Penagihan
            </label>
            <input
              type="number"
              min={1}
              max={31}
              value={billingCycleDay}
              onChange={(e) => setBillingCycleDay(Number(e.target.value))}
              className="mt-1 w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
            />
            <p className="mt-1 text-[10px] font-medium text-neutral-400">Tiap tgl {billingCycleDay}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Tarif Sewa (Rp)
            </label>
            <input
              type="number"
              step={50000}
              value={rentAmount}
              onChange={(e) => setRentAmount(Number(e.target.value))}
              className="mt-1 w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Deposit Jaminan
            </label>
            <input
              type="number"
              step={50000}
              value={depositAmount}
              onChange={(e) => setDepositAmount(Number(e.target.value))}
              className="mt-1 w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
            />
          </div>
        </div>

        {/* Summary Info Box */}
        <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50 p-4 text-xs dark:bg-neutral-800/60 dark:border-white/10">
          <p className="font-bold text-neutral-900 dark:text-white">Rincian Invoice Pertama:</p>
          <p className="mt-1 text-neutral-600 dark:text-neutral-300">
            Total tagihan awal:{" "}
            <strong className="text-neutral-900 dark:text-white font-extrabold">
              {formatRupiah(Number(rentAmount) + Number(depositAmount))}
            </strong>{" "}
            (Sewa Rp {Number(rentAmount).toLocaleString("id-ID")} + Deposit Rp{" "}
            {Number(depositAmount).toLocaleString("id-ID")})
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4 dark:border-white/10">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant="default">
            Simpan & Terbitkan Kontrak
          </Button>
        </div>
      </form>
    </Modal>
  );
}
