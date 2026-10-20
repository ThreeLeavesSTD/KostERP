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
import { AiIcon } from "@/components/ui/ai-icon";

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
  >("standby");

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
      const data = await sendChatbotMessageToN8n(
        "Ping connection test from Kost Concierge ERP"
      );
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
      {/* 1. FLOATING LAUNCHER BUTTON (Desktop Orbital FAB - Hidden on mobile) */}
      {!isOpen && (
        <div className="fixed bottom-7 right-7 z-50 hidden md:flex items-center justify-center">
          {/* Breathing Radial Aura */}
          <div
            className="absolute inset-[-14px] rounded-full bg-[#D9FF43]/20 blur-md pointer-events-none"
            style={{ animation: "fabAuraPulse 3.5s ease-in-out infinite" }}
          />

          {/* Outer Concentric Orbital Ring (Spins CW with glowing satellite dot) */}
          <div
            className="absolute inset-[-10px] rounded-full border border-dashed border-[#D9FF43]/45 pointer-events-none"
            style={{ animation: "ringSpinCW 18s linear infinite" }}
          >
            <span
              className="absolute -top-[3px] left-1/2 -translate-x-1/2 h-[6px] w-[6px] rounded-full bg-[#D9FF43]"
              style={{ boxShadow: "0 0 8px #D9FF43" }}
            />
          </div>

          {/* Inner Concentric Orbital Ring (Spins CCW) */}
          <div
            className="absolute inset-[-4px] rounded-full border border-dashed border-[#D9FF43]/25 pointer-events-none"
            style={{ animation: "ringSpinCCW 12s linear infinite" }}
          />

          {/* Canonical Single FAB Button (No text pill alongside) */}
          <button
            onClick={onToggle}
            title="Buka Kost AI Concierge"
            aria-label="Buka Kost AI Concierge"
            className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#0B0C0E] text-[#D9FF43] border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.5)] hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer group"
          >
            <AiIcon size={26} className="transition-transform group-hover:scale-110" />
          </button>
        </div>
      )}

      {/* 2. FLOATING CHAT POP-UP WINDOW (When Opened) */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ease-out flex flex-col bg-[#0B0C0E]/95 backdrop-blur-[24px] border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.65)] overflow-hidden ${
            isExpanded
              ? "inset-x-2.5 bottom-3 top-auto h-[calc(100dvh-24px)] rounded-[22px] md:inset-auto md:bottom-7 md:right-7 md:w-[680px] md:h-[calc(100dvh-80px)] md:max-h-[780px] md:rounded-[24px]"
              : "inset-x-2.5 bottom-3 top-auto h-[calc(100dvh-24px)] rounded-[22px] md:inset-auto md:bottom-7 md:right-7 md:w-[420px] md:h-[590px] md:max-h-[82dvh] md:rounded-[24px]"
          }`}
          style={{ animation: "popupSpringIn 0.35s var(--spring-smooth)" }}
        >
          {/* Top Laser Sweep Beam */}
          <div className="popup-laser-beam shrink-0" />

          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#12131A]/80 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-[#171821] text-[#D9FF43] border border-white/10">
                <AiIcon size={18} />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#0B0C0E] ${
                    connectionStatus === "connected"
                      ? "bg-emerald-400"
                      : connectionStatus === "checking" || connectionStatus === "warning"
                      ? "bg-amber-400 animate-spin"
                      : connectionStatus === "standby"
                      ? "bg-neutral-500"
                      : "bg-rose-500"
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black text-white leading-none">
                    Kost AI Concierge
                  </h3>
                  <span className="rounded-md bg-[#D9FF43] px-1.5 py-0.5 text-[9px] font-black text-[#0A0A0A] leading-tight">
                    PRO
                  </span>
                </div>
                <p className="text-[10px] font-semibold text-neutral-400 mt-0.5">
                  {connectionStatus === "connected"
                    ? "Online • n8n Spatial Agent"
                    : connectionStatus === "checking"
                    ? "Memeriksa Koneksi..."
                    : connectionStatus === "standby"
                    ? "Belum terhubung"
                    : connectionStatus === "warning"
                    ? "n8n memberi peringatan"
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
                className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isTestingWebhook ? "animate-spin text-[#D9FF43]" : ""}`} />
              </button>

              <button
                onClick={handleClearHistory}
                title="Hapus Riwayat Chat"
                className="p-1.5 rounded-xl text-neutral-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Kecilkan Tampilan" : "Perbesar Tampilan"}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors hidden md:inline-flex"
              >
                {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>

              <button
                onClick={onClose}
                aria-label="Tutup chatbot"
                title="Tutup / Minimalkan Pop-up"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3.5 hide-scrollbar">
            {messages.map((msg) => {
              const isAssistant = msg.sender === "assistant";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isAssistant ? "items-start" : "items-start justify-end"}`}
                >
                  {isAssistant && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#171821] text-[#D9FF43] border border-white/10 mt-0.5 shadow-xs">
                      <AiIcon size={16} />
                    </div>
                  )}

                  <div className={`max-w-[85%] space-y-1.5 ${isAssistant ? "items-start" : "items-end"}`}>
                    <div
                      className={
                        isAssistant
                          ? "chat-bubble-assistant"
                          : "chat-bubble-user"
                      }
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
                        <div className="mt-2.5 space-y-1.5 border-t border-white/10 pt-2">
                          {msg.actionData.slice(0, 2).map((inv: any) => (
                            <div
                              key={inv.id}
                              className="flex items-center justify-between rounded-xl bg-[#121318] p-2 border border-white/10 text-[11px]"
                            >
                              <div>
                                <p className="font-bold text-white truncate max-w-[140px]">
                                  Kamar {inv.room_number} · {inv.tenant_name}
                                </p>
                                <p className="text-[10px] text-rose-400 font-bold">
                                  {formatRupiah(inv.total_amount)}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => onNavigateTab && onNavigateTab("billing")}
                                className="h-6 px-2 text-[10px] font-bold bg-white text-black hover:bg-neutral-200"
                              >
                                Buka
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Interactive Action: Cashflow */}
                      {msg.actionType === "cashflow" && (
                        <div className="mt-2 pt-2 border-t border-white/10 flex justify-end">
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
                          className="hover:text-neutral-200 flex items-center gap-0.5 cursor-pointer"
                          title="Salin balasan"
                        >
                          {copiedId === msg.id ? (
                            <Check className="h-2.5 w-2.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-2.5 w-2.5" />
                          )}
                          <span>{copiedId === msg.id ? "Tersalin" : "Salin"}</span>
                        </button>
                        <button
                          onClick={() => handleSpeakText(msg.text, msg.id)}
                          className="hover:text-neutral-200 flex items-center gap-0.5 cursor-pointer"
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
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#171821] text-[#D9FF43] border border-white/10">
                  <AiIcon size={16} />
                </div>
                <div className="rounded-2xl bg-[#171821] p-2.5 text-xs text-neutral-300 flex items-center gap-1.5 border border-white/10">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#D9FF43] animate-bounce" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#D9FF43] animate-bounce [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#D9FF43] animate-bounce [animation-delay:0.4s]" />
                  <span className="ml-1 text-[11px] font-semibold text-neutral-300">Sedang menganalisis...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <div className="p-3 border-t border-white/10 bg-[#12131A]/90 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUserSubmit(inputPrompt);
              }}
              className="flex items-center rounded-full border border-white/10 bg-[#171821] p-1 pl-3.5 focus-within:border-[#D9FF43] focus-within:ring-2 focus-within:ring-[#D9FF43]/20 shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-all gap-1.5"
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="Tanyakan kamar, tagihan, token, dll..."
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                className="flex-1 bg-transparent text-xs text-white placeholder:text-neutral-500 outline-none font-medium"
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

