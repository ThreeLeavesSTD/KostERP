"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Room, Tenant, TokenPaymentStatus } from "@/types";
import { KostApiClient } from "@/lib/api-client";
import { formatRupiah, formatTokenPLN, cleanTokenPLN } from "@/lib/utils";
import { Zap, Calculator } from "lucide-react";
import { notify } from "@/lib/notify";

interface TokenPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedRoomId?: string;
  onSuccess: (createdTxId?: string) => void;
}

export function TokenPurchaseModal({
  isOpen,
  onClose,
  preselectedRoomId,
  onSuccess,
}: TokenPurchaseModalProps) {
  const [occupiedRooms, setOccupiedRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [tokenCodeRaw, setTokenCodeRaw] = useState("");
  const [nominalAmount, setNominalAmount] = useState(50000);
  const [kwhUnits, setKwhUnits] = useState(33.5);
  const [costPrice, setCostPrice] = useState(50500); // Harga beli/kulakan
  const [sellingPrice, setSellingPrice] = useState(55000); // Harga jual ke penghuni
  const [paymentStatus, setPaymentStatus] = useState<TokenPaymentStatus>("paid_cash");

  useEffect(() => {
    if (isOpen) {
      let isMounted = true;
      KostApiClient.getRooms()
        .then((allRooms) => {
          if (!isMounted) return;
          const rooms = allRooms.filter((r) => r.status === "occupied");
          setOccupiedRooms(rooms);
          if (preselectedRoomId) {
            setSelectedRoomId(preselectedRoomId);
          } else if (rooms.length > 0) {
            setSelectedRoomId(rooms[0].id);
          }
        })
        .catch(() => {});
      setTokenCodeRaw("");

      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, preselectedRoomId]);

  const handleNominalChange = (nom: number) => {
    setNominalAmount(nom);
    // Auto-calculate suggested cost & selling
    if (nom === 20000) {
      setCostPrice(20500);
      setSellingPrice(23000);
      setKwhUnits(13.4);
    } else if (nom === 50000) {
      setCostPrice(50500);
      setSellingPrice(55000);
      setKwhUnits(33.5);
    } else if (nom === 100000) {
      setCostPrice(100500);
      setSellingPrice(105000);
      setKwhUnits(68.2);
    } else if (nom === 200000) {
      setCostPrice(200500);
      setSellingPrice(207000);
      setKwhUnits(136.4);
    }
  };

  const handleTokenCodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = cleanTokenPLN(e.target.value);
    setTokenCodeRaw(raw);
  };

  const margin = Number(sellingPrice) - Number(costPrice);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId) {
      notify.warning("Pilih Kamar", "Silakan pilih kamar penghuni terlebih dahulu.");
      return;
    }
    if (tokenCodeRaw.length < 20) {
      notify.warning(
        "Format Token Tidak Lengkap",
        `Kode token PLN harus berjumlah 20 digit! (Saat ini: ${tokenCodeRaw.length} digit)`
      );
      return;
    }

    const room = occupiedRooms.find((r) => r.id === selectedRoomId);
    if (!room || !room.current_tenant) {
      notify.warning("Kamar Tidak Dihuni", "Kamar yang dipilih tidak memiliki penghuni aktif.");
      return;
    }

    try {
      const createdTx = await KostApiClient.createElectricityTransaction({
        room_id: room.id,
        tenant_id: room.current_tenant.id,
        token_code: tokenCodeRaw,
        nominal_amount: Number(nominalAmount),
        kwh_units: Number(kwhUnits),
        cost_price: Number(costPrice),
        selling_price: Number(sellingPrice),
        payment_status: paymentStatus,
      });

      notify.success(
        "Token PLN Disimpan",
        `Token listrik untuk Kamar ${room.room_number} (${room.current_tenant.full_name}) berhasil dicatat.`
      );
      onSuccess(createdTx.id);
      onClose();
    } catch (err: any) {
      notify.alert({
        title: "Gagal Menyimpan Token",
        message: err.message || "Terjadi kesalahan pada database.",
        variant: "danger",
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Input Pembelian Token Listrik PLN"
      description="Catat 20 digit kode token, margin harga jual, dan opsi dispatch instan ke WhatsApp penghuni."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Select Room / Tenant */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
            Kamar & Penghuni Penerima <span className="text-rose-500">*</span>
          </label>
          <select
            required
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
          >
            {occupiedRooms.map((r) => (
              <option key={r.id} value={r.id}>
                Kamar {r.room_number} - {r.current_tenant?.full_name} ({r.current_tenant?.phone_number})
              </option>
            ))}
          </select>
        </div>

        {/* Nominal Quick Buttons */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
            Pilihan Nominal Token
          </label>
          <div className="mt-1.5 grid grid-cols-4 gap-2">
            {[20000, 50000, 100000, 200000].map((nom) => (
              <button
                type="button"
                key={nom}
                onClick={() => handleNominalChange(nom)}
                className={`rounded-2xl border p-2.5 text-xs font-bold transition-all ${
                  nominalAmount === nom
                    ? "bg-[#0A0A0A] text-white border-neutral-800 shadow-xs dark:bg-white dark:text-[#0A0A0A]"
                    : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300"
                }`}
              >
                {nom / 1000}k
              </button>
            ))}
          </div>
        </div>

        {/* 20 Digit Token Code */}
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              20 Digit Kode Token PLN <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] font-mono font-bold text-neutral-900 dark:text-[#D9FF43]">
              {tokenCodeRaw.length} / 20 Digit
            </span>
          </div>
          <div className="relative mt-1">
            <input
              type="text"
              required
              maxLength={24} // includes dashes
              placeholder="Contoh: 3482-9104-7281-9402-8371"
              value={formatTokenPLN(tokenCodeRaw)}
              onChange={handleTokenCodeInput}
              className="w-full rounded-2xl border border-neutral-300 bg-neutral-50 p-3.5 font-mono text-base font-extrabold tracking-widest text-neutral-900 placeholder:font-normal placeholder:tracking-normal focus:ring-2 focus:ring-[#0A0A0A] focus:bg-white focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
            />
          </div>
        </div>

        {/* Pricing Calculation & Margin */}
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50/80 p-4 dark:bg-neutral-800/40 dark:border-white/10">
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900 dark:text-white">
            <Calculator className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
            <span>Kalkulasi Harga & Margin Laba</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                Harga Beli / Kulakan (Rp)
              </label>
              <input
                type="number"
                value={costPrice}
                onChange={(e) => setCostPrice(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-white p-2.5 text-xs font-bold dark:bg-neutral-900 dark:border-neutral-700 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                Harga Jual ke Penghuni (Rp)
              </label>
              <input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-white p-2.5 text-xs font-bold dark:bg-neutral-900 dark:border-neutral-700 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-neutral-200 pt-2.5 text-xs dark:border-neutral-700">
            <span className="font-semibold text-neutral-600 dark:text-neutral-400">Laba Bersih Kost:</span>
            <span className="font-black text-neutral-900 dark:text-[#D9FF43] text-sm">
              +{formatRupiah(margin)}
            </span>
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
            Metode Pembayaran Token
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "paid_cash", label: "Bayar Tunai" },
              { id: "paid_transfer", label: "Transfer Langsung" },
              { id: "invoiced", label: "Masuk Invoice" },
            ].map((pm) => (
              <button
                type="button"
                key={pm.id}
                onClick={() => setPaymentStatus(pm.id as TokenPaymentStatus)}
                className={`rounded-2xl border p-2.5 text-center text-xs font-bold transition-all ${
                  paymentStatus === pm.id
                    ? "bg-[#0A0A0A] text-white border-neutral-800 dark:bg-white dark:text-[#0A0A0A]"
                    : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
                }`}
              >
                {pm.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4 dark:border-white/10">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant="lime" className="gap-1.5 font-bold">
            <Zap className="h-4 w-4" />
            <span>Simpan Transaksi Token</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
