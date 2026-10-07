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
  Volume2,
  VolumeX,
  X,
  Maximize2,
  Minimize2,
  ChevronDown,
  MessageSquare,
  Radio,
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

interface FloatingAIChatbotProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
  onNavigateTab?: (tab: string) => void;
}

const DEFAULT_WELCOME_MESSAGE: Message = {
  id: "msg-welcome",
  sender: "assistant",
  text: "Halo! Saya **Kost Concierge AI**, asisten cerdas untuk operasional kost Anda. Tanyakan tentang kamar kosong, tagihan sewa, token listrik, atau keuangan kas kapan saja sambil membuka menu lain.",
  timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
  source: "n8n_webhook",
};

export function FloatingAIChatbot({
  isOpen,
  onToggle,
  onClose,
  initialPrompt,
  onClearInitialPrompt,
  onNavigateTab,
}: FloatingAIChatbotProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "standby" | "disconnected" | "checking" | "warning"
  >("connected");

  // Load saved session messages from localStorage if available
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("kost_ai_chat_session");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [DEFAULT_WELCOME_MESSAGE];
  });

  const [inputPrompt, setInputPrompt] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("kost_ai_chat_session", JSON.stringify(messages));
      } catch {}
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [messages, isTyping, isOpen]);

  // Handle incoming initial prompt from other components
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleUserSubmit(initialPrompt.trim());
      if (onClearInitialPrompt) {
        onClearInitialPrompt();
      }
    }
  }, [initialPrompt]);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    notify.success("Disalin", "Teks balasan disalin ke clipboard.");
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

  const handleClearHistory = () => {
    const fresh = [
      {
        ...DEFAULT_WELCOME_MESSAGE,
        id: `msg-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      },
    ];
    setMessages(fresh);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("kost_ai_chat_session");
      } catch {}
    }
    notify.success("Riwayat Dibersihkan", "Sesi chat telah disetel ulang.");
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
        notify.warning("No Item Returned", "Periksa node output/Respond to Webhook di n8n.");
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

      setConnectionStatus("disconnected");
      let disconnectText = "";
      if (n8nRes.isTestInactive) {
        disconnectText = `🔴 **Koneksi Terputus: Webhook n8n Belum Aktif (404)**\n\nAlur kerja n8n saat ini tidak aktif atau belum siap menerima trigger.\n\n👉 **Langkah:**\n1. Buka kanvas n8n Anda (*kostChatbotz*).\n2. Klik **'Execute workflow'** jika menggunakan Mode Test, atau aktifkan **Active = ON** di n8n.\n3. Kirim kembali pesan Anda.`;
      } else {
        disconnectText = `🔴 **Koneksi Terputus ke Server AI Agent**\n\nSistem tidak dapat terhubung ke webhook n8n (${n8nRes.error || "Gagal menjangkau server"}).\n\nSilakan periksa koneksi webhook n8n Anda.`;
      }

      const disconnectMsg: Message = {
        id: `ai-err-${Date.now()}`,
        sender: "assistant",
        text: disconnectText,
        source: "connection_error",
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, disconnectMsg]);
    } catch (err: any) {
      setConnectionStatus("disconnected");
      const errReply: Message = {
        id: `ai-err-${Date.now()}`,
        sender: "assistant",
        text: `🔴 **Koneksi Terputus:** ${err.message || "Gagal memproses permintaan."}`,
        source: "connection_error",
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errReply]);
    } finally {
      setIsTyping(false);
    }
  };



  return (
    <>
      {/* 1. FLOATING LAUNCHER BUTTON (When Pop-up is Collapsed/Closed) */}
      {!isOpen && (
        <button
          onClick={onToggle}
          title="Buka AI Chatbot Concierge"
          aria-label="Buka AI Chatbot Concierge"
          className="fixed bottom-24 right-5 sm:bottom-6 sm:right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#0A0A0A] text-[#D9FF43] shadow-spatial-lg hover:shadow-lime-glow hover:scale-105 active:scale-95 transition-all duration-200 border border-neutral-800 dark:bg-white dark:text-[#0A0A0A] dark:border-neutral-200 cursor-pointer group"
        >
          <Sparkles className="h-6 w-6 transition-transform group-hover:rotate-12 duration-200" />
        </button>
      )}

      {/* 2. FLOATING CHAT POP-UP WINDOW (When Opened) */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ease-out flex flex-col rounded-3xl bg-white/95 dark:bg-[#111114]/95 backdrop-blur-2xl border border-neutral-200/90 dark:border-white/10 shadow-spatial-2xl overflow-hidden ${
            isExpanded
              ? "bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-32px)] sm:w-[620px] h-[calc(100vh-80px)] max-h-[780px]"
              : "bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-32px)] sm:w-[420px] h-[580px] max-h-[82vh]"
          }`}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-white/10 bg-neutral-50/70 dark:bg-[#18181B]/70 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-[#0A0A0A] text-[#D9FF43] dark:bg-white dark:text-[#0A0A0A]">
                <Bot className="h-4 w-4" />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-[#111114] ${
                    connectionStatus === "connected"
                      ? "bg-emerald-500"
                      : connectionStatus === "checking"
                      ? "bg-amber-400 animate-spin"
                      : "bg-rose-500"
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black text-neutral-900 dark:text-white leading-none">
                    Kost AI Concierge
                  </h3>
                  <span className="rounded-md bg-[#D9FF43] px-1.5 py-0.2 text-[9px] font-black text-[#0A0A0A] leading-tight">
                    PRO
                  </span>
                </div>
                <p className="text-[10px] font-semibold text-neutral-400 mt-0.5">
                  {connectionStatus === "connected"
                    ? "Online • n8n Agent"
                    : connectionStatus === "checking"
                    ? "Memeriksa Koneksi..."
                    : "Koneksi Terputus"}
                </p>
              </div>
            </div>

            {/* Header Control Action Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleTestWebhook}
                disabled={isTestingWebhook}
                title="Ping Test Koneksi Webhook"
                className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200/60 dark:hover:text-white dark:hover:bg-neutral-800 transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isTestingWebhook ? "animate-spin text-lime-500" : ""}`} />
              </button>

              <button
                onClick={handleClearHistory}
                title="Hapus Riwayat Chat"
                className="p-1.5 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Kecilkan Tampilan" : "Perbesar Tampilan"}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200/60 dark:hover:text-white dark:hover:bg-neutral-800 transition-colors hidden sm:inline-flex"
              >
                {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>

              <button
                onClick={onClose}
                title="Tutup / Minimalkan Pop-up"
                className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200/60 dark:hover:text-white dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3.5 hide-scrollbar">
            {messages.map((msg) => {
              const isAssistant = msg.sender === "assistant";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isAssistant ? "items-start" : "items-start justify-end"}`}
                >
                  {isAssistant && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#0A0A0A] text-[#D9FF43] dark:bg-[#1C1C21] dark:text-[#D9FF43] mt-0.5 text-xs font-bold shadow-xs">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                  )}

                  <div className={`max-w-[85%] space-y-1.5 ${isAssistant ? "items-start" : "items-end"}`}>
                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed transition-all ${
                        isAssistant
                          ? "bg-neutral-100 text-neutral-900 dark:bg-[#1A1A1E] dark:text-neutral-100 border border-neutral-200/70 dark:border-neutral-800 shadow-xs"
                          : "bg-[#0A0A0A] text-white dark:bg-white dark:text-[#0A0A0A] font-medium shadow-spatial"
                      }`}
                    >
                      {isAssistant ? (
                        <AdaptiveMessageContent
                          content={msg.text}
                          onNavigateTab={onNavigateTab}
                        />
                      ) : (
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                      )}

                      {/* Interactive Action: Unpaid Invoices */}
                      {msg.actionType === "invoices" && msg.actionData && (
                        <div className="mt-2.5 space-y-1.5 border-t border-neutral-200/70 dark:border-neutral-800 pt-2">
                          {msg.actionData.slice(0, 2).map((inv: any) => (
                            <div
                              key={inv.id}
                              className="flex items-center justify-between rounded-xl bg-white dark:bg-[#0E0E10] p-2 border border-neutral-200 dark:border-neutral-800 text-[11px]"
                            >
                              <div>
                                <p className="font-bold text-neutral-900 dark:text-white truncate max-w-[140px]">
                                  Kamar {inv.room_number} · {inv.tenant_name}
                                </p>
                                <p className="text-[10px] text-rose-500 font-bold">
                                  {formatRupiah(inv.total_amount)}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => onNavigateTab && onNavigateTab("billing")}
                                className="h-6 px-2 text-[10px] font-bold"
                              >
                                Buka
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Interactive Action: Cashflow */}
                      {msg.actionType === "cashflow" && (
                        <div className="mt-2 pt-2 border-t border-neutral-200/70 dark:border-neutral-800 flex justify-end">
                          <Button
                            size="sm"
                            variant="lime"
                            onClick={() => onNavigateTab && onNavigateTab("cashflow")}
                            className="h-6 px-2.5 text-[10px] font-black shadow-lime-glow"
                          >
                            Buka Menu Kas ↗
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Footer icons for Assistant */}
                    {isAssistant && (
                      <div className="flex items-center gap-2.5 px-1 text-[10px] text-neutral-400 font-medium">
                        <span>{msg.timestamp}</span>
                        <button
                          onClick={() => handleCopyText(msg.text, msg.id)}
                          className="hover:text-neutral-700 dark:hover:text-neutral-200 flex items-center gap-0.5 cursor-pointer"
                          title="Salin balasan"
                        >
                          {copiedId === msg.id ? (
                            <Check className="h-2.5 w-2.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-2.5 w-2.5" />
                          )}
                          <span>{copiedId === msg.id ? "Tersalin" : "Salin"}</span>
                        </button>
                        <button
                          onClick={() => handleSpeakText(msg.text, msg.id)}
                          className="hover:text-neutral-700 dark:hover:text-neutral-200 flex items-center gap-0.5 cursor-pointer"
                          title="Bacakan teks"
                        >
                          {speakingId === msg.id ? (
                            <VolumeX className="h-2.5 w-2.5 text-[#D9FF43]" />
                          ) : (
                            <Volume2 className="h-2.5 w-2.5" />
                          )}
                          <span>{speakingId === msg.id ? "Stop" : "Baca"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#0A0A0A] text-[#D9FF43] dark:bg-[#1C1C21]">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="rounded-2xl bg-neutral-100 dark:bg-[#1A1A1E] p-2.5 text-xs text-neutral-500 flex items-center gap-1.5 border border-neutral-200/60 dark:border-neutral-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0A0A0A] dark:bg-[#D9FF43] animate-bounce" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0A0A0A] dark:bg-[#D9FF43] animate-bounce [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0A0A0A] dark:bg-[#D9FF43] animate-bounce [animation-delay:0.4s]" />
                  <span className="ml-1 text-[11px] font-semibold">Sedang menganalisis...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>


          {/* Input Form */}
          <div className="p-3 border-t border-neutral-100 dark:border-white/10 bg-neutral-50/50 dark:bg-[#141417]/50 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUserSubmit(inputPrompt);
              }}
              className="flex items-center rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#18181B] p-1 pl-3.5 focus-within:border-[#D9FF43] focus-within:ring-2 focus-within:ring-[#D9FF43]/20 shadow-spatial transition-all gap-1.5"
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="Tanyakan kamar, tagihan, token, dll..."
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                className="flex-1 bg-transparent text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none font-medium"
              />

              <Button
                type="submit"
                disabled={!inputPrompt.trim() && isTyping}
                className="h-8 w-8 rounded-full bg-[#D9FF43] hover:bg-[#c8f032] text-[#0A0A0A] p-0 flex items-center justify-center shrink-0 shadow-lime-glow font-black cursor-pointer border-none"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
