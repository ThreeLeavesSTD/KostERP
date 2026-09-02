"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bell,
  Check,
  MessageSquare,
  Receipt,
  Zap,
  DoorClosed,
  Clock,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  X,
  ExternalLink,
  ShieldCheck,
  Layers,
} from "lucide-react";
import { RoomComplaint, Invoice, ElectricityTransaction } from "@/types";
import { KostApiClient } from "@/lib/api-client";
import { formatRupiah, formatDateIndo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface SystemNotification {
  id: string;
  type: "complaint" | "billing" | "electricity" | "system";
  title: string;
  description: string;
  timestamp: string;
  timeAgo: string;
  priority?: "urgent" | "high" | "medium" | "low";
  targetTab: string;
  isRead: boolean;
  metadata?: Record<string, any>;
}

interface NotificationPopoverProps {
  onNavigateTab: (tab: string) => void;
}

export function NotificationPopover({ onNavigateTab }: NotificationPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "complaint" | "billing" | "electricity">("all");
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const popoverRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    try {
      const [complaints, invoices, electricity] = await Promise.all([
        KostApiClient.getComplaints().catch(() => []),
        KostApiClient.getInvoices().catch(() => []),
        KostApiClient.getElectricityTransactions().catch(() => []),
      ]);

      const items: SystemNotification[] = [];

      // 1. WhatsApp CS AI Complaints Notifications
      complaints.forEach((c) => {
        if (c.status === "pending" || c.status === "in_progress") {
          items.push({
            id: `notif-comp-${c.id}`,
            type: "complaint",
            title: `Keluhan WA AI: Kamar ${c.room_number}`,
            description: `"${c.ai_extracted_summary}" · Pelapor: ${c.tenant_name.split(" ")[0]}`,
            timestamp: c.created_at,
            timeAgo: formatTimeAgo(c.created_at),
            priority: c.priority,
            targetTab: "rooms",
            isRead: readIds.has(`notif-comp-${c.id}`),
            metadata: { complaintId: c.id, roomNumber: c.room_number },
          });
        }
      });

      // 2. Unpaid & Overdue Invoices
      invoices.forEach((inv) => {
        if (inv.status === "unpaid" || inv.status === "overdue") {
          items.push({
            id: `notif-inv-${inv.id}`,
            type: "billing",
            title: `Tagihan Belum Lunas: Kamar ${inv.room_number}`,
            description: `Sewa ${formatRupiah(inv.total_amount)} belum dibayar (${inv.tenant_name || "Penghuni"}).`,
            timestamp: inv.due_date,
            timeAgo: `Jatuh tempo ${new Date(inv.due_date).toLocaleDateString("id-ID")}`,
            priority: inv.status === "overdue" ? "urgent" : "medium",
            targetTab: "billing",
            isRead: readIds.has(`notif-inv-${inv.id}`),
            metadata: { invoiceId: inv.id },
          });
        }
      });

      // 3. Recent Electricity Transactions
      electricity.slice(0, 3).forEach((el) => {
        items.push({
          id: `notif-el-${el.id}`,
          type: "electricity",
          title: `Distribusi Token PLN: Kamar ${el.room_number}`,
          description: `Token ${formatRupiah(el.selling_price)} dikirim via WA.`,
          timestamp: el.created_at,
          timeAgo: formatTimeAgo(el.created_at),
          priority: "low",
          targetTab: "electricity",
          isRead: readIds.has(`notif-el-${el.id}`),
          metadata: { electricityId: el.id },
        });
      });

      // Sort by priority and timestamp
      setNotifications(items);
    } catch {}
  };

  useEffect(() => {
    loadNotifications();
  }, [readIds]);

  // Outside click listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  function formatTimeAgo(dateString?: string) {
    if (!dateString) return "Baru saja";
    try {
      const now = new Date();
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Baru saja";
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Baru saja";
      if (diffMins < 60) return `${diffMins} mnt lalu`;
      if (diffHours < 24) return `${diffHours} jam lalu`;
      return `${diffDays} hari lalu`;
    } catch {
      return "Baru saja";
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllAsRead = () => {
    const allIds = new Set(notifications.map((n) => n.id));
    setReadIds(allIds);
  };

  const handleItemClick = (notif: SystemNotification) => {
    setReadIds((prev) => new Set([...Array.from(prev), notif.id]));
    setIsOpen(false);
    onNavigateTab(notif.targetTab);
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === "all") return true;
    return n.type === activeFilter;
  });

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Pemberitahuan & Notifikasi Sistem"
        className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${
          isOpen
            ? "bg-[#0A0A0A] text-white shadow-spatial scale-105 dark:bg-white dark:text-[#0A0A0A]"
            : "bg-white/80 text-neutral-700 shadow-spatial border border-white/60 hover:bg-white dark:bg-[#18181B]/80 dark:text-neutral-300 dark:border-white/10 dark:hover:bg-neutral-800"
        }`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D9FF43] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#D9FF43] ring-2 ring-white dark:ring-neutral-900 shadow-lime-glow" />
          </span>
        )}
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-3xl bg-white p-4 shadow-spatial-lg border border-neutral-200/80 dark:bg-[#18181B] dark:border-white/10 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-white/10">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#D9FF43] text-[#0A0A0A] text-xs font-black shadow-xs">
                <Bell className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-sm font-black text-neutral-900 dark:text-white">
                Notifikasi Sistem
              </h3>
              {unreadCount > 0 && (
                <Badge variant="lime" className="text-[10px] py-0 px-2 font-black">
                  {unreadCount} Baru
                </Badge>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                Tandai Dibaca
              </button>
            )}
          </div>

          {/* Filter Tabs Capsule */}
          <div className="flex items-center gap-1 my-3 overflow-x-auto pb-1 hide-scrollbar">
            <button
              onClick={() => setActiveFilter("all")}
              className={`rounded-xl px-3 py-1 text-[11px] font-bold transition-all whitespace-nowrap ${
                activeFilter === "all"
                  ? "bg-[#0A0A0A] text-white dark:bg-white dark:text-[#0A0A0A]"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400"
              }`}
            >
              Semua ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter("complaint")}
              className={`rounded-xl px-3 py-1 text-[11px] font-bold transition-all whitespace-nowrap ${
                activeFilter === "complaint"
                  ? "bg-rose-600 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400"
              }`}
            >
              🚨 Keluhan WA AI
            </button>
            <button
              onClick={() => setActiveFilter("billing")}
              className={`rounded-xl px-3 py-1 text-[11px] font-bold transition-all whitespace-nowrap ${
                activeFilter === "billing"
                  ? "bg-amber-600 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400"
              }`}
            >
              🧾 Tagihan
            </button>
            <button
              onClick={() => setActiveFilter("electricity")}
              className={`rounded-xl px-3 py-1 text-[11px] font-bold transition-all whitespace-nowrap ${
                activeFilter === "electricity"
                  ? "bg-emerald-600 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400"
              }`}
            >
              ⚡ Token PLN
            </button>
          </div>

          {/* Notification List Items */}
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {filteredNotifications.length === 0 ? (
              <div className="rounded-2xl bg-neutral-50 p-6 text-center text-xs font-semibold text-neutral-400 dark:bg-neutral-800/40">
                Tidak ada notifikasi aktif untuk kategori ini.
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const isUrgent = notif.priority === "urgent";

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    className={`group relative rounded-2xl p-3 border transition-all cursor-pointer ${
                      notif.isRead
                        ? "bg-neutral-50/70 border-neutral-100 text-neutral-500 dark:bg-neutral-800/40 dark:border-white/5"
                        : isUrgent
                        ? "bg-rose-50/80 border-rose-200 text-neutral-900 dark:bg-rose-950/30 dark:border-rose-900/40 dark:text-white"
                        : "bg-white border-neutral-200 text-neutral-900 shadow-xs dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs ${
                            notif.type === "complaint"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
                              : notif.type === "billing"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                          }`}
                        >
                          {notif.type === "complaint" ? (
                            <MessageSquare className="h-3.5 w-3.5" />
                          ) : notif.type === "billing" ? (
                            <Receipt className="h-3.5 w-3.5" />
                          ) : (
                            <Zap className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-black leading-tight">
                            {notif.title}
                          </h4>
                          <span className="text-[10px] text-neutral-400 font-medium">
                            {notif.timeAgo}
                          </span>
                        </div>
                      </div>

                      <ChevronRight className="h-3.5 w-3.5 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>

                    <p className="mt-1.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-300 leading-snug pl-9">
                      {notif.description}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Popover Actions */}
          <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-white/10 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-neutral-400">
              Kost ERP Notifications
            </span>
            <button
              onClick={() => {
                setIsOpen(false);
                onNavigateTab("ai-assistant");
              }}
              className="font-bold text-[#0A0A0A] hover:underline dark:text-[#D9FF43] flex items-center gap-1"
            >
              <Sparkles className="h-3 w-3" />
              <span>Tanya AI Concierge ↗</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
