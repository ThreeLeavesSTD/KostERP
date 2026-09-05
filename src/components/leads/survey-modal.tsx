"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Lead, SurveySchedule, SurveyStatus, Room, UserProfile } from "@/types";
import { KostApiClient } from "@/lib/api-client";
import { notify } from "@/lib/notify";
import { Calendar, User, DoorClosed, Clock, FileText, CheckCircle2 } from "lucide-react";

interface SurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  surveyToEdit?: SurveySchedule | null;
  preselectedLeadId?: string;
  leads: Lead[];
  onSuccess: () => void;
}

const SURVEY_STATUSES: { value: SurveyStatus; label: string }[] = [
  { value: "scheduled", label: "Dijadwalkan (Scheduled)" },
  { value: "confirmed", label: "Terkonfirmasi (Confirmed)" },
  { value: "completed", label: "Selesai (Completed)" },
  { value: "no_show", label: "No-show (Tidak Hadir)" },
  { value: "cancelled", label: "Dibatalkan (Cancelled)" },
];

export function SurveyModal({
  isOpen,
  onClose,
  surveyToEdit,
  preselectedLeadId,
  leads,
  onSuccess,
}: SurveyModalProps) {
  const [leadId, setLeadId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [assignedStaffId, setAssignedStaffId] = useState("");
  const [status, setStatus] = useState<SurveyStatus>("scheduled");
  const [resultNotes, setResultNotes] = useState("");

  const [rooms, setRooms] = useState<Room[]>([]);
  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      Promise.all([KostApiClient.getRooms(), KostApiClient.getStaff()])
        .then(([r, s]) => {
          setRooms(r);
          setStaffList(s);
        })
        .catch((err) => console.error("Gagal memuat kamar/staff untuk survey:", err));
    }
  }, [isOpen]);

  useEffect(() => {
    if (surveyToEdit) {
      setLeadId(surveyToEdit.lead_id || "");
      setRoomId(surveyToEdit.room_id || "");
      if (surveyToEdit.scheduled_at) {
        try {
          const d = new Date(surveyToEdit.scheduled_at);
          const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          setScheduledAt(localIso);
        } catch {
          setScheduledAt("");
        }
      } else {
        setScheduledAt("");
      }
      setAssignedStaffId(surveyToEdit.assigned_staff_id || "");
      setStatus(surveyToEdit.status || "scheduled");
      setResultNotes(surveyToEdit.result_notes || "");
    } else {
      setLeadId(preselectedLeadId || (leads[0]?.id || ""));
      setRoomId("");
      // Default: besok jam 10:00
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      const tomorrowLocal = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setScheduledAt(tomorrowLocal);
      setAssignedStaffId("");
      setStatus("scheduled");
      setResultNotes("");
    }
  }, [surveyToEdit, preselectedLeadId, isOpen, leads]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!leadId) {
      notify.warning("Calon Penghuni Wajib Dipilih", "Silakan pilih lead / calon penghuni yang akan survey.");
      return;
    }

    if (!scheduledAt) {
      notify.warning("Waktu Survey Wajib Diisi", "Silakan tentukan jadwal tanggal dan jam survey.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<SurveySchedule> = {
        lead_id: leadId,
        room_id: roomId || undefined,
        scheduled_at: new Date(scheduledAt).toISOString(),
        assigned_staff_id: assignedStaffId || undefined,
        status,
        result_notes: resultNotes.trim() || undefined,
      };

      if (surveyToEdit) {
        await KostApiClient.updateSurvey(surveyToEdit.id, payload);
        notify.success("Jadwal Survey Diperbarui", "Perubahan jadwal kunjungan kamar berhasil disimpan.");
      } else {
        await KostApiClient.createSurvey(payload);
        notify.success("Jadwal Survey Dibuat", "Jadwal kunjungan baru telah dicatat dan status lead disinkronkan.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Gagal simpan survey:", err);
      notify.alert({
        title: "Gagal Menyimpan Jadwal Survey",
        message: err.message || "Terjadi kesalahan saat memproses survey.",
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
      title={surveyToEdit ? "Edit Jadwal Survey Kamar" : "Jadwalkan Survey Kamar"}
      description="Atur tanggal dan waktu kunjungan calon penghuni untuk melihat kamar kos secara langsung."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Pilih Calon Penghuni (Lead) */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
            Calon Penghuni (Lead) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <select
              required
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 py-2 text-xs font-semibold focus:border-neutral-900 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            >
              <option value="">-- Pilih Calon Penghuni --</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.phone}){l.preferred_room_type ? ` • Minat: ${l.preferred_room_type}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Kamar Spesifik (Opsional) */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
            Kamar yang Dituju (Opsional)
          </label>
          <div className="relative">
            <DoorClosed className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 py-2 text-xs font-semibold focus:border-neutral-900 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            >
              <option value="">-- Bebas / Belum Menentukan Kamar Spesifik --</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Kamar {r.room_number} ({r.room_type} - Lt {r.floor} • Status: {r.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Waktu Survey & Staff yang Menemani */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Waktu Kunjungan (Jadwal) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 py-2 text-xs font-semibold focus:border-neutral-900 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Staff Pendamping
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
        </div>

        {/* Status Survey */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
            Status Survey
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as SurveyStatus)}
            className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold focus:border-neutral-900 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          >
            {SURVEY_STATUSES.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-neutral-500 mt-1">
            Status survey otomatis menyelaraskan status pipeline calon penghuni (terjadwal, survey selesai, atau follow-up).
          </p>
        </div>

        {/* Catatan / Hasil Survey */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
            Catatan / Feedback Hasil Survey
          </label>
          <textarea
            rows={3}
            placeholder="cth: Calon penghuni suka ventilasi kamar, meminta opsi sewa 6 bulan..."
            value={resultNotes}
            onChange={(e) => setResultNotes(e.target.value)}
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
            {isSubmitting ? "Menyimpan..." : surveyToEdit ? "Simpan Perubahan" : "Jadwalkan Survey"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default SurveyModal;
