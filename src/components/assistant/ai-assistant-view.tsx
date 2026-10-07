"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  Sparkles,
  Send,
  User,
  Zap,
  Building2,
  Receipt,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  WifiOff,
  Volume2,
  VolumeX,
  Info,
} from "lucide-react";
import { KostApiClient } from "@/lib/api-client";
import { formatRupiah, formatDateIndo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { sendChatbotMessageToN8n } from "@/lib/n8n/webhook-client";
import { AdaptiveMessageContent } from "@/components/assistant/adaptive-card";

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
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "standby" | "disconnected" | "checking" | "warning"
  >("connected");

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-welcome",
      sender: "assistant",
      text: "Halo! Saya **Kost Concierge AI**, asisten cerdas untuk otomasi operasional kost Anda. Terhubung langsung dengan sistem kamar, billing sewa, token listrik, dan n8n AI Agent. Ada yang bisa saya bantu hari ini?",
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      source: "n8n_webhook",
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [userName, setUserName] = useState("Pengelola Kost");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load user profile name if available
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("kost_user_profile");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.full_name || parsed.name) {
            setUserName(parsed.full_name || parsed.name);
          }
        }
      } catch {
        // Fallback default
      }
    }
  }, []);

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

  // Hero Quick Start Cards (3 Operational Cards matching Kost ERP Pro branding & features)
  const heroActionCards = [
    {
      title: "Kamar & Okupansi",
      desc: "Cek kamar kosong siap huni, fasilitas & okupansi unit.",
      query: "Cek kamar yang masih kosong dan siap huni",
      icon: Building2,
      sample: '“Cek kamar yang masih kosong dan siap huni”',
    },
    {
      title: "Tagihan & Piutang Sewa",
      desc: "Pantau invoice jatuh tempo & penagihan WhatsApp penghuni.",
      query: "Cek daftar tagihan sewa yang belum dibayar",
      icon: Receipt,
      sample: '“Cek daftar tagihan sewa yang belum dibayar”',
    },
    {
      title: "Distribusi Token Listrik",
      desc: "Hitung laba bersih token PLN & margin transaksi bulan ini.",
      query: "Berapa keuntungan distribusi token listrik bulan ini?",
      icon: Zap,
      sample: '“Berapa keuntungan distribusi token listrik bulan ini?”',
    },
  ];


  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    notify.success("Disalin", "Teks berhasil disalin ke clipboard.");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeakText = (text: string, id: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      notify.warning("Fitur Audio", "Browser Anda tidak mendukung text-to-speech.");
      return;
    }
    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`~[\]()]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "id-ID";
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const handleTestWebhook = async () => {
    setIsTestingWebhook(true);
    setConnectionStatus("checking");
    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Ping connection test from Kost Concierge ERP",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConnectionStatus("connected");
        notify.success("n8n AI Terhubung", "Workflow n8n aktif dan merespons dengan sukses.");
      } else if (data.isTestInactive) {
        setConnectionStatus("standby");
        notify.warning("Mode Test Standby", "Workflow n8n belum di-trigger atau sedang standby.");
      } else if (data.isNoItemFound) {
        setConnectionStatus("warning");
        notify.warning("No Item Returned", "Periksa node output/Respond to Webhook di alur n8n.");
      } else {
        setConnectionStatus("disconnected");
        notify.error("Koneksi Gagal", data.error || data.hint || "Gagal menghubungi n8n.");
      }
    } catch (err: unknown) {
      setConnectionStatus("disconnected");
      const msg = err instanceof Error ? err.message : "Error saat ping test";
      notify.error("Koneksi Gagal", msg);
    } finally {
      setIsTestingWebhook(false);
    }
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

      // 2. Dispatch query to n8n Webhook via env
      const n8nRes = await sendChatbotMessageToN8n(userText, contextPayload);

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

      // 3. Fallback jika alur n8n belum merespons
      setConnectionStatus("disconnected");
      let disconnectText = "";
      if (n8nRes.isTestInactive) {
        disconnectText = `🔴 **Koneksi Terputus: Webhook n8n Belum Aktif (404)**\n\nAlur kerja n8n saat ini tidak aktif atau belum siap menerima trigger.\n\n👉 **Langkah Penanganan:**\n1. Buka kanvas n8n Anda (*kostChatbotz*).\n2. Klik tombol **'Execute workflow'** jika menggunakan Mode Test, atau aktifkan **Active = ON** di n8n.\n3. Kirim kembali pesan Anda untuk memproses melalui AI Agent.`;
      } else if (n8nRes.isNoItemFound) {
        disconnectText = `🔴 **Koneksi Terputus: Tidak Ada Respon Dari Alur n8n**\n\nPesan terkirim ke webhook n8n, namun alur kerja n8n selesai tanpa mengembalikan data balasan (*No item to return was found*).\n\n👉 Pastikan node **AI Agent** atau LLM Anda terhubung ke node **'Respond to Webhook'** di kanvas n8n.`;
      } else if (n8nRes.error || n8nRes.status) {
        const errorDetail = n8nRes.error || n8nRes.hint || "Terjadi error pada alur kerja n8n.";
        disconnectText = `🔴 **Koneksi Terputus: Terjadi Error pada Alur n8n (${n8nRes.status || 500})**\n\nWebhook n8n menerima request, namun terjadi error saat dieksekusi oleh AI Agent.\n\n⚠️ **Rincian Error:**\n\`\`\`\n${errorDetail.slice(0, 300)}\n\`\`\`\n👉 Periksa tab **Executions** di n8n untuk melihat node yang mengalami error.`;
      } else {
        disconnectText = `🔴 **Koneksi Terputus ke AI Agent n8n**\n\nTidak dapat terhubung ke webhook n8n yang terkonfigurasi di file environment (.env).\n\n👉 Pastikan server n8n Anda aktif dan parameter N8N_WEBHOOK_CHATBOT di file env sudah benar.`;
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
        text: `🔴 **Koneksi Terputus: Gagal Menghubungi Host n8n**\n\nTerjadi kegagalan jaringan saat menghubungi webhook n8n:\n*${errMsg}*.\n\n👉 Periksa koneksi internet Anda atau pastikan server n8n sedang berjalan.`,
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
      title: "Bersihkan Percakapan?",
      message: "Seluruh riwayat obrolan dengan AI Assistant akan diulang dari awal.",
      variant: "danger",
      confirmText: "Ya, Bersihkan",
      cancelText: "Batal",
    });
    if (ok) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setSpeakingId(null);
      setMessages([
        {
          id: `msg-reset-${Date.now()}`,
          sender: "assistant",
          text: `Halo ${userName}! Percakapan telah diulang. Ada yang bisa saya bantu terkait operasional kost Anda?`,
          timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          source: "n8n_webhook",
        },
      ]);
      notify.success("Percakapan Diulang", "Chatbot AI telah direset ke kondisi awal.");
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-5 max-w-4xl lg:max-w-5xl mx-auto">
      {/* 1. Standalone Hero Quick Start Banner (Placed Outside Chat Window) */}
      <div className="w-full rounded-3xl bg-white dark:bg-[#0A0A0A] border border-neutral-200/90 dark:border-neutral-800 p-5 sm:p-6 shadow-sm text-neutral-900 dark:text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
              MULAI CEPAT & KONTROL OPERASIONAL
            </span>
            <h2 className="text-base sm:text-xl font-black tracking-tight text-neutral-900 dark:text-white mt-0.5">
              Apa yang ingin Anda kelola hari ini?
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">
              Asisten cerdas terhubung ke data kamar, penagihan sewa, distribusi token PLN, dan CS AI WhatsApp.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-extrabold text-neutral-800 dark:text-[#D9FF43] bg-neutral-100 dark:bg-[#161619] border border-neutral-200 dark:border-neutral-700 px-3.5 py-1.5 rounded-full shrink-0 shadow-xs self-start sm:self-center">
            <Zap className="h-3.5 w-3.5 fill-current text-[#0A0A0A] dark:text-[#D9FF43]" />
            <span>Otomasi n8n AI Real-Time</span>
          </div>
        </div>

        {/* 3 Horizontal Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3.5">
          {heroActionCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <button
                key={idx}
                onClick={() => handleUserSubmit(card.query)}
                className="group flex flex-col items-start text-left rounded-2xl border border-neutral-200 bg-neutral-50/70 dark:border-neutral-800 dark:bg-[#141417] p-3.5 transition-all hover:border-[#D9FF43] hover:shadow-lime-glow hover:-translate-y-0.5 cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0A0A0A] text-[#D9FF43] dark:bg-[#D9FF43] dark:text-[#0A0A0A] group-hover:scale-105 transition-transform shadow-xs">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-black text-neutral-900 dark:text-white tracking-tight">
                    {card.title}
                  </h4>
                </div>
                <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 leading-snug">
                  {card.desc}
                </p>
                <p className="text-[11px] font-bold text-neutral-900 dark:text-[#D9FF43] mt-2">
                  {card.sample}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Standalone Dedicated Chat Box Container */}
      <div className="w-full rounded-3xl bg-white dark:bg-[#0A0A0A] border border-neutral-200/90 dark:border-neutral-800 p-4 sm:p-6 shadow-spatial text-neutral-900 dark:text-white flex flex-col h-[580px] sm:h-[640px] overflow-hidden">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            {/* Brand Avatar Icon with Lime Accent */}
            <div className="relative flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0A0A0A] text-[#D9FF43] dark:bg-[#D9FF43] dark:text-[#0A0A0A] shadow-lime-glow">
              <Sparkles className="h-5 w-5 fill-current" />
              <span
                className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white dark:border-[#0A0A0A] ${
                  connectionStatus === "connected"
                    ? "bg-emerald-500 animate-pulse"
                    : connectionStatus === "standby"
                    ? "bg-amber-500"
                    : "bg-rose-500"
                }`}
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black tracking-tight text-neutral-900 dark:text-white">
                  Kost Concierge AI
                </h3>
                <span className="inline-flex items-center rounded-full border border-lime-500/40 bg-[#D9FF43]/20 px-2 py-0.5 text-[10px] font-black text-neutral-900 dark:text-[#D9FF43]">
                  AI OPERASIONAL
                </span>
              </div>
              <p className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>ONLINE & TERHUBUNG N8N</span>
              </p>
            </div>
          </div>

          {/* Right Header Actions: User Profile Pill, Ping Test & Reset Chat */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-[#141416] px-3.5 py-1.5 text-xs font-bold text-neutral-700 dark:text-neutral-300 shadow-xs">
              <div className="h-5 w-5 rounded-full bg-[#0A0A0A] text-[#D9FF43] dark:bg-[#D9FF43] dark:text-[#0A0A0A] flex items-center justify-center">
                <User className="h-3 w-3" />
              </div>
              <span className="text-xs font-semibold">{userName}</span>
            </div>

            <button
              onClick={handleTestWebhook}
              className="rounded-full border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-[#141416] p-2 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-[#D9FF43] transition-colors"
              title="Ping Test Webhook n8n"
            >
              <RefreshCw className={`h-4 w-4 ${isTestingWebhook ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={handleClearChat}
              className="rounded-full border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-[#141416] p-2 text-neutral-600 hover:text-rose-600 dark:text-neutral-400 dark:hover:text-rose-400 transition-colors"
              title="Ulangi Percakapan"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Dedicated Scrollable Chat Feed */}
        <div className="flex-1 min-h-0 overflow-y-auto py-3 space-y-4 pr-1.5 scroll-smooth">

          {/* Messages Feed */}
          {messages.map((msg) => {
            const isAssistant = msg.sender === "assistant";
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${
                  isAssistant ? "justify-start" : "justify-end"
                }`}
              >
                {/* Bot Avatar on Left */}
                {isAssistant && (
                  <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-[#0A0A0A] text-[#D9FF43] dark:bg-[#1A1A1E] dark:text-[#D9FF43] border border-neutral-200 dark:border-neutral-700 mt-1 shadow-xs">
                    {msg.source === "connection_error" ? (
                      <WifiOff className="h-4 w-4 text-rose-500" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                )}

                <div className="flex flex-col space-y-1.5 max-w-[85%]">
                  {/* Bubble Container */}
                  <div
                    className={`rounded-2xl p-4 text-xs sm:text-sm shadow-xs ${
                      isAssistant
                        ? msg.source === "connection_error"
                          ? "bg-rose-50 text-rose-950 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-100 dark:border-rose-900/60 rounded-tl-sm"
                          : "bg-neutral-50 text-neutral-900 border border-neutral-200 dark:bg-[#141417] dark:text-neutral-200 dark:border-neutral-800 rounded-tl-sm"
                        : "bg-[#0A0A0A] text-white rounded-tr-sm dark:bg-[#202024] dark:border dark:border-neutral-700 self-end"
                    }`}
                  >
                    {isAssistant ? (
                      <AdaptiveMessageContent
                        content={msg.text}
                        onNavigateTab={onNavigateTab}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed font-medium">
                        {msg.text}
                      </p>
                    )}

                    {/* Interactive Action Card: Vacant Rooms */}
                    {msg.actionType === "rooms" && msg.actionData && (
                      <div className="mt-3.5 space-y-2 border-t border-neutral-200 dark:border-neutral-800 pt-3">
                        {msg.actionData.map((room: any) => (
                          <div
                            key={room.id}
                            className="flex items-center justify-between rounded-xl bg-white dark:bg-[#0E0E10] p-3 border border-neutral-200 dark:border-neutral-800 shadow-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-neutral-900 dark:text-white text-sm">
                                  Kamar {room.room_number}
                                </span>
                                <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                  {room.room_type}
                                </span>
                              </div>
                              <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
                                Tarif: {formatRupiah(room.base_price)}/bln · Lantai {room.floor}
                              </p>
                            </div>

                            <Button
                              size="sm"
                              variant="lime"
                              onClick={() => onNavigateTab && onNavigateTab("rooms")}
                              className="h-8 gap-1 text-[11px] font-black shadow-lime-glow"
                            >
                              <span>Check-in ↗</span>
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Interactive Action Card: Unpaid Invoices */}
                    {msg.actionType === "invoices" && msg.actionData && (
                      <div className="mt-3.5 space-y-2 border-t border-neutral-200 dark:border-neutral-800 pt-3">
                        {msg.actionData.slice(0, 3).map((inv: any) => (
                          <div
                            key={inv.id}
                            className="flex items-center justify-between rounded-xl bg-white dark:bg-[#0E0E10] p-3 border border-neutral-200 dark:border-neutral-800 shadow-xs"
                          >
                            <div>
                              <p className="font-extrabold text-neutral-900 dark:text-white text-xs">
                                Kamar {inv.room_number} · {inv.tenant_name}
                              </p>
                              <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-0.5">
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
                                className="rounded-lg border border-neutral-200 bg-neutral-50 p-2 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                                title="Salin Pesan WA"
                              >
                                {copiedId === inv.id ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
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
                      <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
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

                  {/* Footer Action Icons: Timestamp, Salin, Baca */}
                  {isAssistant && (
                    <div className="flex items-center gap-3 px-1 text-[11px] text-neutral-500 font-medium">
                      <span>{msg.timestamp}</span>

                      <button
                        onClick={() => handleCopyText(msg.text, msg.id)}
                        className="flex items-center gap-1 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                        title="Salin teks balasan"
                      >
                        {copiedId === msg.id ? (
                          <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        <span>{copiedId === msg.id ? "Tersalin" : "Salin"}</span>
                      </button>

                      <button
                        onClick={() => handleSpeakText(msg.text, msg.id)}
                        className={`flex items-center gap-1 transition-colors cursor-pointer ${
                          speakingId === msg.id
                            ? "text-neutral-900 dark:text-[#D9FF43] font-bold"
                            : "hover:text-neutral-900 dark:hover:text-neutral-200"
                        }`}
                        title="Dengarkan teks balasan"
                      >
                        {speakingId === msg.id ? (
                          <VolumeX className="h-3 w-3" />
                        ) : (
                          <Volume2 className="h-3 w-3" />
                        )}
                        <span>{speakingId === msg.id ? "Berhenti" : "Baca"}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* User Avatar on Right */}
                {!isAssistant && (
                  <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-200 dark:bg-[#202024] text-neutral-700 dark:text-neutral-300 mt-1 text-xs font-bold border border-neutral-300 dark:border-neutral-700">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-[#0A0A0A] text-[#D9FF43] dark:bg-[#1A1A1E] dark:text-[#D9FF43]">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-neutral-50 dark:bg-[#141417] p-3.5 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#0A0A0A] dark:bg-[#D9FF43] animate-bounce" />
                <span className="h-2 w-2 rounded-full bg-[#0A0A0A] dark:bg-[#D9FF43] animate-bounce [animation-delay:0.2s]" />
                <span className="h-2 w-2 rounded-full bg-[#0A0A0A] dark:bg-[#D9FF43] animate-bounce [animation-delay:0.4s]" />
                <span className="ml-1">Sedang memproses instruksi kost...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 3. Bottom Pinned Section: Input Bar & Disclaimer */}
        <div className="shrink-0 pt-3 space-y-2 border-t border-neutral-100 dark:border-neutral-800/80">
          {/* Modern Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUserSubmit(inputPrompt);
            }}
            className="flex items-center rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#141417] p-1.5 pl-4 focus-within:border-[#D9FF43] focus-within:ring-2 focus-within:ring-[#D9FF43]/20 shadow-spatial transition-all gap-2"
          >
            <input
              type="text"
              placeholder="Ketik instruksi operasional, tagihan sewa, token listrik, atau pertanyaan..."
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              className="flex-1 bg-transparent text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none font-medium"
            />

            {/* Send Button with Electric Lime Glow */}
            <Button
              type="submit"
              disabled={!inputPrompt.trim() && isTyping}
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-[#D9FF43] hover:bg-[#c8f032] text-[#0A0A0A] p-0 flex items-center justify-center shrink-0 shadow-lime-glow transition-all font-black cursor-pointer border-none"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>

          {/* Disclaimer Footer */}
          <p className="text-[10px] sm:text-[11px] font-medium text-neutral-400 dark:text-neutral-500 text-center flex items-center justify-center gap-1.5 pt-0.5">
            <Info className="h-3 w-3" />
            <span>Kost Concierge AI terhubung ke database Supabase & webhook n8n. Harap verifikasi transaksi penting.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
