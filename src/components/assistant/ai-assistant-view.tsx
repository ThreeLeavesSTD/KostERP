"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  Sparkles,
  Send,
  User,
  Zap,
  Building2,
  DollarSign,
  Receipt,
  Users,
  Copy,
  Check,
  ArrowRight,
  ArrowUpRight,
  Trash2,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  ShieldCheck,
  Phone,
  Settings,
  RefreshCw,
  ExternalLink,
  Wifi,
  WifiOff,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { KostApiClient } from "@/lib/api-client";
import { formatRupiah, formatDateIndo, formatTokenPLN } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { notify } from "@/lib/notify";
import { sendChatbotMessageToN8n } from "@/lib/n8n/webhook-client";

const DEFAULT_WEBHOOK_URL =
  process.env.NEXT_PUBLIC_N8N_WEBHOOK_CHATBOT ||
  "https://n8n.noud.web.id/webhook-test/kostChatbotz";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  source?: "n8n_webhook" | "local_concierge" | "connection_error";
  actionType?: "rooms" | "invoices" | "electricity" | "revenue" | "cashflow" | "general";
  actionData?: any;
}

interface AIAssistantViewProps {
  initialPrompt?: string;
  onNavigateTab?: (tab: string) => void;
  onClearInitialPrompt?: () => void;
}

export function AIAssistantView({
  initialPrompt,
  onNavigateTab,
  onClearInitialPrompt,
}: AIAssistantViewProps) {
  const [webhookUrl, setWebhookUrl] = useState(DEFAULT_WEBHOOK_URL);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "standby" | "disconnected" | "checking" | "warning"
  >("standby");
  const [testResult, setTestResult] = useState<{
    status: "success" | "warning" | "error";
    message: string;
  } | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-welcome",
      sender: "assistant",
      text: "Halo! Saya **Kost Concierge AI**, asisten cerdas untuk operasional properti dan otomasi penagihan sewa kost Anda. Terhubung langsung dengan webhook n8n (*kostChatbotz*). Ada yang bisa saya bantu hari ini?",
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      source: "n8n_webhook",
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load custom webhook from localStorage if previously configured
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("kost_n8n_chatbot_webhook");
      if (saved && saved.trim()) {
        setWebhookUrl(saved.trim());
      }
    }
  }, []);

  const handleSelectPreset = (url: string) => {
    setWebhookUrl(url);
    if (typeof window !== "undefined") {
      localStorage.setItem("kost_n8n_chatbot_webhook", url);
    }
    notify.success(
      "Target Webhook Diperbarui",
      url.includes("webhook-test")
        ? "Beralih ke Mode Test (/webhook-test/kostChatbotz)"
        : "Beralih ke Mode Production (/webhook/kostChatbotz)"
    );
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Handle incoming initial prompt from dashboard quick assistant
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleUserSubmit(initialPrompt.trim());
      if (onClearInitialPrompt) {
        onClearInitialPrompt();
      }
    }
  }, [initialPrompt]);

  const quickPrompts = [
    {
      label: "Kamar Kosong Siap Huni",
      icon: Building2,
      query: "Cek kamar yang masih kosong dan siap huni",
    },
    {
      label: "Tagihan Belum Lunas",
      icon: Receipt,
      query: "Cek daftar tagihan sewa yang belum dibayar",
    },
    {
      label: "Laba Bersih Token Listrik",
      icon: Zap,
      query: "Berapa keuntungan distribusi token listrik bulan ini?",
    },
    {
      label: "Keluhan Penghuni WA AI",
      icon: MessageSquare,
      query: "Cek laporan keluhan penghuni yang dicatat CS AI dari WhatsApp",
    },
    {
      label: "Ringkasan Arus Kas & Revenue",
      icon: DollarSign,
      query: "Tampilkan ringkasan pendapatan dan okupansi kost",
    },
  ];

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generateAIResponse = async (query: string): Promise<Omit<Message, "id" | "timestamp">> => {
    const q = query.toLowerCase();
    const [rooms, invoices, metrics, electricity, complaints, cash] = await Promise.all([
      KostApiClient.getRooms().catch(() => []),
      KostApiClient.getInvoices().catch(() => []),
      KostApiClient.getDashboardSummary().catch(() => null),
      KostApiClient.getElectricityTransactions().catch(() => []),
      KostApiClient.getComplaints().catch(() => []),
      KostApiClient.getCashTransactions().catch(() => []),
    ]);

    // 1. Check vacant / available rooms
    if (q.includes("kamar") && (q.includes("kosong") || q.includes("tersedia") || q.includes("siap huni"))) {
      const availableRooms = rooms.filter((r) => r.status === "available");
      if (availableRooms.length === 0) {
        return {
          sender: "assistant",
          text: `Saat ini seluruh unit kamar sedang **penuh / terisi** (Tingkat Okupansi 100%). Tidak ada kamar kosong yang siap huni.`,
          actionType: "rooms",
        };
      }
      return {
        sender: "assistant",
        text: `Terdapat **${availableRooms.length} kamar kosong siap huni** dari total ${rooms.length} unit. Berikut rinciannya:`,
        actionType: "rooms",
        actionData: availableRooms,
      };
    }

    // 2. Check unpaid invoices / reminders
    if (q.includes("tagihan") || q.includes("invoice") || q.includes("tunggakan") || q.includes("belum bayar") || q.includes("jatuh tempo")) {
      const unpaidInvoices = invoices.filter((i) => i.status === "unpaid" || i.status === "overdue");
      if (unpaidInvoices.length === 0) {
        return {
          sender: "assistant",
          text: `Kabar baik! Seluruh tagihan sewa periode ini telah **Lunas 100%**. Tidak ada tunggakan sewa yang tertunda.`,
          actionType: "invoices",
        };
      }
      return {
        sender: "assistant",
        text: `Ditemukan **${unpaidInvoices.length} tagihan sewa belum lunas** dengan total nilai **${formatRupiah(metrics?.totalUnpaidAmount || 0)}**. Anda dapat langsung menyalin format pengingat WhatsApp atau membuka modul billing:`,
        actionType: "invoices",
        actionData: unpaidInvoices,
      };
    }

    // 3. Check electricity tokens & profit
    if (q.includes("token") || q.includes("listrik") || q.includes("pln")) {
      return {
        sender: "assistant",
        text: `📊 **Analitik Distribusi Token Listrik PLN:**\n\n• Total Transaksi: **${metrics?.electricityTransactionsCount || electricity.length} transaksi**\n• Akumulasi Laba Bersih: **+${formatRupiah(metrics?.electricityProfitTotal || 0)}**\n• Margin Rata-rata: **Rp 2.000 - Rp 3.000 / transaksi**\n\nIntegrasi webhook n8n siap mengirimkan 20 digit kode token langsung ke WhatsApp penghuni secara otomatis.`,
        actionType: "electricity",
        actionData: electricity.slice(0, 3),
      };
    }

    // 4. Check complaints / WhatsApp CS AI tickets
    if (q.includes("keluhan") || q.includes("komplain") || q.includes("rusak") || q.includes("bocor") || q.includes("cs ai") || q.includes("tiket")) {
      const pendingComplaints = complaints.filter((c) => c.status === "pending" || c.status === "in_progress");
      if (pendingComplaints.length === 0) {
        return {
          sender: "assistant",
          text: `Semua keluhan penghuni via WhatsApp CS AI telah **selesai ditangani** ✅. Tidak ada tiket aktif yang tertunda.`,
          actionType: "general",
        };
      }
      const summaryList = pendingComplaints
        .map(
          (c) =>
            `• **Kamar ${c.room_number}** (${c.tenant_name.split(" ")[0]}): *"${c.ai_extracted_summary}"* [${c.priority.toUpperCase()}]`
        )
        .join("\n");

      return {
        sender: "assistant",
        text: `🚨 Ditemukan **${pendingComplaints.length} keluhan penghuni aktif** yang dicatat otomatis oleh CS AI via WhatsApp ke database Supabase:\n\n${summaryList}\n\nAnda dapat membuka menu **Manajemen Kamar** untuk melihat rincian riwayat chat WhatsApp dan menugaskan teknisi.`,
        actionType: "rooms",
      };
    }

    // 5. Check operational cashflow & expenses
    if (
      q.includes("kas") ||
      q.includes("pengeluaran") ||
      q.includes("expense") ||
      q.includes("pemasukan") ||
      q.includes("biaya operasional") ||
      q.includes("saldo")
    ) {
      let totalIncome = 0;
      let totalExpense = 0;
      cash.forEach((c) => {
        if (c.type === "income") totalIncome += c.amount;
        else totalExpense += c.amount;
      });
      const netCashFlow = totalIncome - totalExpense;

      return {
        sender: "assistant",
        text: `💼 **Rekapitulasi Kas Operasional & Pembukuan:**\n\n• Total Pemasukan: **${formatRupiah(totalIncome)}**\n• Total Pengeluaran: **${formatRupiah(totalExpense)}**\n• Arus Kas Bersih (Net): **${netCashFlow >= 0 ? `+${formatRupiah(netCashFlow)}` : formatRupiah(netCashFlow)}** (${netCashFlow >= 0 ? "Surplus ✅" : "Defisit ⚠️"})\n• Estimasi Saldo Kas Berjalan: **${formatRupiah(netCashFlow)}**\n\nAnda dapat membuka modul **Kas Operasional** untuk mencatat transaksi baru atau mengunduh laporan CSV.`,
        actionType: "cashflow",
      };
    }

    // 6. Check revenue & occupancy cashflow
    if (q.includes("pendapatan") || q.includes("revenue") || q.includes("arus kas") || q.includes("okupansi") || q.includes("laba") || q.includes("keuangan")) {
      return {
        sender: "assistant",
        text: `📈 **Ringkasan Finansial & Okupansi Properti:**\n\n• Tingkat Okupansi: **${metrics?.occupancyRate || 0}%** (${metrics?.occupiedRooms || 0}/${metrics?.totalRooms || 0} Kamar Terisi)\n• Penerimaan Terverifikasi: **${formatRupiah(metrics?.currentMonthRevenue || 0)}**\n• Target Bulanan: **${formatRupiah(metrics?.targetMonthlyRevenue || 0)}**\n• Laba Bersih Token PLN: **+${formatRupiah(metrics?.electricityProfitTotal || 0)}**\n• Piutang Tertunda: **${formatRupiah(metrics?.totalUnpaidAmount || 0)}**`,
        actionType: "revenue",
      };
    }

    // 7. Default intelligent assistant reply
    return {
      sender: "assistant",
      text: `Saya telah memproses permintaan Anda: *"${query}"*.\n\nSebagai Asisten ERP Kost, saya dapat membantu Anda untuk:\n1. 🏠 Mengecek ketersediaan kamar & fasilitas.\n2. 💼 Mencatat & merekap kas operasional (Expense & Income).\n3. 📄 Membuat & memantau tagihan sewa otomatis via WhatsApp.\n4. ⚡ Mengelola distribusi token PLN dengan kalkulator margin.\n5. 📊 Menyajikan laporan keuangan & ekspor Excel / CSV.\n\nSilakan pilih salah satu opsi cepat di bawah atau ketik instruksi spesifik Anda.`,
      actionType: "general",
    };
  };

  const handleTestWebhook = async () => {
    setIsTestingWebhook(true);
    setTestResult(null);
    setConnectionStatus("checking");
    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Ping connection test from Kost Concierge ERP",
          webhook_url: webhookUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConnectionStatus("connected");
        setTestResult({
          status: "success",
          message: `Koneksi Berhasil! Webhook n8n AI merespons: "${typeof data.reply === "string" ? data.reply.slice(0, 100) : "OK"}"`,
        });
        notify.success("n8n AI Terhubung", "Workflow n8n aktif dan merespons dengan sukses.");
      } else if (data.isTestInactive) {
        setConnectionStatus("standby");
        setTestResult({
          status: "warning",
          message: `Webhook Test Standby (Status 404): Alur n8n belum di-trigger. Klik tombol 'Execute workflow' pada kanvas n8n Anda lalu coba lagi.`,
        });
        notify.warning("Mode Test Standby", "Klik 'Execute workflow' di kanvas n8n.");
      } else if (data.isNoItemFound) {
        setConnectionStatus("warning");
        setTestResult({
          status: "warning",
          message: `Webhook n8n menerima request, namun alur n8n mengembalikan status 'No item to return was found'. Pastikan alur n8n Anda terhubung ke node 'Respond to Webhook' atau AI Agent.`,
        });
        notify.warning("No Item Returned", "Periksa node output/Respond to Webhook di n8n.");
      } else {
        setConnectionStatus("disconnected");
        setTestResult({
          status: "error",
          message: data.error || data.hint || "Gagal menghubungkan ke webhook n8n.",
        });
        notify.error("Koneksi Gagal", data.error || "Gagal menghubungi n8n.");
      }
    } catch (err: unknown) {
      setConnectionStatus("disconnected");
      const msg = err instanceof Error ? err.message : "Error saat ping test";
      setTestResult({
        status: "error",
        message: msg,
      });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handleSaveWebhookConfig = () => {
    if (!webhookUrl.trim()) {
      notify.error("URL Kosong", "Masukkan URL webhook n8n yang valid.");
      return;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("kost_n8n_chatbot_webhook", webhookUrl.trim());
    }
    notify.success("Konfigurasi Tersimpan", `Webhook n8n chatbot diperbarui ke: ${webhookUrl.trim()}`);
    setIsConfigModalOpen(false);
  };

  const handleUserSubmit = async (userText: string) => {
    if (!userText.trim()) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setIsTyping(true);

    try {
      // 1. Fetch live metrics & property context to send along with prompt to n8n
      const [rooms, invoices, metrics, electricity, complaints, cash] = await Promise.all([
        KostApiClient.getRooms().catch(() => []),
        KostApiClient.getInvoices().catch(() => []),
        KostApiClient.getDashboardSummary().catch(() => null),
        KostApiClient.getElectricityTransactions().catch(() => []),
        KostApiClient.getComplaints().catch(() => []),
        KostApiClient.getCashTransactions().catch(() => []),
      ]);

      const contextPayload = {
        totalRooms: rooms.length,
        availableRooms: rooms.filter((r) => r.status === "available").length,
        occupiedRooms: rooms.filter((r) => r.status === "occupied").length,
        unpaidInvoicesCount: invoices.filter((i) => i.status === "unpaid" || i.status === "overdue").length,
        totalUnpaidAmount: metrics?.totalUnpaidAmount || 0,
        occupancyRate: metrics?.occupancyRate || 0,
        electricityTransactionsCount: electricity.length,
        activeComplaintsCount: complaints.filter((c) => c.status === "pending" || c.status === "in_progress").length,
      };

      // 2. Dispatch query to n8n Webhook
      const n8nRes = await sendChatbotMessageToN8n(userText, contextPayload, webhookUrl);

      if (n8nRes.success && n8nRes.reply) {
        setConnectionStatus("connected");
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          sender: "assistant",
          text: n8nRes.reply,
          source: "n8n_webhook",
          actionType: n8nRes.actionType,
          actionData: n8nRes.actionData,
          timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, aiMsg]);
        return;
      }

      // 3. Jika n8n gagal / tidak tersambung: JANGAN PAKAI BALASAN SEMENTARA, TAMPILKAN KONEKSI TERPUTUS
      setConnectionStatus("disconnected");

      let disconnectText = "";
      if (n8nRes.isTestInactive) {
        disconnectText = `🔴 **Koneksi Terputus: Webhook n8n Belum Aktif (404)**\n\nAlur kerja n8n pada endpoint \`${webhookUrl}\` saat ini tidak aktif atau belum siap menerima trigger.\n\n👉 **Langkah Penanganan:**\n1. Buka kanvas n8n Anda (*kostChatbotz*).\n2. Klik tombol **'Execute workflow'** di kanvas n8n jika menggunakan Mode Test, atau aktifkan toggle **Active = ON** di pojok kanan atas.\n3. Kirim kembali pesan Anda untuk memproses melalui AI Agent n8n.`;
      } else if (n8nRes.isNoItemFound) {
        disconnectText = `🔴 **Koneksi Terputus: Tidak Ada Respon Dari Alur n8n**\n\nPesan terkirim ke webhook n8n, namun alur kerja n8n selesai tanpa mengembalikan data balasan (*No item to return was found*).\n\n👉 **Langkah Penanganan:**\nPastikan node **AI Agent** (*Beebee Agent*) atau LLM Anda terhubung ke node **'Respond to Webhook'** di kanvas n8n.`;
      } else if (n8nRes.error || n8nRes.status) {
        const errorDetail = n8nRes.error || n8nRes.hint || "Terjadi error pada alur kerja n8n.";
        disconnectText = `🔴 **Koneksi Terputus: Terjadi Error pada Alur n8n (${n8nRes.status || 500})**\n\nWebhook n8n menerima request, namun terjadi error saat dieksekusi oleh AI Agent (*Beebee Agent*).\n\n⚠️ **Rincian Error n8n:**\n\`\`\`\n${errorDetail.slice(0, 300)}\n\`\`\`\n👉 **Langkah Penanganan:**\n1. Buka alur kerja n8n Anda di browser.\n2. Buka tab **Executions** untuk melihat node yang mengalami error (bertanda silang merah ❌).\n3. Pastikan konfigurasi Model AI (Gemini), Chat Memory, dan Tool terhubung dengan benar.`;
      } else {
        disconnectText = `🔴 **Koneksi Terputus ke AI Agent n8n**\n\nTidak dapat terhubung ke webhook n8n: \`${webhookUrl}\`.\n\n👉 Pastikan server n8n Anda aktif dan dapat diakses dari jaringan ini.`;
      }

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: "assistant",
        text: disconnectText,
        source: "connection_error",
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: unknown) {
      setConnectionStatus("disconnected");
      const errMsg = err instanceof Error ? err.message : "Network error";
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: "assistant",
        text: `🔴 **Koneksi Terputus: Gagal Menghubungi Host n8n**\n\nTerjadi kegagalan jaringan saat menghubungi \`${webhookUrl}\`:\n*${errMsg}*.\n\n👉 Periksa koneksi internet Anda atau pastikan domain/server n8n sedang berjalan.`,
        source: "connection_error",
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearChat = async () => {
    const ok = await notify.confirm({
      title: "Bersihkan Riwayat Chat?",
      message: "Seluruh riwayat obrolan dengan AI Assistant akan direset.",
      variant: "danger",
      confirmText: "Ya, Bersihkan",
      cancelText: "Batal",
    });
    if (ok) {
      setMessages([
        {
          id: "msg-welcome-fresh",
          sender: "assistant",
          text: "Riwayat chat telah dibersihkan. Ada yang bisa saya bantu terkait operasional kost Anda?",
          timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          source: "n8n_webhook",
        },
      ]);
      notify.success("Riwayat Dibersihkan", "Chatbot AI telah direset ke kondisi awal.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
              Kost Concierge AI Assistant
            </h2>
            <button
              onClick={handleTestWebhook}
              className="inline-flex items-center gap-1.5 rounded-full border border-lime-500/30 bg-[#D9FF43] px-3 py-1 text-xs font-black text-neutral-900 shadow-lime-glow hover:bg-[#c8f032] transition-colors"
              title="Klik untuk tes koneksi Webhook n8n"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  connectionStatus === "connected"
                    ? "bg-emerald-600 animate-pulse"
                    : connectionStatus === "standby"
                    ? "bg-amber-600 animate-pulse"
                    : "bg-rose-600"
                }`}
              />
              <span>n8n: {webhookUrl.includes("kostChatbotz") ? "kostChatbotz" : "Connected"}</span>
              <RefreshCw className={`h-3 w-3 ml-0.5 ${isTestingWebhook ? "animate-spin" : ""}`} />
            </button>
          </div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
            Asisten cerdas terhubung ke webhook n8n untuk otomasi operasional properti dan percakapan AI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsConfigModalOpen(true)}
            className="gap-1.5 text-xs font-bold text-neutral-700 dark:text-neutral-300"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Webhook Settings</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleClearChat}
            className="gap-1.5 text-xs font-bold text-neutral-600 hover:text-rose-600 dark:text-neutral-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Chat</span>
          </Button>
        </div>
      </div>

      {/* Main Spatial Bento Chat Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 4 Cols: Assistant Capabilities & Knowledge Card */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Interactive n8n AI Webhook Connection Panel */}
          <div className="rounded-3xl bg-[#0A0A0A] p-5 text-white shadow-spatial border border-neutral-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-2xl bg-[#D9FF43] flex items-center justify-center text-neutral-900 shadow-lime-glow">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black tracking-tight text-white">
                    Koneksi AI Webhook n8n
                  </h4>
                  <p className="text-[10px] text-neutral-400 font-medium">
                    Hubungkan AI Agent ke Chatbot
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold border ${
                  connectionStatus === "connected"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : connectionStatus === "standby"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    : connectionStatus === "disconnected"
                    ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                    : "bg-neutral-800 text-neutral-400 border-neutral-700"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    connectionStatus === "connected"
                      ? "bg-emerald-400 animate-pulse"
                      : connectionStatus === "standby"
                      ? "bg-amber-400 animate-pulse"
                      : connectionStatus === "disconnected"
                      ? "bg-rose-500 animate-pulse"
                      : "bg-neutral-500"
                  }`}
                />
                {connectionStatus === "connected"
                  ? "AI Connected"
                  : connectionStatus === "standby"
                  ? "Standby"
                  : connectionStatus === "disconnected"
                  ? "Koneksi Terputus"
                  : "Siap Terhubung"}
              </span>
            </div>

            {/* Webhook URL Input */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-neutral-400 font-semibold">
                <span>Endpoint Webhook:</span>
                <span className="text-[#D9FF43] font-mono">kostChatbotz</span>
              </div>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => {
                  setWebhookUrl(e.target.value);
                  if (typeof window !== "undefined") {
                    localStorage.setItem("kost_n8n_chatbot_webhook", e.target.value);
                  }
                }}
                placeholder="https://n8n.noud.web.id/webhook-test/kostChatbotz"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-[11px] font-mono text-neutral-200 focus:border-[#D9FF43] focus:outline-none"
              />
            </div>

            {/* Mode Toggles */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSelectPreset("https://n8n.noud.web.id/webhook-test/kostChatbotz")}
                className={`rounded-xl py-1.5 px-2 text-[10px] font-extrabold border transition-all text-center ${
                  webhookUrl.includes("webhook-test")
                    ? "border-[#D9FF43] bg-[#D9FF43] text-neutral-900 shadow-lime-glow"
                    : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
                }`}
              >
                🧪 Mode Test
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset("https://n8n.noud.web.id/webhook/kostChatbotz")}
                className={`rounded-xl py-1.5 px-2 text-[10px] font-extrabold border transition-all text-center ${
                  !webhookUrl.includes("webhook-test") && webhookUrl.includes("kostChatbotz")
                    ? "border-[#D9FF43] bg-[#D9FF43] text-neutral-900 shadow-lime-glow"
                    : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
                }`}
              >
                🚀 Mode Production
              </button>
            </div>

            {/* Ping Test Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isTestingWebhook}
              onClick={handleTestWebhook}
              className="w-full h-9 rounded-xl font-extrabold text-xs gap-1.5 border-neutral-700 bg-neutral-800 text-white hover:bg-[#D9FF43] hover:text-neutral-900 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isTestingWebhook ? "animate-spin" : ""}`} />
              <span>{isTestingWebhook ? "Menguji Koneksi n8n..." : "⚡ Hubungkan & Tes Webhook"}</span>
            </Button>

            {/* Live Test Feedback Banner */}
            {testResult && (
              <div
                className={`rounded-xl p-2.5 text-[11px] leading-snug border ${
                  testResult.status === "success"
                    ? "bg-emerald-950/70 border-emerald-800 text-emerald-300"
                    : testResult.status === "warning"
                    ? "bg-amber-950/70 border-amber-800 text-amber-300"
                    : "bg-rose-950/70 border-rose-800 text-rose-300"
                }`}
              >
                <div className="font-bold mb-0.5 flex items-center gap-1">
                  {testResult.status === "success"
                    ? "✅ AI Terhubung"
                    : testResult.status === "warning"
                    ? "🟡 Kanvas Standby"
                    : "❌ Gagal Terhubung"}
                </div>
                <p>{testResult.message}</p>
              </div>
            )}
          </div>

          {/* Assistant Info Bento Card */}
          <div className="rounded-3xl bg-[#0A0A0A] p-5 text-white shadow-spatial border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Status Properti:</span>
              <span className="font-bold text-white">Kost Putri Graha Asri</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Model Operasional:</span>
              <span className="font-bold text-[#D9FF43]">24/7 Concierge</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Integrasi Data:</span>
              <span className="font-bold text-white">Kamar, Billing & PLN</span>
            </div>
          </div>

          {/* Quick Prompts Bento Card */}
          <div className="rounded-3xl bg-white p-5 shadow-spatial border border-white/80 dark:bg-[#18181B] dark:border-white/10 flex-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-300" />
              <span>Menu Perintah Cepat</span>
            </h4>

            <div className="space-y-2">
              {quickPrompts.map((qp, idx) => {
                const Icon = qp.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleUserSubmit(qp.query)}
                    className="w-full flex items-center justify-between rounded-2xl bg-neutral-50 p-3 text-left text-xs font-bold text-neutral-800 hover:bg-[#D9FF43] hover:text-[#0A0A0A] transition-all dark:bg-neutral-800/60 dark:text-neutral-200 dark:hover:bg-[#D9FF43] dark:hover:text-[#0A0A0A]"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{qp.label}</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 opacity-60" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 8 Cols: Interactive Chat Conversation Feed */}
        <div className="lg:col-span-8 rounded-3xl bg-white shadow-spatial border border-white/80 dark:bg-[#18181B] dark:border-white/10 flex flex-col h-[640px] overflow-hidden">
          {/* Chat Messages Scroll Container */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {messages.map((msg) => {
              const isAssistant = msg.sender === "assistant";
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${
                    isAssistant ? "justify-start" : "justify-end"
                  }`}
                >
                  {isAssistant && (
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-xs mt-1 ${
                        msg.source === "connection_error"
                          ? "bg-rose-500 text-white shadow-rose-500/20"
                          : "bg-[#0A0A0A] text-[#D9FF43] dark:bg-white dark:text-[#0A0A0A]"
                      }`}
                    >
                      {msg.source === "connection_error" ? (
                        <WifiOff className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-3xl p-4 sm:p-5 text-xs shadow-xs ${
                      isAssistant
                        ? msg.source === "connection_error"
                          ? "bg-rose-50/80 text-rose-950 border border-rose-200/90 rounded-tl-sm dark:bg-rose-950/25 dark:text-rose-100 dark:border-rose-900/50"
                          : "bg-neutral-50 text-neutral-900 border border-neutral-100 rounded-tl-sm dark:bg-neutral-800/80 dark:text-white dark:border-white/5"
                        : "bg-[#0A0A0A] text-white rounded-tr-sm dark:bg-white dark:text-[#0A0A0A]"
                    }`}
                  >
                    {/* Header Timestamp */}
                    <div
                      className={`flex items-center justify-between mb-1.5 text-[10px] font-semibold ${
                        isAssistant ? "text-neutral-400" : "text-neutral-400 dark:text-neutral-500"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{isAssistant ? "Kost Concierge AI" : "Anda"}</span>
                        {isAssistant && msg.source === "n8n_webhook" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#D9FF43] px-2 py-0.5 text-[9px] font-black text-[#0A0A0A]">
                            <Sparkles className="h-2.5 w-2.5" /> n8n Live
                          </span>
                        )}
                        {isAssistant && msg.source === "connection_error" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 text-white px-2 py-0.5 text-[9px] font-black shadow-xs">
                            <WifiOff className="h-2.5 w-2.5" /> Koneksi Terputus
                          </span>
                        )}
                        {isAssistant && msg.source === "local_concierge" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 text-[9px] font-bold text-neutral-700 dark:text-neutral-300">
                            Concierge Fallback
                          </span>
                        )}
                      </div>
                      <span>{msg.timestamp}</span>
                    </div>

                    {/* Message Body */}
                    <p className="whitespace-pre-wrap leading-relaxed font-medium">
                      {msg.text}
                    </p>

                    {/* Interactive Action Card: Vacant Rooms */}
                    {msg.actionType === "rooms" && msg.actionData && (
                      <div className="mt-3.5 space-y-2 border-t border-neutral-200/80 pt-3 dark:border-white/10">
                        {msg.actionData.map((room: any) => (
                          <div
                            key={room.id}
                            className="flex items-center justify-between rounded-2xl bg-white p-3 border border-neutral-200/80 shadow-xs dark:bg-neutral-900 dark:border-neutral-700"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-neutral-900 dark:text-white text-sm">
                                  Kamar {room.room_number}
                                </span>
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  {room.room_type}
                                </span>
                              </div>
                              <p className="text-[11px] font-bold text-neutral-500 mt-0.5">
                                Tarif: {formatRupiah(room.base_price)}/bln · Lantai {room.floor}
                              </p>
                            </div>

                            <Button
                              size="sm"
                              variant="lime"
                              onClick={() => onNavigateTab && onNavigateTab("rooms")}
                              className="h-8 gap-1 text-[11px] font-bold shadow-xs"
                            >
                              <span>Check-in ↗</span>
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Interactive Action Card: Unpaid Invoices */}
                    {msg.actionType === "invoices" && msg.actionData && (
                      <div className="mt-3.5 space-y-2 border-t border-neutral-200/80 pt-3 dark:border-white/10">
                        {msg.actionData.slice(0, 3).map((inv: any) => (
                          <div
                            key={inv.id}
                            className="flex items-center justify-between rounded-2xl bg-white p-3 border border-neutral-200/80 shadow-xs dark:bg-neutral-900 dark:border-neutral-700"
                          >
                            <div>
                              <p className="font-extrabold text-neutral-900 dark:text-white text-xs">
                                Kamar {inv.room_number} · {inv.tenant_name}
                              </p>
                              <p className="text-[10px] text-rose-600 font-bold mt-0.5">
                                Tagihan: {formatRupiah(inv.total_amount)} (Jatuh tempo: {formatDateIndo(inv.due_date)})
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() =>
                                  handleCopyText(
                                    `Halo Kak ${inv.tenant_name} (Kamar ${inv.room_number}), pengingat tagihan sewa kost sebesar ${formatRupiah(inv.total_amount)} telah terbit dengan jatuh tempo ${inv.due_date}. Mohon konfirmasi pembayaran. Terima kasih!`,
                                    inv.id
                                  )
                                }
                                className="rounded-xl border border-neutral-200 bg-neutral-50 p-2 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                                title="Salin Pesan WA"
                              >
                                {copiedId === inv.id ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>

                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => onNavigateTab && onNavigateTab("billing")}
                                className="h-8 text-[11px] font-bold"
                              >
                                <span>Kirim WA ⚡</span>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Interactive Action: Cash Flow Deep Link */}
                    {msg.actionType === "cashflow" && (
                      <div className="mt-3 pt-3 border-t border-neutral-200/80 dark:border-white/10 flex justify-end">
                        <Button
                          size="sm"
                          variant="lime"
                          onClick={() => onNavigateTab && onNavigateTab("cashflow")}
                          className="h-8 text-xs font-black shadow-lime-glow"
                        >
                          <span>Buka Menu Kas Operasional ↗</span>
                        </Button>
                      </div>
                    )}
                  </div>

                  {!isAssistant && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-white mt-1 font-bold text-xs">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#0A0A0A] text-[#D9FF43]">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-3xl rounded-tl-sm bg-neutral-50 p-4 border border-neutral-100 text-xs font-semibold text-neutral-500 dark:bg-neutral-800/80 dark:border-white/5 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#0A0A0A] dark:bg-[#D9FF43] animate-bounce" />
                  <span className="h-2 w-2 rounded-full bg-[#0A0A0A] dark:bg-[#D9FF43] animate-bounce [animation-delay:0.2s]" />
                  <span className="h-2 w-2 rounded-full bg-[#0A0A0A] dark:bg-[#D9FF43] animate-bounce [animation-delay:0.4s]" />
                  <span className="ml-2 text-neutral-400">Mengetik balasan cerdas...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input Bar */}
          <div className="p-4 border-t border-neutral-100 bg-neutral-50/50 dark:bg-neutral-900/50 dark:border-white/10">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUserSubmit(inputPrompt);
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Ketik instruksi operasional, tagihan sewa, atau pertanyaan..."
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  className="w-full rounded-full border border-neutral-200/80 bg-white py-3.5 pl-5 pr-12 text-xs font-medium shadow-spatial focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                />
              </div>

              <Button
                type="submit"
                variant="lime"
                disabled={!inputPrompt.trim()}
                className="h-11 px-5 rounded-full font-black text-xs gap-1.5 shadow-lime-glow shrink-0"
              >
                <span>Kirim</span>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Webhook Configuration & Testing Modal */}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title="Pengaturan Webhook n8n Chatbot"
        description="Konfigurasi URL webhook n8n untuk integrasi AI Concierge chatbot kost."
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Webhook Endpoint URL
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://n8n.noud.web.id/webhook-test/kostChatbotz"
                className="flex-1 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-xs font-mono dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              />
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
              Pilihan Cepat Target Webhook:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setWebhookUrl("https://n8n.noud.web.id/webhook-test/kostChatbotz")}
                className={`rounded-xl px-3 py-1.5 text-[11px] font-bold border transition-colors ${
                  webhookUrl.includes("webhook-test")
                    ? "border-[#D9FF43] bg-[#D9FF43]/20 text-neutral-900 dark:text-[#D9FF43]"
                    : "border-neutral-200 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                }`}
              >
                🧪 Mode Test (/webhook-test/kostChatbotz)
              </button>
              <button
                type="button"
                onClick={() => setWebhookUrl("https://n8n.noud.web.id/webhook/kostChatbotz")}
                className={`rounded-xl px-3 py-1.5 text-[11px] font-bold border transition-colors ${
                  !webhookUrl.includes("webhook-test") && webhookUrl.includes("kostChatbotz")
                    ? "border-[#D9FF43] bg-[#D9FF43]/20 text-neutral-900 dark:text-[#D9FF43]"
                    : "border-neutral-200 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                }`}
              >
                🚀 Mode Production (/webhook/kostChatbotz)
              </button>
            </div>
          </div>

          {/* Guide / Instruction Box */}
          <div className="rounded-2xl bg-amber-50 p-3.5 border border-amber-200/80 text-xs text-amber-900 dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-200 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Lightbulb className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Petunjuk Alur n8n:</span>
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800 dark:text-amber-300 pl-1">
              <li>
                Jika menggunakan <strong>Mode Test</strong>, buka canvas alur n8n Anda dan klik tombol <strong>&apos;Execute workflow&apos;</strong> sebelum mengetes.
              </li>
              <li>
                Jika ingin berjalan otomatis 24/7, aktifkan saklar <strong>&apos;Active&apos; (ON)</strong> di pojok kanan atas n8n dan pilih <strong>Mode Production</strong>.
              </li>
            </ul>
          </div>

          {/* Test Ping Status */}
          {testResult && (
            <div
              className={`rounded-2xl p-3 text-xs font-medium border ${
                testResult.status === "success"
                  ? "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900"
                  : testResult.status === "warning"
                  ? "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900"
                  : "bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900"
              }`}
            >
              <p className="font-bold mb-0.5">
                {testResult.status === "success"
                  ? "✅ Tes Berhasil"
                  : testResult.status === "warning"
                  ? "⚠️ Menunggu Trigger Kanvas"
                  : "❌ Tes Gagal"}
              </p>
              <p className="text-[11px] leading-relaxed">{testResult.message}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isTestingWebhook}
              onClick={handleTestWebhook}
              className="gap-1.5 text-xs font-bold"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isTestingWebhook ? "animate-spin" : ""}`} />
              <span>{isTestingWebhook ? "Menguji..." : "Ping Test Webhook"}</span>
            </Button>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsConfigModalOpen(false)}
                className="text-xs"
              >
                Tutup
              </Button>
              <Button
                type="button"
                variant="lime"
                size="sm"
                onClick={handleSaveWebhookConfig}
                className="text-xs font-black shadow-lime-glow"
              >
                Simpan Konfigurasi
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
