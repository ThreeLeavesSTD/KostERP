"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Lead, LeadChannel, LeadStatus, UserProfile } from "@/types";
import { KostApiClient } from "@/lib/api-client";
import { normalizePhoneNumber } from "@/lib/utils";
import { notify } from "@/lib/notify";
import { Flame, User, Phone, Tag, Calendar, DollarSign, MessageSquare, Shield } from "lucide-react";

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadToEdit?: Lead | null;
  onSuccess: () => void;
  existingRoomTypes?: string[];
}

const CHANNELS: { value: LeadChannel; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "landing_page", label: "Landing Page" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "facebook", label: "Facebook" },
  { value: "referral", label: "Rekomendasi / Teman" },
  { value: "marketplace", label: "Marketplace / Mamikos / OLX" },
  { value: "walk_in", label: "Datang Langsung (Walk-in)" },
  { value: "other", label: "Lainnya" },
];

const STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "Baru (New)" },
  { value: "contacted", label: "Dihubungi (Contacted)" },
  { value: "follow_up", label: "Perlu Follow-up" },
  { value: "survey_scheduled", label: "Survey Terjadwal" },
  { value: "survey_done", label: "Survey Selesai" },
  { value: "negotiation", label: "Negosiasi" },
  { value: "won", label: "Deal / Won" },
  { value: "lost", label: "Gagal / Lost" },
];

export function LeadModal({
  isOpen,
  onClose,
  leadToEdit,
  onSuccess,
  existingRoomTypes = ["Standard", "Deluxe", "VIP", "Executive"],
}: LeadModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<LeadChannel>("whatsapp");
  const [landingPageCampaign, setLandingPageCampaign] = useState("");
  const [preferredRoomType, setPreferredRoomType] = useState("");
  const [budgetMin, setBudgetMin] = useState<string>("");
  const [budgetMax, setBudgetMax] = useState<string>("");
  const [preferredMoveInDate, setPreferredMoveInDate] = useState("");
  const [isWarm, setIsWarm] = useState(false);
  const [status, setStatus] = useState<LeadStatus>("new");
  const [assignedStaffId, setAssignedStaffId] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [notes, setNotes] = useState("");

  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      KostApiClient.getStaff()
        .then((staff) => setStaffList(staff))
        .catch((err) => console.error("Gagal memuat staff:", err));
    }
  }, [isOpen]);

  useEffect(() => {
    if (leadToEdit) {
      setName(leadToEdit.name || "");
      setPhone(leadToEdit.phone || "");
      setChannel(leadToEdit.channel || "whatsapp");
      setLandingPageCampaign(leadToEdit.landing_page_campaign || "");
      setPreferredRoomType(leadToEdit.preferred_room_type || "");
      setBudgetMin(leadToEdit.budget_min !== undefined && leadToEdit.budget_min !== null ? String(leadToEdit.budget_min) : "");
      setBudgetMax(leadToEdit.budget_max !== undefined && leadToEdit.budget_max !== null ? String(leadToEdit.budget_max) : "");
      setPreferredMoveInDate(leadToEdit.preferred_move_in_date || "");
      setIsWarm(Boolean(leadToEdit.is_warm));
      setStatus(leadToEdit.status || "new");
      setAssignedStaffId(leadToEdit.assigned_staff_id || "");
      if (leadToEdit.follow_up_at) {
        try {
          const d = new Date(leadToEdit.follow_up_at);
          // format YYYY-MM-DDTHH:mm
          const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          setFollowUpAt(localIso);
        } catch {
          setFollowUpAt("");
        }
      } else {
        setFollowUpAt("");
      }
      setNotes(leadToEdit.notes || "");
    } else {
      setName("");
      setPhone("");
      setChannel("whatsapp");
      setLandingPageCampaign("");
      setPreferredRoomType("");
      setBudgetMin("");
      setBudgetMax("");
      setPreferredMoveInDate("");
      setIsWarm(false);
      setStatus("new");
      setAssignedStaffId("");
      setFollowUpAt("");
      setNotes("");
    }
  }, [leadToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      notify.warning("Nama Wajib Diisi", "Silakan masukkan nama calon penghuni.");
      return;
    }

    if (!phone.trim()) {
      notify.warning("Nomor WhatsApp Wajib Diisi", "Silakan masukkan nomor telepon / WhatsApp lead.");
      return;
    }

    const normalizedPhone = normalizePhoneNumber(phone.trim());

    setIsSubmitting(true);
    try {
      const payload: Partial<Lead> = {
        name: name.trim(),
        phone: normalizedPhone,
        channel,
        landing_page_campaign: landingPageCampaign.trim() || undefined,
        preferred_room_type: preferredRoomType.trim() || undefined,
        budget_min: budgetMin !== "" ? Number(budgetMin) : undefined,
        budget_max: budgetMax !== "" ? Number(budgetMax) : undefined,
        preferred_move_in_date: preferredMoveInDate || undefined,
        is_warm: isWarm,
        status,
        assigned_staff_id: assignedStaffId || undefined,
        follow_up_at: followUpAt ? new Date(followUpAt).toISOString() : undefined,
        notes: notes.trim() || undefined,
      };

      if (leadToEdit) {
        await KostApiClient.updateLead(leadToEdit.id, payload);
        notify.success("Lead Diperbarui", `Data ${name.trim()} berhasil diperbarui.`);
      } else {
        await KostApiClient.createLead(payload);
        notify.success("Lead Berhasil Disimpan", `Data calon penghuni ${name.trim()} berhasil disimpan (dedup aktif).`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Gagal simpan lead:", err);
      notify.alert({
        title: "Gagal Menyimpan Lead",
        message: err.message || "Terjadi kesalahan saat menyimpan data lead.",
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
      title={leadToEdit ? "Edit Data Lead (Calon Penghuni)" : "Tambah Calon Penghuni (Lead)"}
      description="Kelola informasi prospek penyewa kos, preferensi kamar, serta status pipeline follow-up."
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Nama & Telepon (Wajib) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                required
                placeholder="cth: Sarah Amanda"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 py-2 text-xs font-semibold focus:border-neutral-900 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Nomor WhatsApp / HP (E.164) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="tel"
                required
                placeholder="cth: 08123456789 atau +62812..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 py-2 text-xs font-semibold focus:border-neutral-900 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Channel & Campaign */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Channel Sumber Lead
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as LeadChannel)}
              className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold focus:border-neutral-900 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            >
              {CHANNELS.map((ch) => (
                <option key={ch.value} value={ch.value}>
                  {ch.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Campaign / Tag Promosi
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="cth: promo-agustus / ig-ads"
                value={landingPageCampaign}
                onChange={(e) => setLandingPageCampaign(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 py-2 text-xs font-semibold focus:border-neutral-900 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Preferensi Kamar & Tanggal Masuk */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Tipe Kamar Diminati
            </label>
            <input
              type="text"
              list="room-types-list"
              placeholder="cth: Deluxe / Standard AC"
              value={preferredRoomType}
              onChange={(e) => setPreferredRoomType(e.target.value)}
              className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold focus:border-neutral-900 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
            <datalist id="room-types-list">
              {existingRoomTypes.map((rt) => (
                <option key={rt} value={rt} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Rencana Tanggal Masuk
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="date"
                value={preferredMoveInDate}
                onChange={(e) => setPreferredMoveInDate(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 py-2 text-xs font-semibold focus:border-neutral-900 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Budget Min & Max */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Budget Minimal (Rp)
            </label>
            <input
              type="number"
              min="0"
              placeholder="cth: 1500000"
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
              className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold focus:border-neutral-900 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Budget Maksimal (Rp)
            </label>
            <input
              type="number"
              min="0"
              placeholder="cth: 2500000"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold focus:border-neutral-900 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </div>
        </div>

        {/* Status Pipeline & Warm Lead Toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Status Pipeline
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as LeadStatus)}
              className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold focus:border-neutral-900 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            >
              {STATUSES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Prospek Hangat (Warm Lead)
            </label>
            <button
              type="button"
              onClick={() => setIsWarm(!isWarm)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl border text-xs font-bold transition-all ${
                isWarm
                  ? "bg-amber-500/10 border-amber-400 text-amber-600 dark:text-amber-400"
                  : "bg-neutral-50 border-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Flame className={`h-4 w-4 ${isWarm ? "text-amber-500 fill-amber-500" : "text-neutral-400"}`} />
                <span>{isWarm ? "🔥 Warm Lead (Prioritas Tinggi)" : "Lead Reguler (Standar)"}</span>
              </span>
              <span className={`inline-block h-4 w-4 rounded-full border ${isWarm ? "bg-amber-500 border-amber-600" : "bg-neutral-300 border-neutral-400"}`} />
            </button>
          </div>
        </div>

        {/* Staff Assignment & Follow-Up Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Tugaskan ke Staff
            </label>
            <select
              value={assignedStaffId}
              onChange={(e) => setAssignedStaffId(e.target.value)}
              className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold focus:border-neutral-900 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            >
              <option value="">-- Belum Ditugaskan --</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.role_name || s.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Jadwal Follow-Up Berikutnya
            </label>
            <input
              type="datetime-local"
              value={followUpAt}
              onChange={(e) => setFollowUpAt(e.target.value)}
              className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold focus:border-neutral-900 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </div>
        </div>

        {/* Catatan Prospek */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
            Catatan Tambahan / Kebutuhan Khusus
          </label>
          <textarea
            rows={3}
            placeholder="cth: Butuh kamar ber-AC yang ada parkir mobil, mau masuk awal bulan depan..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-xs font-semibold focus:border-neutral-900 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
        </div>

        {/* Tombol Aksi */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-white/10">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full px-4 text-xs font-bold"
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full px-5 text-xs font-bold bg-[#0A0A0A] text-white hover:bg-neutral-800 dark:bg-white dark:text-[#0A0A0A]"
          >
            {isSubmitting ? "Menyimpan..." : leadToEdit ? "Simpan Perubahan" : "Tambah Lead"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default LeadModal;
