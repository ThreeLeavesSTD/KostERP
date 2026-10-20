"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Building2,
  Kanban,
  List,
  GripVertical,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Users,
  MessageCircle,
  Sparkles,
  ChevronRight,
  Handshake,
  Inbox,
  Send,
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
import { ConvertToTenantModal } from "./convert-to-tenant-modal";
import { KostStorage } from "@/lib/storage";
import { SequentialPipelineFunnel } from "./sequential-pipeline-funnel";

interface LeadsViewProps {
  currentRole?: UserRole;
}

type FilterTab =
  | "all"
  | "new"
  | "warm"
  | "follow_up"
  | "survey_scheduled"
  | "won"
  | "lost";

interface PipelineStageConfig {
  id: LeadStatus;
  title: string;
  subtitle: string;
  statuses: LeadStatus[];
  color: string;
  badgeClass: string;
  icon: React.ElementType;
}

const PIPELINE_STAGES: PipelineStageConfig[] = [
  {
    id: "new",
    title: "Inbound / Baru",
    subtitle: "Pesan baru via WA/Ads",
    statuses: ["new"],
    color: "border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20",
    badgeClass: "bg-blue-500 text-white",
    icon: Inbox,
  },
  {
    id: "contacted",
    title: "Kontak & Follow-up",
    subtitle: "Sudah direspons/tanya harga",
    statuses: ["contacted", "follow_up"],
    color: "border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20",
    badgeClass: "bg-amber-500 text-white",
    icon: MessageCircle,
  },
  {
    id: "survey_scheduled",
    title: "Jadwal Survey",
    subtitle: "Janji temu cek kamar",
    statuses: ["survey_scheduled"],
    color: "border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20",
    badgeClass: "bg-indigo-600 text-white",
    icon: Calendar,
  },
  {
    id: "negotiation",
    title: "Review & Negosiasi",
    subtitle: "Sudah survey / minta diskon",
    statuses: ["survey_done", "negotiation"],
    color: "border-purple-200 dark:border-purple-900 bg-purple-50/40 dark:bg-purple-950/20",
    badgeClass: "bg-purple-600 text-white",
    icon: Handshake,
  },
  {
    id: "won",
    title: "Deal / Won (Closing)",
    subtitle: "Booking fee / siap sewa",
    statuses: ["won"],
    color: "border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20",
    badgeClass: "bg-emerald-600 text-white",
    icon: CheckCircle2,
  },
  {
    id: "lost",
    title: "Batal / Lost",
    subtitle: "Budget/lokasi tidak cocok",
    statuses: ["lost"],
    color: "border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20",
    badgeClass: "bg-rose-600 text-white",
    icon: XCircle,
  },
];

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
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [leads, setLeads] = useState<Lead[]>(() => KostStorage.getLeads());
  const [surveys, setSurveys] = useState<SurveySchedule[]>(() => KostStorage.getSurveys());
  const [isLoading, setIsLoading] = useState(() => KostStorage.getLeads().length === 0);

  // Drag & Drop State
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<FilterTab>("all");
  const [selectedChannel, setSelectedChannel] = useState<string>("all");

  // Modals
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);

  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [surveyToEdit, setSurveyToEdit] = useState<SurveySchedule | null>(null);
  const [preselectedLeadId, setPreselectedLeadId] = useState<string | undefined>(undefined);

  const [leadToConvert, setLeadToConvert] = useState<Lead | null>(null);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);

  const loadData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadData();

    // Listen to real-time storage mutations
    const handleStorageChange = (e: any) => {
      if (
        !e.detail?.key ||
        e.detail.key === "kost_erp_leads" ||
        e.detail.key === "kost_erp_surveys"
      ) {
        loadData();
      }
    };

    window.addEventListener("kost_storage_change", handleStorageChange);
    return () => {
      window.removeEventListener("kost_storage_change", handleStorageChange);
    };
  }, [loadData]);

  // CRM Top Metrics
  const metrics = useMemo(() => {
    const totalLeads = leads.length;
    const activeLeads = leads.filter(
      (l) => l.status !== "won" && l.status !== "lost"
    ).length;
    const upcomingSurveyCount = surveys.filter(
      (s) => s.status === "scheduled" || s.status === "confirmed"
    ).length;
    const wonCount = leads.filter((l) => l.status === "won").length;
    const lostCount = leads.filter((l) => l.status === "lost").length;

    const winRate =
      wonCount + lostCount > 0
        ? Math.round((wonCount / (wonCount + lostCount)) * 100)
        : 0;

    const pipelineValue = leads
      .filter((l) => l.status !== "lost")
      .reduce((sum, l) => sum + (l.budget_max || l.budget_min || 1800000), 0);

    return {
      totalLeads,
      activeLeads,
      upcomingSurveyCount,
      wonCount,
      winRate,
      pipelineValue,
    };
  }, [leads, surveys]);

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
        (lead.preferred_room_type &&
          lead.preferred_room_type.toLowerCase().includes(query)) ||
        (lead.landing_page_campaign &&
          lead.landing_page_campaign.toLowerCase().includes(query));

      if (!matchSearch) return false;

      // Channel filter
      if (selectedChannel !== "all" && lead.channel !== selectedChannel) {
        return false;
      }

      // Filter chips (for list view)
      if (selectedFilter === "all") return true;
      if (selectedFilter === "new") return lead.status === "new";
      if (selectedFilter === "warm") return Boolean(lead.is_warm);
      if (selectedFilter === "follow_up") {
        return (
          lead.status === "follow_up" ||
          (lead.follow_up_at && new Date(lead.follow_up_at) <= now)
        );
      }
      if (selectedFilter === "survey_scheduled")
        return lead.status === "survey_scheduled";
      if (selectedFilter === "won") return lead.status === "won";
      if (selectedFilter === "lost") return lead.status === "lost";

      return true;
    });
  }, [leads, searchQuery, selectedFilter, selectedChannel]);

  // Grouped Surveys
  const { upcomingSurveys, pastSurveys } = useMemo(() => {
    const upcoming = surveys
      .filter((s) => s.status === "scheduled" || s.status === "confirmed")
      .sort(
        (a, b) =>
          new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      );

    const past = surveys
      .filter(
        (s) =>
          s.status === "completed" ||
          s.status === "no_show" ||
          s.status === "cancelled"
      )
      .sort(
        (a, b) =>
          new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
      );

    return { upcomingSurveys: upcoming, pastSurveys: past };
  }, [surveys]);

  // === DRAG AND DROP HANDLERS ===
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData("text/plain", leadId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedLeadId(leadId);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverStage !== stageId) {
      setDragOverStage(stageId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverStage(null);
    }
  };

  const handleDropOnStage = async (targetStageId: LeadStatus) => {
    const leadId = draggedLeadId;
    setDraggedLeadId(null);
    setDragOverStage(null);

    if (!leadId) return;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === targetStageId) return;

    // Optimistic UI update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: targetStageId } : l))
    );

    try {
      await KostApiClient.updateLead(leadId, { status: targetStageId });

      const stageConfig = PIPELINE_STAGES.find((s) => s.id === targetStageId);
      const stageName = stageConfig ? stageConfig.title : targetStageId;

      notify.success(
        "Status Pipeline Diperbarui",
        `${lead.name} berhasil dipindahkan ke tahap "${stageName}".`
      );

      // Aksi lanjutan otomatis sesuai tahap baru
      if (targetStageId === "won") {
        setLeadToConvert(lead);
        setIsConvertModalOpen(true);
      } else if (targetStageId === "survey_scheduled") {
        handleOpenScheduleForLead(lead);
      }
    } catch (err: any) {
      notify.alert({
        title: "Gagal Mengubah Status",
        message: err.message || "Gagal memperbarui status pipeline lead.",
        variant: "danger",
      });
      loadData();
    }
  };

  // Lead Actions
  const handleDeleteLead = async (lead: Lead) => {
    const ok = await notify.confirmDelete({
      title: "Hapus Data Calon Penghuni?",
      itemName: lead.name,
      itemType: "Prospek Lead",
      itemDetails: `WhatsApp: ${lead.phone} • Status: ${lead.status}`,
      message: `Apakah Anda yakin ingin menghapus prospek ${lead.name}? Seluruh jadwal survey terkait akan ikut terhapus.`,
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
        notify.alert({
          title: "Gagal Menghapus Lead",
          message: err.message,
          variant: "danger",
        });
      }
    }
  };

  const handleOpenScheduleForLead = (lead: Lead) => {
    setSurveyToEdit(null);
    setPreselectedLeadId(lead.id);
    setIsSurveyModalOpen(true);
  };

  const handleOpenConvertForLead = (lead: Lead) => {
    setLeadToConvert(lead);
    setIsConvertModalOpen(true);
  };

  // Survey Actions
  const handleUpdateSurveyStatus = async (
    surveyId: string,
    newStatus: SurveyStatus
  ) => {
    try {
      await KostApiClient.updateSurvey(surveyId, { status: newStatus });
      notify.success(
        "Status Survey Diperbarui",
        `Status survey berhasil diubah menjadi ${newStatus}.`
      );
      await loadData();
    } catch (err: any) {
      notify.alert({
        title: "Gagal Mengubah Status",
        message: err.message,
        variant: "danger",
      });
    }
  };

  const handleDeleteSurvey = async (survey: SurveySchedule) => {
    const ok = await notify.confirmDelete({
      title: "Hapus Jadwal Survey?",
      itemName: `${survey.lead_name || "Calon Penghuni"} (${formatDateTimeIndo(
        survey.scheduled_at
      )})`,
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
        notify.alert({
          title: "Gagal Menghapus Jadwal",
          message: err.message,
          variant: "danger",
        });
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
        return <Badge variant="success">Deal (Won)</Badge>;
      case "lost":
        return <Badge variant="destructive">Gagal (Lost)</Badge>;
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
      whatsapp: {
        label: "WhatsApp",
        className:
          "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
      },
      landing_page: {
        label: "Landing Page",
        className:
          "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
      },
      instagram: {
        label: "Instagram",
        className:
          "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300",
      },
      tiktok: {
        label: "TikTok",
        className:
          "bg-neutral-100 text-neutral-800 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-200",
      },
      facebook: {
        label: "Facebook",
        className:
          "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300",
      },
      referral: {
        label: "Referral",
        className:
          "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300",
      },
      marketplace: {
        label: "Mamikos / Market",
        className:
          "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
      },
      walk_in: {
        label: "Walk-in",
        className:
          "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300",
      },
      other: {
        label: "Lainnya",
        className:
          "bg-neutral-50 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400",
      },
    };
    const c = map[channel] || {
      label: channel,
      className: "bg-neutral-100 text-neutral-600",
    };
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${c.className}`}
      >
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
              Leads & CRM Pipeline
            </h2>
            <span className="rounded-full bg-[#D9FF43] px-2.5 py-0.5 text-xs font-black text-[#0A0A0A]">
              {leads.length} Prospek
            </span>
          </div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
            Manajemen prospek penyewa kos dengan Kanban drag & drop, jadwal survey, dan konversi cepat ke kontrak sewa.
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
              className="gap-2 shadow-spatial text-xs font-bold rounded-2xl"
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
            className="gap-2 shadow-spatial text-xs font-bold rounded-2xl bg-[#0A0A0A] text-white hover:bg-neutral-800 dark:bg-white dark:text-[#0A0A0A]"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Lead</span>
          </Button>
        </div>
      </div>

      {/* Sequential Pipeline Funnel Stream with Traveling Orb and Node Orbit */}
      <SequentialPipelineFunnel leads={leads} />

      {/* 4 Professional CRM Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Leads */}
        <div className="rounded-3xl bg-white p-4 shadow-spatial border border-white/80 dark:bg-[#18181B] dark:border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Total Calon Penghuni
            </p>
            <h3 className="text-2xl font-black text-neutral-900 dark:text-white mt-1">
              {metrics.totalLeads}
            </h3>
            <p className="text-[10px] font-semibold text-neutral-400 mt-0.5">
              {metrics.activeLeads} prospek sedang aktif
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <Users className="h-6 w-6" />
          </div>
        </div>

        {/* Card 2: Survey Terjadwal */}
        <div className="rounded-3xl bg-white p-4 shadow-spatial border border-white/80 dark:bg-[#18181B] dark:border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Jadwal Survey Aktif
            </p>
            <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {metrics.upcomingSurveyCount}
            </h3>
            <p className="text-[10px] font-semibold text-neutral-400 mt-0.5">
              Kunjungan calon penyewa
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
            <Calendar className="h-6 w-6" />
          </div>
        </div>

        {/* Card 3: Potensi Nilai Sewa Pipeline */}
        <div className="rounded-3xl bg-white p-4 shadow-spatial border border-white/80 dark:bg-[#18181B] dark:border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Potensi Omset / Bln
            </p>
            <h3 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white mt-1">
              {formatRupiah(metrics.pipelineValue)}
            </h3>
            <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
              Nilai akumulasi prospek aktif
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D9FF43]/30 text-[#0A0A0A] dark:text-[#D9FF43]">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        {/* Card 4: Closing Win Rate */}
        <div className="rounded-3xl bg-white p-4 shadow-spatial border border-white/80 dark:bg-[#18181B] dark:border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Closing Win Rate
            </p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {metrics.winRate}%
            </h3>
            <p className="text-[10px] font-semibold text-neutral-400 mt-0.5">
              {metrics.wonCount} deal resmi closing
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-3xl bg-white p-2 sm:p-3 shadow-spatial border border-white/80 dark:bg-[#18181B] dark:border-white/10">
        {/* Sub-Tabs */}
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
            <span>Pipeline Leads ({leads.length})</span>
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

        {/* View Mode (Kanban vs Table) & Search Input */}
        {activeSubTab === "leads" && (
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-full bg-neutral-100 p-1 dark:bg-neutral-800">
              <button
                onClick={() => setViewMode("kanban")}
                title="Tampilan Kanban Drag & Drop"
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                  viewMode === "kanban"
                    ? "bg-[#0A0A0A] text-white shadow-xs dark:bg-white dark:text-[#0A0A0A]"
                    : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
                }`}
              >
                <Kanban className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Kanban Pipeline</span>
              </button>
              <button
                onClick={() => setViewMode("table")}
                title="Tampilan Tabel Rinci"
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                  viewMode === "table"
                    ? "bg-[#0A0A0A] text-white shadow-xs dark:bg-white dark:text-[#0A0A0A]"
                    : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Tabel</span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Cari prospek atau kamar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full border border-neutral-200/80 bg-neutral-50 py-1.5 pl-9 pr-3 text-xs font-medium focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* SUB-TAB 1: LEADS VIEW */}
      {activeSubTab === "leads" && (
        <div className="space-y-4">
          {/* Channel Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
            <span className="text-[11px] font-bold text-neutral-400 shrink-0 ml-1">
              Sumber:
            </span>
            {[
              { id: "all", label: "Semua Channel" },
              { id: "whatsapp", label: "WhatsApp" },
              { id: "instagram", label: "Instagram" },
              { id: "tiktok", label: "TikTok" },
              { id: "marketplace", label: "Mamikos" },
              { id: "referral", label: "Referral" },
              { id: "walk_in", label: "Walk-in" },
            ].map((ch) => (
              <button
                key={ch.id}
                onClick={() => setSelectedChannel(ch.id)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-all shrink-0 ${
                  selectedChannel === ch.id
                    ? "bg-[#0A0A0A] text-white dark:bg-white dark:text-[#0A0A0A] shadow-xs"
                    : "bg-white text-neutral-600 border border-neutral-200/80 hover:bg-neutral-100 dark:bg-neutral-800 dark:border-white/10 dark:text-neutral-300"
                }`}
              >
                {ch.label}
              </button>
            ))}
          </div>

          {/* ======================================================== */}
          {/* 1. KANBAN PIPELINE VIEW (DRAG & DROP)                     */}
          {/* ======================================================== */}
          {viewMode === "kanban" && (
            <div className="overflow-x-auto pb-6 pt-1 hide-scrollbar">
              <div className="flex items-start gap-4 min-w-[1240px]">
                {PIPELINE_STAGES.map((stage) => {
                  const StageIcon = stage.icon;
                  // Filter leads belonging to this stage
                  const stageLeads = filteredLeads.filter((l) =>
                    stage.statuses.includes(l.status)
                  );
                  const stageValue = stageLeads.reduce(
                    (sum, l) => sum + (l.budget_max || l.budget_min || 1800000),
                    0
                  );
                  const isDragOver = dragOverStage === stage.id;

                  return (
                    <div
                      key={stage.id}
                      onDragOver={(e) => handleDragOver(e, stage.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={() => handleDropOnStage(stage.id)}
                      className={`flex flex-col w-72 shrink-0 rounded-3xl border transition-all duration-200 ${
                        isDragOver
                          ? "border-2 border-dashed border-[#0A0A0A] dark:border-white bg-[#D9FF43]/15 scale-[1.01] shadow-spatial-lg"
                          : `${stage.color} border-neutral-200/70 dark:border-white/10`
                      }`}
                    >
                      {/* Column Header */}
                      <div className="p-3.5 border-b border-neutral-200/60 dark:border-white/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={`flex h-7 w-7 items-center justify-center rounded-xl font-bold text-xs shadow-xs ${stage.badgeClass}`}
                            >
                              <StageIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-neutral-900 dark:text-white leading-tight">
                                {stage.title}
                              </h4>
                              <p className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                                {stage.subtitle}
                              </p>
                            </div>
                          </div>
                          <span className="flex h-5 items-center justify-center rounded-full bg-white dark:bg-neutral-800 px-2 text-[10px] font-black text-neutral-800 dark:text-neutral-200 shadow-xs border border-neutral-200/60 dark:border-neutral-700">
                            {stageLeads.length}
                          </span>
                        </div>

                        {/* Pipeline Stage Total Potential Value */}
                        {stageValue > 0 && (
                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-neutral-200/50 dark:border-white/5 text-[10px]">
                            <span className="font-semibold text-neutral-400">
                              Potensi Nilai:
                            </span>
                            <span className="font-black text-neutral-800 dark:text-neutral-200">
                              {formatRupiah(stageValue)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Column Cards Container (Drop Zone) */}
                      <div className="p-2.5 space-y-2.5 min-h-[480px] max-h-[calc(100vh-280px)] overflow-y-auto">
                        {stageLeads.length === 0 ? (
                          <div
                            className={`flex flex-col items-center justify-center rounded-2xl border border-dashed py-10 px-3 text-center transition-all ${
                              isDragOver
                                ? "border-[#0A0A0A] bg-[#D9FF43]/20 dark:border-white text-neutral-900 dark:text-white"
                                : "border-neutral-300/80 dark:border-neutral-700 text-neutral-400"
                            }`}
                          >
                            <GripVertical className="h-5 w-5 mb-1 opacity-40" />
                            <p className="text-[11px] font-bold">Tarik lead ke sini</p>
                            <p className="text-[9px] opacity-70">
                              Drag & drop calon penghuni
                            </p>
                          </div>
                        ) : (
                          stageLeads.map((lead) => {
                            const isBeingDragged = draggedLeadId === lead.id;
                            const cleanDigits = lead.phone.replace(/\D/g, "");
                            const isOverdueFollowUp =
                              lead.follow_up_at &&
                              new Date(lead.follow_up_at) <= new Date();

                            return (
                              <div
                                key={lead.id}
                                draggable={true}
                                onDragStart={(e) => handleDragStart(e, lead.id)}
                                onDragEnd={() => {
                                  setDraggedLeadId(null);
                                  setDragOverStage(null);
                                }}
                                className={`group relative rounded-2xl border border-white/90 bg-white p-3.5 shadow-spatial hover:shadow-spatial-lg hover:border-[#0A0A0A]/30 dark:bg-[#1C1C20] dark:border-white/10 dark:hover:border-white/30 transition-all cursor-grab active:cursor-grabbing ${
                                  isBeingDragged
                                    ? "opacity-40 scale-95 ring-2 ring-[#0A0A0A] dark:ring-white rotate-1"
                                    : ""
                                }`}
                              >
                                {/* Grip & Lead Name */}
                                <div className="flex items-start justify-between gap-1.5">
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 text-xs font-black">
                                      {lead.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <h5 className="text-xs font-black text-neutral-900 dark:text-white leading-tight">
                                          {lead.name}
                                        </h5>
                                        {lead.is_warm && (
                                          <span
                                            title="Warm Lead / Prioritas Tinggi"
                                            className="text-xs"
                                          >
                                            🔥
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] font-semibold text-neutral-400">
                                        Staff: {lead.assigned_staff_name || "Lina M."}
                                      </p>
                                    </div>
                                  </div>

                                  <GripVertical className="h-4 w-4 text-neutral-300 group-hover:text-neutral-600 dark:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" />
                                </div>

                                {/* Channel & Minat Kamar */}
                                <div className="mt-2 flex flex-wrap items-center gap-1">
                                  {renderChannelBadge(lead.channel)}
                                  {lead.preferred_room_type && (
                                    <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                                      {lead.preferred_room_type}
                                    </span>
                                  )}
                                  {lead.budget_max && (
                                    <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                      {formatRupiah(lead.budget_max)}
                                    </span>
                                  )}
                                </div>

                                {/* Notes if any */}
                                {lead.notes && (
                                  <p className="mt-2 text-[11px] text-neutral-600 dark:text-neutral-400 line-clamp-2 bg-neutral-50 dark:bg-neutral-800/60 p-2 rounded-xl border border-neutral-100 dark:border-white/5">
                                    {lead.notes}
                                  </p>
                                )}

                                {/* Follow up / Survey Countdown */}
                                {lead.follow_up_at && (
                                  <div
                                    className={`mt-2 flex items-center gap-1 text-[10px] font-bold ${
                                      isOverdueFollowUp
                                        ? "text-rose-600 dark:text-rose-400"
                                        : "text-neutral-500 dark:text-neutral-400"
                                    }`}
                                  >
                                    <Clock className="h-3 w-3" />
                                    <span>
                                      Follow-up: {formatDateTimeIndo(lead.follow_up_at)}
                                    </span>
                                    {isOverdueFollowUp && (
                                      <span className="rounded bg-rose-100 px-1 text-[9px] font-black text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                        Lewat
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Card Actions */}
                                <div className="mt-3 flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-white/5">
                                  {/* Direct WhatsApp Link */}
                                  <a
                                    href={`https://wa.me/${cleanDigits}?text=${encodeURIComponent(
                                      `Halo Kak ${lead.name}, salam dari Kost Putri Graha Asri Margonda. Bagaimana kabar Kakak hari ini? Kami ingin menanyakan apakah ada info kamar kost yang bisa kami bantu?`
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors"
                                    title="Hubungi WhatsApp"
                                  >
                                    <Phone className="h-3 w-3" />
                                    <span>Chat WA</span>
                                  </a>

                                  <div className="flex items-center gap-1">
                                    {/* Action: Jadwalkan Survey */}
                                    <button
                                      onClick={() => handleOpenScheduleForLead(lead)}
                                      title="Jadwalkan Survey"
                                      className="rounded-full p-1.5 text-neutral-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400 transition-colors"
                                    >
                                      <Calendar className="h-3.5 w-3.5" />
                                    </button>

                                    {/* Action: Convert to Tenant if won or ready */}
                                    {lead.status === "won" && (
                                      <button
                                        onClick={() => handleOpenConvertForLead(lead)}
                                        title="Konversi Jadi Penghuni Resmi"
                                        className="flex items-center gap-1 rounded-full bg-[#D9FF43] px-2 py-0.5 text-[10px] font-black text-[#0A0A0A] hover:scale-105 transition-all shadow-xs"
                                      >
                                        <Sparkles className="h-3 w-3" />
                                        <span>Penghuni</span>
                                      </button>
                                    )}

                                    {/* Action: Edit */}
                                    <button
                                      onClick={() => {
                                        setLeadToEdit(lead);
                                        setIsLeadModalOpen(true);
                                      }}
                                      title="Edit Data Lead"
                                      className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-300 transition-colors"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </button>

                                    {/* Action: Delete */}
                                    <button
                                      onClick={() => handleDeleteLead(lead)}
                                      title="Hapus Lead"
                                      className="rounded-full p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Add Lead in this Stage Button */}
                      <div className="p-2 border-t border-neutral-200/60 dark:border-white/10">
                        <button
                          onClick={() => {
                            setLeadToEdit({
                              id: "",
                              property_id: "a0000000-0000-0000-0000-000000000001",
                              name: "",
                              phone: "",
                              channel: "whatsapp",
                              status: stage.id,
                              is_warm: false,
                              created_at: new Date().toISOString(),
                            });
                            setIsLeadModalOpen(true);
                          }}
                          className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl text-[11px] font-bold text-neutral-600 dark:text-neutral-400 hover:bg-white/80 dark:hover:bg-neutral-800/80 hover:text-neutral-900 dark:hover:text-white transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Tambah di tahap ini</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 2. TABLE VIEW (DAFTAR TABEL)                             */}
          {/* ======================================================== */}
          {viewMode === "table" && (
            <div className="space-y-4">
              {/* Filter Chips for Status */}
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
                  Terjadwal Survey (
                  {leads.filter((l) => l.status === "survey_scheduled").length})
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

              {/* Table Container */}
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
                          <td
                            colSpan={6}
                            className="py-12 text-center text-neutral-400"
                          >
                            Tidak ada data calon penghuni yang cocok dengan pencarian/filter.
                          </td>
                        </tr>
                      ) : (
                        filteredLeads.map((lead) => {
                          const cleanDigits = lead.phone.replace(/\D/g, "");
                          const isOverdueFollowUp =
                            lead.follow_up_at &&
                            new Date(lead.follow_up_at) <= new Date();

                          return (
                            <tr
                              key={lead.id}
                              className="transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40"
                            >
                              {/* Nama & Warm Flag */}
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  {lead.is_warm && (
                                    <span
                                      title="Warm Lead (Prioritas)"
                                      className="text-base"
                                    >
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
                                  href={`https://wa.me/${cleanDigits}?text=${encodeURIComponent(
                                    `Halo Kak ${lead.name}, salam dari Kost Putri Graha Asri Margonda.`
                                  )}`}
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
                              <td className="px-5 py-4">
                                {renderLeadStatusBadge(lead.status)}
                              </td>

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
                                      <span>
                                        {formatDateTimeIndo(lead.follow_up_at)}
                                      </span>
                                      {isOverdueFollowUp && (
                                        <span className="text-[9px] px-1 py-0.2 rounded bg-rose-100 text-rose-700 font-bold dark:bg-rose-950 dark:text-rose-300">
                                          Lewat
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-neutral-400 text-[11px]">
                                      Belum dijadwalkan
                                    </span>
                                  )}
                                  <span className="text-[10px] text-neutral-400 mt-0.5">
                                    Staff: {lead.assigned_staff_name || "—"}
                                  </span>
                                </div>
                              </td>

                              {/* Aksi */}
                              <td className="px-5 py-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {lead.status === "won" && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleOpenConvertForLead(lead)}
                                      className="h-7 px-2.5 text-[11px] font-bold gap-1 rounded-full bg-[#D9FF43] text-[#0A0A0A] hover:bg-[#c9ef30]"
                                      title="Konversi Jadi Penghuni"
                                    >
                                      <Sparkles className="h-3.5 w-3.5" />
                                      <span className="hidden sm:inline">
                                        Penghuni
                                      </span>
                                    </Button>
                                  )}

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenScheduleForLead(lead)}
                                    className="h-7 px-2.5 text-[11px] font-bold gap-1 rounded-full border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700"
                                    title="Jadwalkan Survey Kamar"
                                  >
                                    <Calendar className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                                    <span className="hidden sm:inline">
                                      Survey
                                    </span>
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
        </div>
      )}

      {/* SUB-TAB 2: JADWAL SURVEY */}
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
                        <td
                          colSpan={6}
                          className="py-8 text-center text-neutral-400"
                        >
                          Tidak ada survey mendatang yang sedang dijadwalkan.
                        </td>
                      </tr>
                    ) : (
                      upcomingSurveys.map((survey) => {
                        const cleanDigits = survey.lead_phone
                          ? survey.lead_phone.replace(/\D/g, "")
                          : "";
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
                                    href={`https://wa.me/${cleanDigits}?text=${encodeURIComponent(
                                      `Halo Kak ${survey.lead_name}, kami dari Kost Putri Graha Asri mengonfirmasi jadwal survey kamar Anda pada ${formatDateTimeIndo(
                                        survey.scheduled_at
                                      )}.`
                                    )}`}
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
                                <span>
                                  {formatDateTimeIndo(survey.scheduled_at)}
                                </span>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-5 py-4">
                              {renderSurveyStatusBadge(survey.status)}
                            </td>

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
                                    onClick={() =>
                                      handleUpdateSurveyStatus(
                                        survey.id,
                                        "confirmed"
                                      )
                                    }
                                    className="h-7 px-2.5 text-[11px] font-bold rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    <span>Konfirmasi</span>
                                  </Button>
                                )}

                                {survey.status === "confirmed" && (
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleUpdateSurveyStatus(
                                        survey.id,
                                        "completed"
                                      )
                                    }
                                    className="h-7 px-2.5 text-[11px] font-bold rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    <span>Selesai</span>
                                  </Button>
                                )}

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleUpdateSurveyStatus(
                                      survey.id,
                                      "no_show"
                                    )
                                  }
                                  className="h-7 px-2 text-[11px] font-semibold rounded-full border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400"
                                >
                                  No-show
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleUpdateSurveyStatus(
                                      survey.id,
                                      "cancelled"
                                    )
                                  }
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
                        <td
                          colSpan={6}
                          className="py-8 text-center text-neutral-400"
                        >
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
                            {survey.room_number
                              ? `Kamar ${survey.room_number}`
                              : "—"}
                          </td>

                          <td className="px-5 py-4 text-neutral-600 dark:text-neutral-300">
                            {formatDateTimeIndo(survey.scheduled_at)}
                          </td>

                          <td className="px-5 py-4">
                            {renderSurveyStatusBadge(survey.status)}
                          </td>

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

      <ConvertToTenantModal
        isOpen={isConvertModalOpen}
        onClose={() => {
          setIsConvertModalOpen(false);
          setLeadToConvert(null);
        }}
        lead={leadToConvert}
        onSuccess={loadData}
      />
    </div>
  );
}

export default LeadsView;
