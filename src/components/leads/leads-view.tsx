"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Target,
  UserPlus,
  Calendar,
  Search,
  Phone,
  Flame,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Edit2,
  Trash2,
  ExternalLink,
  Plus,
  Filter,
  Check,
  Building,
} from "lucide-react";
import {
  Lead,
  SurveySchedule,
  LeadStatus,
  SurveyStatus,
  UserRole,
} from "@/types";
import { KostApiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/lib/notify";
import { formatRupiah, formatDateIndo } from "@/lib/utils";
import { LeadModal } from "./lead-modal";
import { SurveyModal } from "./survey-modal";

interface LeadsViewProps {
  currentRole?: UserRole;
}

type FilterTab = "all" | "new" | "warm" | "follow_up" | "survey_scheduled" | "won" | "lost";

function formatDateTimeIndo(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function LeadsView({ currentRole }: LeadsViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"leads" | "surveys">("leads");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [surveys, setSurveys] = useState<SurveySchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<FilterTab>("all");

  // Modals
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);

  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [surveyToEdit, setSurveyToEdit] = useState<SurveySchedule | null>(null);
  const [preselectedLeadId, setPreselectedLeadId] = useState<string | undefined>(undefined);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [leadsData, surveysData] = await Promise.all([
        KostApiClient.getLeads(),
        KostApiClient.getSurveys(),
      ]);
      setLeads(leadsData);
      setSurveys(surveysData);
    } catch (err) {
      console.error("Gagal memuat data leads / surveys:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    const now = new Date();
    return leads.filter((lead) => {
      // Search matching
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        lead.name.toLowerCase().includes(query) ||
        lead.phone.includes(query) ||
        (lead.landing_page_campaign && lead.landing_page_campaign.toLowerCase().includes(query));

      if (!matchSearch) return false;

      // Filter chips
      if (selectedFilter === "all") return true;
      if (selectedFilter === "new") return lead.status === "new";
      if (selectedFilter === "warm") return Boolean(lead.is_warm);
      if (selectedFilter === "follow_up") {
        return (
          lead.status === "follow_up" ||
          (lead.follow_up_at && new Date(lead.follow_up_at) <= now)
        );
      }
      if (selectedFilter === "survey_scheduled") return lead.status === "survey_scheduled";
      if (selectedFilter === "won") return lead.status === "won";
      if (selectedFilter === "lost") return lead.status === "lost";

      return true;
    });
  }, [leads, searchQuery, selectedFilter]);

  // Grouped Surveys
  const { upcomingSurveys, pastSurveys } = useMemo(() => {
    const upcoming = surveys
      .filter((s) => s.status === "scheduled" || s.status === "confirmed")
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

    const past = surveys
      .filter((s) => s.status === "completed" || s.status === "no_show" || s.status === "cancelled")
      .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

    return { upcomingSurveys: upcoming, pastSurveys: past };
  }, [surveys]);

  // Lead Actions
  const handleDeleteLead = async (lead: Lead) => {
    const ok = await notify.confirmDelete({
      title: "Hapus Data Calon Penghuni?",
      itemName: lead.name,
      itemType: "Prospek Lead",
      itemDetails: `WhatsApp: ${lead.phone} • Status: ${lead.status}`,
      message: `Apakah Anda yakin ingin menghapus prospek ${lead.name}? Seluruh riwayat jadwal survey terkait lead ini akan ikut terhapus.`,
      warningNote: "Tindakan ini tidak dapat dibatalkan.",
      confirmText: "Ya, Hapus Lead",
      cancelText: "Batal",
    });

    if (ok) {
      try {
        await KostApiClient.deleteLead(lead.id);
        notify.deleted(lead.name, "Lead");
        await loadData();
      } catch (err: any) {
        notify.alert({ title: "Gagal Menghapus Lead", message: err.message, variant: "danger" });
      }
    }
  };

  const handleOpenScheduleForLead = (lead: Lead) => {
    setSurveyToEdit(null);
    setPreselectedLeadId(lead.id);
    setIsSurveyModalOpen(true);
  };

  // Survey Actions
  const handleUpdateSurveyStatus = async (surveyId: string, newStatus: SurveyStatus) => {
    try {
      await KostApiClient.updateSurvey(surveyId, { status: newStatus });
      notify.success("Status Survey Diperbarui", `Status survey berhasil diubah menjadi ${newStatus}.`);
      await loadData();
    } catch (err: any) {
      notify.alert({ title: "Gagal Mengubah Status", message: err.message, variant: "danger" });
    }
  };

  const handleDeleteSurvey = async (survey: SurveySchedule) => {
    const ok = await notify.confirmDelete({
      title: "Hapus Jadwal Survey?",
      itemName: `${survey.lead_name || "Calon Penghuni"} (${formatDateTimeIndo(survey.scheduled_at)})`,
      itemType: "Jadwal Survey",
      message: "Apakah Anda yakin ingin menghapus jadwal survey ini?",
      confirmText: "Ya, Hapus Jadwal",
      cancelText: "Batal",
    });

    if (ok) {
      try {
        await KostApiClient.deleteSurvey(survey.id);
        notify.deleted("Jadwal Survey", "Survey");
        await loadData();
      } catch (err: any) {
        notify.alert({ title: "Gagal Menghapus Jadwal", message: err.message, variant: "danger" });
      }
    }
  };

  // Render Status Badge for Lead
  const renderLeadStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case "new":
        return <Badge variant="info">Baru</Badge>;
      case "contacted":
        return <Badge variant="secondary">Dihubungi</Badge>;
      case "follow_up":
        return <Badge variant="warning">Follow-up</Badge>;
      case "survey_scheduled":
        return (
          <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900">
            Terjadwal
          </Badge>
        );
      case "survey_done":
        return (
          <Badge className="bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-900">
            Survey Selesai
          </Badge>
        );
      case "negotiation":
        return (
          <Badge className="bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-900">
            Negosiasi
          </Badge>
        );
      case "won":
        return <Badge variant="success">Deal</Badge>;
      case "lost":
        return <Badge variant="destructive">Gagal</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Render Status Badge for Survey
  const renderSurveyStatusBadge = (status: SurveyStatus) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="warning">Dijadwalkan</Badge>;
      case "confirmed":
        return <Badge variant="success">Terkonfirmasi</Badge>;
      case "completed":
        return <Badge variant="info">Selesai</Badge>;
      case "no_show":
        return <Badge variant="destructive">No-show</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Dibatalkan</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Render Channel Badge
  const renderChannelBadge = (channel: string) => {
    const map: Record<string, { label: string; className: string }> = {
      whatsapp: { label: "WhatsApp", className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300" },
      landing_page: { label: "Landing Page", className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300" },
      instagram: { label: "Instagram", className: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300" },
      tiktok: { label: "TikTok", className: "bg-neutral-100 text-neutral-800 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-200" },
      facebook: { label: "Facebook", className: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300" },
      referral: { label: "Referral", className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300" },
      marketplace: { label: "Marketplace", className: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300" },
      walk_in: { label: "Walk-in", className: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300" },
      other: { label: "Lainnya", className: "bg-neutral-50 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400" },
    };
    const c = map[channel] || { label: channel, className: "bg-neutral-100 text-neutral-600" };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${c.className}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Utama */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
              Leads & Survey
            </h2>
            <span className="rounded-full bg-[#D9FF43] px-2.5 py-0.5 text-xs font-bold text-[#0A0A0A]">
              {leads.length} Calon Penghuni
            </span>
          </div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
            Manajemen prospek penyewa kos, status pipeline, follow-up, serta jadwal kunjungan survey kamar.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === "surveys" && (
            <Button
              onClick={() => {
                setSurveyToEdit(null);
                setPreselectedLeadId(undefined);
                setIsSurveyModalOpen(true);
              }}
              variant="outline"
              className="gap-2 shadow-spatial text-xs font-bold"
            >
              <Calendar className="h-4 w-4" />
              <span>Tambah Jadwal</span>
            </Button>
          )}

          <Button
            onClick={() => {
              setLeadToEdit(null);
              setIsLeadModalOpen(true);
            }}
            variant="default"
            className="gap-2 shadow-spatial text-xs font-bold"
          >
            <UserPlus className="h-4 w-4" />
            <span>Tambah Lead</span>
          </Button>
        </div>
      </div>

      {/* Segmented Control Sub-Tabs */}
      <div className="flex items-center justify-between gap-3 rounded-3xl bg-white p-2 sm:p-3 shadow-spatial border border-white/80 dark:bg-[#18181B] dark:border-white/10">
        <div className="flex items-center gap-1.5 rounded-full bg-neutral-100 p-1 dark:bg-neutral-800 shrink-0">
          <button
            onClick={() => setActiveSubTab("leads")}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${
              activeSubTab === "leads"
                ? "bg-[#0A0A0A] text-white shadow-xs dark:bg-white dark:text-[#0A0A0A]"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
            }`}
          >
            <Target className="h-3.5 w-3.5" />
            <span>Daftar Leads ({leads.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab("surveys")}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${
              activeSubTab === "surveys"
                ? "bg-[#0A0A0A] text-white shadow-xs dark:bg-white dark:text-[#0A0A0A]"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Jadwal Survey ({surveys.length})</span>
          </button>
        </div>

        {/* Search Bar for Leads Sub-tab */}
        {activeSubTab === "leads" && (
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Cari nama, WhatsApp, atau campaign..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-neutral-200/80 bg-neutral-50 py-2 pl-9 pr-4 text-xs font-medium focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
            />
          </div>
        )}
      </div>

      {/* Sub-tab 1: Leads */}
      {activeSubTab === "leads" && (
        <div className="space-y-4">
          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
            <button
              onClick={() => setSelectedFilter("all")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 ${
                selectedFilter === "all"
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs"
                  : "bg-white text-neutral-600 border border-neutral-200/80 hover:bg-neutral-100 dark:bg-neutral-800 dark:border-white/10 dark:text-neutral-300"
              }`}
            >
              Semua ({leads.length})
            </button>
            <button
              onClick={() => setSelectedFilter("new")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 ${
                selectedFilter === "new"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-neutral-600 border border-neutral-200/80 hover:bg-neutral-100 dark:bg-neutral-800 dark:border-white/10 dark:text-neutral-300"
              }`}
            >
              Baru ({leads.filter((l) => l.status === "new").length})
            </button>
            <button
              onClick={() => setSelectedFilter("warm")}
              className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 ${
                selectedFilter === "warm"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-white text-neutral-600 border border-neutral-200/80 hover:bg-neutral-100 dark:bg-neutral-800 dark:border-white/10 dark:text-neutral-300"
              }`}
            >
              <span>🔥 Warm Lead</span>
              <span>({leads.filter((l) => l.is_warm).length})</span>
            </button>
            <button
              onClick={() => setSelectedFilter("follow_up")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 ${
                selectedFilter === "follow_up"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-white text-neutral-600 border border-neutral-200/80 hover:bg-neutral-100 dark:bg-neutral-800 dark:border-white/10 dark:text-neutral-300"
              }`}
            >
              Perlu Follow-up (
              {
                leads.filter(
                  (l) =>
                    l.status === "follow_up" ||
                    (l.follow_up_at && new Date(l.follow_up_at) <= new Date())
                ).length
              }
              )
            </button>
            <button
              onClick={() => setSelectedFilter("survey_scheduled")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 ${
                selectedFilter === "survey_scheduled"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white text-neutral-600 border border-neutral-200/80 hover:bg-neutral-100 dark:bg-neutral-800 dark:border-white/10 dark:text-neutral-300"
              }`}
            >
              Terjadwal Survey ({leads.filter((l) => l.status === "survey_scheduled").length})
            </button>
            <button
              onClick={() => setSelectedFilter("won")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 ${
                selectedFilter === "won"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white text-neutral-600 border border-neutral-200/80 hover:bg-neutral-100 dark:bg-neutral-800 dark:border-white/10 dark:text-neutral-300"
              }`}
            >
              Deal (Won) ({leads.filter((l) => l.status === "won").length})
            </button>
            <button
              onClick={() => setSelectedFilter("lost")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 ${
                selectedFilter === "lost"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-white text-neutral-600 border border-neutral-200/80 hover:bg-neutral-100 dark:bg-neutral-800 dark:border-white/10 dark:text-neutral-300"
              }`}
            >
              Gagal (Lost) ({leads.filter((l) => l.status === "lost").length})
            </button>
          </div>

          {/* Table Leads */}
          <div className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-spatial dark:bg-[#18181B] dark:border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-neutral-100 bg-neutral-50/80 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:bg-neutral-800/60 dark:border-white/10">
                  <tr>
                    <th className="px-5 py-4">Nama Calon Penghuni</th>
                    <th className="px-5 py-4">WhatsApp (E.164)</th>
                    <th className="px-5 py-4">Channel & Minat</th>
                    <th className="px-5 py-4">Status Pipeline</th>
                    <th className="px-5 py-4">Follow-up & Staff</th>
                    <th className="px-5 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-neutral-400">
                        Tidak ada data calon penghuni yang cocok dengan pencarian/filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => {
                      const cleanDigits = lead.phone.replace(/\D/g, "");
                      const isOverdueFollowUp =
                        lead.follow_up_at && new Date(lead.follow_up_at) <= new Date();

                      return (
                        <tr
                          key={lead.id}
                          className="transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40"
                        >
                          {/* Nama & Warm Flag */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              {lead.is_warm && (
                                <span title="Warm Lead (Prioritas)" className="text-base">
                                  🔥
                                </span>
                              )}
                              <div>
                                <span className="font-bold text-neutral-900 dark:text-white">
                                  {lead.name}
                                </span>
                                {lead.notes && (
                                  <p className="text-[11px] text-neutral-500 line-clamp-1 max-w-xs mt-0.5">
                                    {lead.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* WhatsApp link */}
                          <td className="px-5 py-4">
                            <a
                              href={`https://wa.me/${cleanDigits}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 font-bold text-emerald-600 hover:text-emerald-700 hover:underline dark:text-emerald-400"
                            >
                              <Phone className="h-3.5 w-3.5" />
                              <span>{lead.phone}</span>
                              <ExternalLink className="h-3 w-3 opacity-60" />
                            </a>
                          </td>

                          {/* Channel & Minat */}
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-1 items-start">
                              <div className="flex items-center gap-1">
                                {renderChannelBadge(lead.channel)}
                                {lead.landing_page_campaign && (
                                  <span className="text-[10px] text-neutral-400">
                                    #{lead.landing_page_campaign}
                                  </span>
                                )}
                              </div>
                              {(lead.preferred_room_type || lead.budget_max) && (
                                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                                  {lead.preferred_room_type || "Bebas"}
                                  {lead.budget_max
                                    ? ` • Maks ${formatRupiah(lead.budget_max)}`
                                    : ""}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4">{renderLeadStatusBadge(lead.status)}</td>

                          {/* Follow-up & Staff */}
                          <td className="px-5 py-4">
                            <div className="flex flex-col">
                              {lead.follow_up_at ? (
                                <div
                                  className={`flex items-center gap-1 text-[11px] font-semibold ${
                                    isOverdueFollowUp
                                      ? "text-rose-600 dark:text-rose-400"
                                      : "text-neutral-600 dark:text-neutral-300"
                                  }`}
                                >
                                  <Clock className="h-3 w-3" />
                                  <span>{formatDateTimeIndo(lead.follow_up_at)}</span>
                                  {isOverdueFollowUp && (
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-rose-100 text-rose-700 font-bold dark:bg-rose-950 dark:text-rose-300">
                                      Lewat
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-neutral-400 text-[11px]">Belum dijadwalkan</span>
                              )}
                              <span className="text-[10px] text-neutral-400 mt-0.5">
                                Staff: {lead.assigned_staff_name || "—"}
                              </span>
                            </div>
                          </td>

                          {/* Aksi */}
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenScheduleForLead(lead)}
                                className="h-7 px-2.5 text-[11px] font-bold gap-1 rounded-full border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700"
                                title="Jadwalkan Survey Kamar"
                              >
                                <Calendar className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                                <span className="hidden sm:inline">Survey</span>
                              </Button>
                              <button
                                onClick={() => {
                                  setLeadToEdit(lead);
                                  setIsLeadModalOpen(true);
                                }}
                                className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                                title="Edit Lead"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteLead(lead)}
                                className="rounded-full p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                                title="Hapus Lead"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 2: Jadwal Survey */}
      {activeSubTab === "surveys" && (
        <div className="space-y-6">
          {/* Grup 1: Survey Mendatang */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
                <span>Survey Mendatang</span>
                <span className="rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 text-[10px] font-extrabold">
                  {upcomingSurveys.length} Jadwal
                </span>
              </h3>
            </div>

            <div className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-spatial dark:bg-[#18181B] dark:border-white/10">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-neutral-100 bg-neutral-50/80 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:bg-neutral-800/60 dark:border-white/10">
                    <tr>
                      <th className="px-5 py-4">Calon Penghuni</th>
                      <th className="px-5 py-4">Kamar Dituju</th>
                      <th className="px-5 py-4">Waktu Survey</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Staff Pendamping</th>
                      <th className="px-5 py-4 text-right">Aksi Survey</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
                    {upcomingSurveys.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-neutral-400">
                          Tidak ada survey mendatang yang sedang dijadwalkan.
                        </td>
                      </tr>
                    ) : (
                      upcomingSurveys.map((survey) => {
                        const cleanDigits = survey.lead_phone ? survey.lead_phone.replace(/\D/g, "") : "";
                        return (
                          <tr
                            key={survey.id}
                            className="transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40"
                          >
                            {/* Lead name + phone */}
                            <td className="px-5 py-4">
                              <span className="font-bold text-neutral-900 dark:text-white">
                                {survey.lead_name || "Calon Penghuni"}
                              </span>
                              {survey.lead_phone && (
                                <div>
                                  <a
                                    href={`https://wa.me/${cleanDigits}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] font-semibold text-emerald-600 hover:underline dark:text-emerald-400 inline-flex items-center gap-1 mt-0.5"
                                  >
                                    <Phone className="h-3 w-3" />
                                    <span>{survey.lead_phone}</span>
                                  </a>
                                </div>
                              )}
                            </td>

                            {/* Room */}
                            <td className="px-5 py-4">
                              {survey.room_number ? (
                                <span className="font-bold text-neutral-800 dark:text-neutral-200">
                                  Kamar {survey.room_number}
                                </span>
                              ) : (
                                <span className="text-neutral-400">—</span>
                              )}
                            </td>

                            {/* Scheduled At */}
                            <td className="px-5 py-4 font-semibold text-neutral-700 dark:text-neutral-300">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-neutral-400" />
                                <span>{formatDateTimeIndo(survey.scheduled_at)}</span>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-5 py-4">{renderSurveyStatusBadge(survey.status)}</td>

                            {/* Staff */}
                            <td className="px-5 py-4 text-neutral-600 dark:text-neutral-300">
                              {survey.assigned_staff_name || "—"}
                            </td>

                            {/* Aksi Berdasarkan Status */}
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {survey.status === "scheduled" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateSurveyStatus(survey.id, "confirmed")}
                                    className="h-7 px-2.5 text-[11px] font-bold rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    <span>Konfirmasi</span>
                                  </Button>
                                )}

                                {survey.status === "confirmed" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateSurveyStatus(survey.id, "completed")}
                                    className="h-7 px-2.5 text-[11px] font-bold rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    <span>Selesai</span>
                                  </Button>
                                )}

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateSurveyStatus(survey.id, "no_show")}
                                  className="h-7 px-2 text-[11px] font-semibold rounded-full border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400"
                                >
                                  No-show
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateSurveyStatus(survey.id, "cancelled")}
                                  className="h-7 px-2 text-[11px] font-semibold rounded-full border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300"
                                >
                                  Batal
                                </Button>

                                <button
                                  onClick={() => {
                                    setSurveyToEdit(survey);
                                    setIsSurveyModalOpen(true);
                                  }}
                                  className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                                  title="Edit Survey"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Grup 2: Riwayat Survey (Selesai, No-Show, Batal) */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
              <span>Riwayat Kunjungan Sebelumnya</span>
              <span className="rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 px-2 py-0.5 text-[10px] font-extrabold">
                {pastSurveys.length} Riwayat
              </span>
            </h3>

            <div className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-spatial dark:bg-[#18181B] dark:border-white/10">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-neutral-100 bg-neutral-50/80 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:bg-neutral-800/60 dark:border-white/10">
                    <tr>
                      <th className="px-5 py-4">Calon Penghuni</th>
                      <th className="px-5 py-4">Kamar</th>
                      <th className="px-5 py-4">Waktu Kunjungan</th>
                      <th className="px-5 py-4">Status Akhir</th>
                      <th className="px-5 py-4">Catatan / Hasil Survey</th>
                      <th className="px-5 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
                    {pastSurveys.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-neutral-400">
                          Belum ada riwayat kunjungan survey yang selesai atau dibatalkan.
                        </td>
                      </tr>
                    ) : (
                      pastSurveys.map((survey) => (
                        <tr
                          key={survey.id}
                          className="transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 opacity-90"
                        >
                          <td className="px-5 py-4">
                            <span className="font-bold text-neutral-900 dark:text-white">
                              {survey.lead_name || "Calon Penghuni"}
                            </span>
                            {survey.lead_phone && (
                              <span className="block text-[11px] text-neutral-400">
                                {survey.lead_phone}
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {survey.room_number ? `Kamar ${survey.room_number}` : "—"}
                          </td>

                          <td className="px-5 py-4 text-neutral-600 dark:text-neutral-300">
                            {formatDateTimeIndo(survey.scheduled_at)}
                          </td>

                          <td className="px-5 py-4">{renderSurveyStatusBadge(survey.status)}</td>

                          <td className="px-5 py-4 max-w-xs truncate text-neutral-500">
                            {survey.result_notes || "—"}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSurveyToEdit(survey);
                                  setIsSurveyModalOpen(true);
                                }}
                                className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                                title="Edit Survey"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSurvey(survey)}
                                className="rounded-full p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                                title="Hapus Riwayat Survey"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <LeadModal
        isOpen={isLeadModalOpen}
        onClose={() => {
          setIsLeadModalOpen(false);
          setLeadToEdit(null);
        }}
        leadToEdit={leadToEdit}
        onSuccess={loadData}
      />

      <SurveyModal
        isOpen={isSurveyModalOpen}
        onClose={() => {
          setIsSurveyModalOpen(false);
          setSurveyToEdit(null);
          setPreselectedLeadId(undefined);
        }}
        surveyToEdit={surveyToEdit}
        preselectedLeadId={preselectedLeadId}
        leads={leads}
        onSuccess={loadData}
      />
    </div>
  );
}

export default LeadsView;
