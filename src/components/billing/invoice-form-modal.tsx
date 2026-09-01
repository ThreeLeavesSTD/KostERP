"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Receipt, Calendar, DoorClosed, User, DollarSign, FileText } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Invoice, Room, Tenant, InvoiceItem } from "@/types";
import { KostStorage } from "@/lib/storage";
import { formatRupiah } from "@/lib/utils";
import { notify } from "@/lib/notify";

interface InvoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceToEdit?: Invoice | null;
  onSuccess: () => void;
}

export function InvoiceFormModal({
  isOpen,
  onClose,
  invoiceToEdit,
  onSuccess,
}: InvoiceFormModalProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);

  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [billingPeriod, setBillingPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  
  // Dynamic Itemized Line Items
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: "item-1", description: "Biaya Sewa Pokok Kamar", amount: 1800000 },
  ]);

  useEffect(() => {
    const loadedRooms = KostStorage.getRooms();
    const loadedTenants = KostStorage.getTenants();
    setRooms(loadedRooms);
    setTenants(loadedTenants);

    if (invoiceToEdit) {
      setBillingPeriod(invoiceToEdit.billing_period || new Date().toISOString().slice(0, 7));
      setDueDate(invoiceToEdit.due_date || "");
      setNotes(invoiceToEdit.notes || "");
      
      const foundRoom = loadedRooms.find((r) => r.room_number === invoiceToEdit.room_number);
      if (foundRoom) {
        setSelectedRoomId(foundRoom.id);
        setSelectedTenantId(foundRoom.tenant_id || foundRoom.current_tenant?.id || "");
      }

      if (invoiceToEdit.items && invoiceToEdit.items.length > 0) {
        setItems(invoiceToEdit.items);
      } else {
        const defaultItems: InvoiceItem[] = [
          { id: "item-rent", description: "Biaya Sewa Pokok Kamar", amount: invoiceToEdit.subtotal_rent || 0 },
        ];
        if (invoiceToEdit.additional_fees > 0) {
          defaultItems.push({
            id: "item-fees",
            description: "Biaya Tambahan / Token PLN",
            amount: invoiceToEdit.additional_fees,
          });
        }
        setItems(defaultItems);
      }
    } else {
      const defaultDue = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      setDueDate(defaultDue);
      setBillingPeriod(new Date().toISOString().slice(0, 7));
      setSelectedRoomId("");
      setSelectedTenantId("");
      setNotes("");
      setItems([{ id: "item-1", description: "Biaya Sewa Pokok Kamar", amount: 1800000 }]);
    }
  }, [invoiceToEdit, isOpen]);

  const handleRoomChange = (roomId: string) => {
    setSelectedRoomId(roomId);
    const room = rooms.find((r) => r.id === roomId);
    if (room) {
      if (room.tenant_id || room.current_tenant?.id) {
        setSelectedTenantId(room.tenant_id || room.current_tenant?.id || "");
      }
      setItems([
        { id: "item-1", description: `Sewa Pokok Kamar ${room.room_number}`, amount: room.base_price || 1800000 },
      ]);
      setNotes(`Tagihan sewa kamar ${room.room_number} periode ${billingPeriod}`);
    }
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      { id: `item-${Date.now().toString().slice(-4)}`, description: "", amount: 0 },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((item) => item.id !== id));
  };

  const handleItemChange = (id: string, field: "description" | "amount", value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            [field]: field === "amount" ? Number(value) || 0 : value,
          };
        }
        return item;
      })
    );
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const subtotalRent = items[0]?.amount || 0;
  const additionalFees = items.slice(1).reduce((sum, item) => sum + (item.amount || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
    const selectedTenant = tenants.find((t) => t.id === selectedTenantId);

    if (!selectedRoom && !invoiceToEdit) {
      notify.warning("Pilih Kamar", "Silakan pilih unit kamar yang akan ditagihkan!");
      return;
    }

    const roomNumber = selectedRoom ? selectedRoom.room_number : invoiceToEdit?.room_number || "-";
    const tenantName = selectedTenant
      ? selectedTenant.full_name
      : selectedRoom?.current_tenant?.full_name || invoiceToEdit?.tenant_name || "Penghuni";
    const tenantPhone = selectedTenant
      ? selectedTenant.phone_number
      : selectedRoom?.current_tenant?.phone_number || invoiceToEdit?.tenant_phone || "";

    if (invoiceToEdit) {
      KostStorage.updateInvoice(invoiceToEdit.id, {
        billing_period: billingPeriod,
        due_date: dueDate,
        items,
        subtotal_rent: subtotalRent,
        additional_fees: additionalFees,
        total_amount: totalAmount,
        notes: notes.trim() || `Tagihan Sewa Kamar ${roomNumber} Periode ${billingPeriod}`,
        room_number: roomNumber,
        tenant_name: tenantName,
        tenant_phone: tenantPhone,
      });
      notify.success("Faktur Diperbarui", `Faktur tagihan Kamar ${roomNumber} berhasil diperbarui.`);
    } else {
      const invNumber = `INV/${billingPeriod.replace("-", "")}/${Math.floor(100 + Math.random() * 900)}`;
      KostStorage.addInvoice({
        property_id: selectedRoom?.property_id || "a0000000-0000-0000-0000-000000000001",
        lease_id: selectedRoom?.current_tenant?.lease_id || `lease-${selectedRoom?.id}`,
        room_id: selectedRoom?.id,
        invoice_number: invNumber,
        billing_period: billingPeriod,
        items,
        subtotal_rent: subtotalRent,
        additional_fees: additionalFees,
        notes: notes.trim() || `Tagihan Sewa Kamar ${roomNumber} Periode ${billingPeriod}`,
        total_amount: totalAmount,
        due_date: dueDate,
        status: "unpaid",
        room_number: roomNumber,
        tenant_name: tenantName,
        tenant_phone: tenantPhone,
      });
      notify.success("Faktur Diterbitkan", `Faktur tagihan ${invNumber} untuk Kamar ${roomNumber} berhasil dibuat.`);
    }

    onSuccess();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={invoiceToEdit ? `Edit Faktur: ${invoiceToEdit.invoice_number}` : "Buat Faktur / Invoice Tagihan"}
      description="Penerbitan tagihan sewa dengan rincian biaya pokok, token listrik, deposit, atau biaya kustom."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Room & Tenant Selection */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Pilih Kamar <span className="text-rose-500">*</span>
            </label>
            <div className="relative mt-1">
              <DoorClosed className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <select
                required
                value={selectedRoomId}
                onChange={(e) => handleRoomChange(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 py-2.5 pl-10 pr-4 text-xs font-bold text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              >
                <option value="">-- Pilih Kamar --</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Kamar {r.room_number} ({r.room_type}) {r.current_tenant ? `· ${r.current_tenant.full_name}` : "· Siap Huni"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Penghuni Tertagih (Primary Key)
            </label>
            <div className="relative mt-1">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 py-2.5 pl-10 pr-4 text-xs font-bold text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              >
                <option value="">-- Otomatis Terhubung / Pilih Penghuni --</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name} · {t.phone_number}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Period & Due Date */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Periode Tagihan (Bulan) <span className="text-rose-500">*</span>
            </label>
            <input
              type="month"
              required
              value={billingPeriod}
              onChange={(e) => setBillingPeriod(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-bold text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Tanggal Jatuh Tempo <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-bold text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
            />
          </div>
        </div>

        {/* Itemized Line Items Breakdown */}
        <div className="rounded-3xl border border-neutral-200 bg-neutral-50/60 p-4 dark:border-neutral-700 dark:bg-neutral-900/60">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Receipt className="h-4 w-4 text-neutral-500" />
              Rincian Pos Tagihan (Itemized Breakdown)
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              className="h-7 text-xs font-bold gap-1 rounded-full"
            >
              <Plus className="h-3 w-3" />
              <span>Tambah Item</span>
            </Button>
          </div>

          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={item.id} className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  placeholder="Deskripsi item (contoh: Sewa Pokok, Token PLN, Parkir)"
                  value={item.description}
                  onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                  className="flex-1 rounded-2xl border border-neutral-200 bg-white px-3.5 py-2 text-xs font-medium focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                />
                <div className="relative w-36 sm:w-44">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="0"
                    required
                    value={item.amount || ""}
                    onChange={(e) => handleItemChange(item.id, "amount", e.target.value)}
                    className="w-full rounded-2xl border border-neutral-200 bg-white py-2 pl-9 pr-3 text-xs font-black text-neutral-900 focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white text-right"
                  />
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="rounded-full p-2 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-3 dark:border-white/10">
            <span className="text-xs font-extrabold uppercase text-neutral-500">Total Keseluruhan</span>
            <span className="text-lg font-black text-neutral-900 dark:text-[#D9FF43]">
              {formatRupiah(totalAmount)}
            </span>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
            Catatan Faktur (Opsional)
          </label>
          <textarea
            rows={2}
            placeholder="Contoh: Sudah termasuk iuran kebersihan RT dan WiFi"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-xs font-medium focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4 dark:border-white/10">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs font-bold">
            Batal
          </Button>
          <Button type="submit" variant="lime" size="sm" className="font-black text-xs shadow-lime-glow">
            {invoiceToEdit ? "Simpan Perubahan Faktur" : "Terbitkan Invoice ↗"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
