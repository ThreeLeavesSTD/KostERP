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
} from "lucide-react";
import { KostStorage } from "@/lib/storage";
import { formatRupiah, formatDateIndo, formatTokenPLN } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/lib/notify";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-welcome",
      sender: "assistant",
      text: "Halo! Saya **Kost Concierge AI**, asisten cerdas untuk operasional properti dan otomasi penagihan sewa kost Anda. Ada yang bisa saya bantu hari ini?",
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const generateAIResponse = (query: string): Omit<Message, "id" | "timestamp"> => {
    const q = query.toLowerCase();
    const rooms = KostStorage.getRooms();
    const invoices = KostStorage.getInvoices();
    const metrics = KostStorage.getOwnerMetrics();
    const electricity = KostStorage.getElectricityTransactions();

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
        text: `Ditemukan **${unpaidInvoices.length} tagihan sewa belum lunas** dengan total nilai **${formatRupiah(metrics.totalUnpaidAmount)}**. Anda dapat langsung menyalin format pengingat WhatsApp atau membuka modul billing:`,
        actionType: "invoices",
        actionData: unpaidInvoices,
      };
    }

    // 3. Check electricity tokens & profit
    if (q.includes("token") || q.includes("listrik") || q.includes("pln")) {
      return {
        sender: "assistant",
        text: `📊 **Analitik Distribusi Token Listrik PLN:**\n\n• Total Transaksi: **${metrics.electricityTransactionsCount} transaksi**\n• Akumulasi Laba Bersih: **+${formatRupiah(metrics.electricityProfitTotal)}**\n• Margin Rata-rata: **Rp 2.000 - Rp 3.000 / transaksi**\n\nIntegrasi webhook n8n siap mengirimkan 20 digit kode token langsung ke WhatsApp penghuni secara otomatis.`,
        actionType: "electricity",
        actionData: electricity.slice(0, 3),
      };
    }

    // 4. Check complaints / WhatsApp CS AI tickets
    if (q.includes("keluhan") || q.includes("komplain") || q.includes("rusak") || q.includes("bocor") || q.includes("cs ai") || q.includes("tiket")) {
      const complaints = KostStorage.getComplaints();
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
      const cashSummary = KostStorage.getCashFlowSummary();
      return {
        sender: "assistant",
        text: `💼 **Rekapitulasi Kas Operasional & Pembukuan:**\n\n• Total Pemasukan: **${formatRupiah(cashSummary.totalIncome)}**\n• Total Pengeluaran: **${formatRupiah(cashSummary.totalExpense)}**\n• Arus Kas Bersih (Net): **${cashSummary.netCashFlow >= 0 ? `+${formatRupiah(cashSummary.netCashFlow)}` : formatRupiah(cashSummary.netCashFlow)}** (${cashSummary.netCashFlow >= 0 ? "Surplus ✅" : "Defisit ⚠️"})\n• Estimasi Saldo Kas Berjalan: **${formatRupiah(cashSummary.balance)}**\n\nAnda dapat membuka modul **Kas Operasional** untuk mencatat transaksi baru atau mengunduh laporan CSV.`,
        actionType: "cashflow",
      };
    }

    // 6. Check revenue & occupancy cashflow
    if (q.includes("pendapatan") || q.includes("revenue") || q.includes("arus kas") || q.includes("okupansi") || q.includes("laba") || q.includes("keuangan")) {
      return {
        sender: "assistant",
        text: `📈 **Ringkasan Finansial & Okupansi Properti:**\n\n• Tingkat Okupansi: **${metrics.occupancyRate}%** (${metrics.occupiedRooms}/${metrics.totalRooms} Kamar Terisi)\n• Penerimaan Terverifikasi: **${formatRupiah(metrics.currentMonthRevenue)}**\n• Target Bulanan: **${formatRupiah(metrics.targetMonthlyRevenue)}**\n• Laba Bersih Token PLN: **+${formatRupiah(metrics.electricityProfitTotal)}**\n• Piutang Tertunda: **${formatRupiah(metrics.totalUnpaidAmount)}**`,
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

  const handleUserSubmit = (userText: string) => {
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

    setTimeout(() => {
      const response = generateAIResponse(userText);
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        ...response,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 600);
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
            <Badge variant="lime">n8n Connected</Badge>
          </div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
            Asisten cerdas otomatisasi operasional kost, pengecekan inventaris kamar, dan reminder WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
          {/* Assistant Profile Bento Card */}
          <div className="rounded-3xl bg-[#0A0A0A] p-6 text-white shadow-spatial border border-neutral-800 flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D9FF43] text-[#0A0A0A] shadow-lime-glow">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Kost Concierge AI</h3>
                <p className="text-[11px] text-neutral-400 font-medium flex items-center gap-1.5 mt-0.5">
                  <span className="h-2 w-2 rounded-full bg-[#D9FF43] animate-pulse" />
                  Model Ready · Operasional 24/7
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 mt-4 leading-relaxed">
              Asisten terhubung langsung dengan basis data properti lokal dan webhook n8n untuk otomasi pengiriman pesan WhatsApp.
            </p>

            <div className="mt-5 border-t border-neutral-800 pt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between text-neutral-400">
                <span>Status Properti:</span>
                <span className="font-bold text-white">Kost Putri Graha Asri</span>
              </div>
              <div className="flex items-center justify-between text-neutral-400">
                <span>Webhook WhatsApp:</span>
                <span className="font-bold text-[#D9FF43]">Aktif (Ready)</span>
              </div>
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
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#0A0A0A] text-[#D9FF43] shadow-xs dark:bg-white dark:text-[#0A0A0A] mt-1">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-3xl p-4 sm:p-5 text-xs shadow-xs ${
                      isAssistant
                        ? "bg-neutral-50 text-neutral-900 border border-neutral-100 rounded-tl-sm dark:bg-neutral-800/80 dark:text-white dark:border-white/5"
                        : "bg-[#0A0A0A] text-white rounded-tr-sm dark:bg-white dark:text-[#0A0A0A]"
                    }`}
                  >
                    {/* Header Timestamp */}
                    <div
                      className={`flex items-center justify-between mb-1.5 text-[10px] font-semibold ${
                        isAssistant ? "text-neutral-400" : "text-neutral-400 dark:text-neutral-500"
                      }`}
                    >
                      <span>{isAssistant ? "Kost Concierge AI" : "Anda"}</span>
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
    </div>
  );
}
