"use client";

import React, { useState } from "react";
import {
  MessageSquare,
  Sparkles,
  Bot,
  User,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Send,
  Trash2,
  Check,
  Shield,
  ArrowRight,
  Database,
  Tag,
  UserCheck,
  ExternalLink,
} from "lucide-react";
import { RoomComplaint, ComplaintStatus, ComplaintPriority, ComplaintCategory } from "@/types";
import { KostStorage } from "@/lib/storage";
import { formatDateIndo } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/lib/notify";

interface RoomComplaintsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomNumber?: string;
  complaints: RoomComplaint[];
  onRefresh: () => void;
}

export function RoomComplaintsModal({
  isOpen,
  onClose,
  roomNumber,
  complaints,
  onRefresh,
}: RoomComplaintsModalProps) {
  const [selectedComplaint, setSelectedComplaint] = useState<RoomComplaint | null>(
    complaints[0] || null
  );
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [assignedStaff, setAssignedStaff] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);

  // Simulation form
  const [simTenantName, setSimTenantName] = useState("Siti Nurhaliza");
  const [simTenantPhone, setSimTenantPhone] = useState("+6281298765432");
  const [simRoomNumber, setSimRoomNumber] = useState(roomNumber || "101");
  const [simMessage, setSimMessage] = useState(
    "Min CS AI, kran kamar mandi wastafel saya longgar dan airnya keluar kecil sekali, tolong dibantu ya."
  );

  const activeComplaint =
    selectedComplaint ||
    (complaints.length > 0 ? complaints[0] : null);

  const handleUpdateStatus = (id: string, newStatus: ComplaintStatus) => {
    KostStorage.updateComplaint(id, {
      status: newStatus,
      resolution_notes: resolutionNotes || activeComplaint?.resolution_notes,
      assigned_staff_name: assignedStaff || activeComplaint?.assigned_staff_name,
    });
    onRefresh();
  };

  const handleSaveNotes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeComplaint) return;

    KostStorage.updateComplaint(activeComplaint.id, {
      resolution_notes: resolutionNotes,
      assigned_staff_name: assignedStaff,
    });
    notify.success("Penanganan Disimpan", "Catatan penanganan komplain berhasil disimpan ke database.");
    onRefresh();
  };

  const handleReplyWhatsApp = (c: RoomComplaint) => {
    const replyText = `Halo Kak *${c.tenant_name}* (Kamar ${c.room_number}),

Terkait laporan Anda via CS AI (*"${c.ai_extracted_summary}"*):
Saat ini status tiket Anda adalah: *${
      c.status === "in_progress"
        ? "SEDANG DITANGANI 🔧"
        : c.status === "resolved"
        ? "SUDAH SELESAI ✅"
        : "MENUNGGU TINDAKAN ⏳"
    }*

${c.resolution_notes ? `Catatan Pengelola: "${c.resolution_notes}"\n\n` : ""}Jika ada pertanyaan lebih lanjut, silakan hubungi kami kembali. Terima kasih! 🙏`;

    const cleanPhone = c.tenant_phone.replace(/\D/g, "");
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(replyText)}`;
    window.open(url, "_blank");
  };

  const handleRunSimulation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simMessage.trim()) return;

    const newComp = KostStorage.simulateWhatsAppCSIncoming({
      room_number: simRoomNumber,
      tenant_name: simTenantName,
      tenant_phone: simTenantPhone,
      message: simMessage,
    });

    setIsSimulating(false);
    setSelectedComplaint(newComp);
    onRefresh();
    notify.success(
      "Tiket CS AI Dibuat",
      `Laporan dari ${simTenantName} (Kamar ${simRoomNumber}) berhasil dianalisis CS AI dan tersimpan ke database.`
    );
  };

  const getCategoryBadge = (cat: ComplaintCategory) => {
    switch (cat) {
      case "ac_facility":
        return <Badge variant="info">❄️ Fasilitas AC</Badge>;
      case "plumbing":
        return <Badge variant="destructive">🚰 Pipa & Kran Air</Badge>;
      case "electricity":
        return <Badge variant="warning">⚡ Listrik & Lampu</Badge>;
      case "cleanliness":
        return <Badge variant="secondary">🧹 Kebersihan</Badge>;
      case "security":
        return <Badge variant="destructive">🛡️ Keamanan</Badge>;
      default:
        return <Badge variant="secondary">📌 Umum</Badge>;
    }
  };

  const getPriorityBadge = (pri: ComplaintPriority) => {
    switch (pri) {
      case "urgent":
        return <Badge variant="destructive">🚨 Darurat / Urgent</Badge>;
      case "high":
        return <Badge variant="warning">⚠️ Prioritas Tinggi</Badge>;
      case "medium":
        return <Badge variant="info">🟡 Prioritas Sedang</Badge>;
      case "low":
        return <Badge variant="secondary">🟢 Prioritas Rendah</Badge>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        roomNumber
          ? `Keluhan & Catatan Penghuni Kamar ${roomNumber} (WhatsApp CS AI)`
          : "Pusat Keluhan Penghuni & Tiket WhatsApp CS AI"
      }
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Supabase DB & CS AI Architecture Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl bg-neutral-900 p-4 text-white dark:bg-neutral-950 border border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D9FF43] text-[#0A0A0A] shadow-lime-glow">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white">
                  WhatsApp CS AI Assistant · Supabase Integration
                </span>
                <span className="flex h-2 w-2 rounded-full bg-[#D9FF43] animate-pulse" />
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Pesan WhatsApp penghuni dianalisa otomatis oleh CS AI dan tercatat pada database Supabase.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="lime"
            onClick={() => setIsSimulating(!isSimulating)}
            className="h-8 gap-1 text-[11px] font-black shadow-lime-glow shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{isSimulating ? "Tutup Simulator" : "Simulasi Chat WA Penghuni ⚡"}</span>
          </Button>
        </div>

        {/* Simulator Box (Collapsible) */}
        {isSimulating && (
          <form
            onSubmit={handleRunSimulation}
            className="rounded-3xl bg-neutral-50 p-5 border border-neutral-200 dark:bg-neutral-800/60 dark:border-neutral-700 space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-700">
              <h4 className="text-xs font-black text-neutral-900 dark:text-white flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-[#D9FF43]" />
                <span>Simulasi Chat Masuk dari WhatsApp Penghuni ke CS AI</span>
              </h4>
              <span className="text-[10px] text-neutral-400 font-mono">Webhook: /api/webhooks/whatsapp</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-bold text-neutral-500 mb-1">Nama Penghuni</label>
                <input
                  type="text"
                  value={simTenantName}
                  onChange={(e) => setSimTenantName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-neutral-200 p-2 text-xs font-semibold dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-bold text-neutral-500 mb-1">No. WhatsApp</label>
                <input
                  type="tel"
                  value={simTenantPhone}
                  onChange={(e) => setSimTenantPhone(e.target.value)}
                  required
                  className="w-full rounded-xl border border-neutral-200 p-2 text-xs font-semibold dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-bold text-neutral-500 mb-1">Nomor Kamar</label>
                <input
                  type="text"
                  value={simRoomNumber}
                  onChange={(e) => setSimRoomNumber(e.target.value)}
                  required
                  className="w-full rounded-xl border border-neutral-200 p-2 text-xs font-semibold dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-bold text-neutral-500 mb-1">Pesan Chat WhatsApp Penghuni</label>
              <textarea
                rows={2}
                value={simMessage}
                onChange={(e) => setSimMessage(e.target.value)}
                required
                className="w-full rounded-xl border border-neutral-200 p-2 text-xs font-medium dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" size="sm" variant="ghost" onClick={() => setIsSimulating(false)}>
                Batal
              </Button>
              <Button type="submit" size="sm" variant="lime" className="gap-1 font-bold">
                <Send className="h-3.5 w-3.5" />
                <span>Kirim & Eksekusi Analisa CS AI ↗</span>
              </Button>
            </div>
          </form>
        )}

        {/* Complaints Layout: Left Ticket List & Right Detail Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Complaints Feed List */}
          <div className="lg:col-span-5 space-y-2 max-h-[500px] overflow-y-auto pr-1">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-neutral-400 mb-2">
              Daftar Tiket Keluhan ({complaints.length})
            </h4>

            {complaints.length === 0 ? (
              <div className="rounded-2xl bg-neutral-50 p-6 text-center text-xs text-neutral-500 dark:bg-neutral-800/40">
                Belum ada keluhan penghuni tercatat untuk kamar ini.
              </div>
            ) : (
              complaints.map((c) => {
                const isSelected = activeComplaint?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedComplaint(c);
                      setResolutionNotes(c.resolution_notes || "");
                      setAssignedStaff(c.assigned_staff_name || "");
                    }}
                    className={`w-full text-left rounded-2xl p-3.5 border transition-all ${
                      isSelected
                        ? "bg-[#0A0A0A] text-white border-neutral-900 shadow-spatial dark:bg-white dark:text-[#0A0A0A]"
                        : "bg-white text-neutral-900 hover:bg-neutral-50 border-neutral-200/80 dark:bg-neutral-800/80 dark:text-white dark:border-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-extrabold text-xs">Kamar {c.room_number}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          c.status === "pending"
                            ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                            : c.status === "in_progress"
                            ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                            : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {c.status === "pending"
                          ? "Menunggu"
                          : c.status === "in_progress"
                          ? "Diproses"
                          : "Selesai"}
                      </span>
                    </div>

                    <p className={`text-xs font-semibold line-clamp-2 ${isSelected ? "text-neutral-200 dark:text-neutral-800" : "text-neutral-700 dark:text-neutral-300"}`}>
                      {c.ai_extracted_summary}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-400">
                      <span>{c.tenant_name.split(" ")[0]}</span>
                      <span>{new Date(c.created_at).toLocaleDateString("id-ID")}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right Column: Selected Complaint Details & Actions */}
          <div className="lg:col-span-7 rounded-3xl bg-neutral-50 p-5 border border-neutral-200/80 dark:bg-neutral-800/60 dark:border-neutral-700 flex flex-col justify-between">
            {activeComplaint ? (
              <div className="space-y-4">
                {/* Header Ticket Info */}
                <div className="flex items-start justify-between pb-3 border-b border-neutral-200 dark:border-neutral-700">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-neutral-900 dark:text-white">
                        Tiket #{activeComplaint.id.toUpperCase()} · Kamar {activeComplaint.room_number}
                      </h3>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Pelapor: <strong className="text-neutral-800 dark:text-neutral-200">{activeComplaint.tenant_name}</strong> ({activeComplaint.tenant_phone})
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {getCategoryBadge(activeComplaint.category)}
                    {getPriorityBadge(activeComplaint.priority)}
                  </div>
                </div>

                {/* WhatsApp Chat Conversation Bubble */}
                <div className="space-y-2.5 rounded-2xl bg-white p-3.5 border border-neutral-200/70 shadow-xs dark:bg-neutral-900 dark:border-neutral-700 text-xs">
                  <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400 mb-1">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <Phone className="h-3 w-3" />
                      <span>WhatsApp Inbound Chat</span>
                    </span>
                    <span>{new Date(activeComplaint.created_at).toLocaleString("id-ID")}</span>
                  </div>

                  {/* Tenant Bubble */}
                  <div className="rounded-2xl rounded-tl-sm bg-neutral-100 p-3 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 leading-relaxed font-medium">
                    "{activeComplaint.raw_chat_message}"
                  </div>

                  {/* CS AI Auto-reply Bubble */}
                  <div className="rounded-2xl rounded-tr-sm bg-[#D9FF43]/20 border border-[#D9FF43]/30 p-3 text-neutral-900 dark:text-neutral-100 text-[11px] leading-relaxed">
                    <div className="flex items-center gap-1 font-bold text-[#0A0A0A] dark:text-[#D9FF43] mb-1">
                      <Bot className="h-3 w-3" />
                      <span>Balasan Otomatis CS AI WhatsApp:</span>
                    </div>
                    {activeComplaint.ai_response_sent}
                  </div>
                </div>

                {/* AI Extracted Summary Bento Box */}
                <div className="rounded-2xl bg-white p-3 border border-neutral-200/70 shadow-xs dark:bg-neutral-900 dark:border-neutral-700 text-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-[#D9FF43]" />
                    <span>Ekstraksi Cerdas Masalah (AI Summary):</span>
                  </span>
                  <p className="font-bold text-neutral-900 dark:text-white leading-normal">
                    {activeComplaint.ai_extracted_summary}
                  </p>
                </div>

                {/* Status Toggle & Staff Assignment Form */}
                <form onSubmit={handleSaveNotes} className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      Status Penanganan:
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(activeComplaint.id, "pending")}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                          activeComplaint.status === "pending"
                            ? "bg-rose-600 text-white shadow-xs"
                            : "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300"
                        }`}
                      >
                        Menunggu
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(activeComplaint.id, "in_progress")}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                          activeComplaint.status === "in_progress"
                            ? "bg-amber-500 text-white shadow-xs"
                            : "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300"
                        }`}
                      >
                        Sedang Ditangani
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(activeComplaint.id, "resolved")}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                          activeComplaint.status === "resolved"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300"
                        }`}
                      >
                        Selesai ✅
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block font-bold text-neutral-500 mb-1">
                        Staff / Teknisi Ditugaskan
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Agus (Teknisi)"
                        value={assignedStaff}
                        onChange={(e) => setAssignedStaff(e.target.value)}
                        className="w-full rounded-xl border border-neutral-200 p-2 text-xs font-medium dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-neutral-500 mb-1">
                        Catatan Hasil Penanganan
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Kran diganti baru"
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        className="w-full rounded-xl border border-neutral-200 p-2 text-xs font-medium dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleReplyWhatsApp(activeComplaint)}
                      className="gap-1.5 text-xs font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-800"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      <span>Balas ke WhatsApp Penghuni ↗</span>
                    </Button>

                    <Button type="submit" size="sm" variant="default" className="text-xs font-bold">
                      Simpan Catatan
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="text-center py-16 text-xs text-neutral-400">
                Pilih salah satu tiket keluhan di sebelah kiri untuk melihat rincian.
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
