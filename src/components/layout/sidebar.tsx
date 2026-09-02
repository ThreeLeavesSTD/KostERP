"use client";

import React from "react";
import {
  LayoutDashboard,
  DoorClosed,
  Users,
  Zap,
  Receipt,
  CreditCard,
  Building2,
  FileSpreadsheet,
  Settings,
  Sparkles,
  UserPlus,
  User,
  Wallet,
} from "lucide-react";
import { UserRole } from "@/types";
import { hasPermission } from "@/lib/permissions";

interface SidebarProps {
  currentRole: UserRole;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ currentRole, activeTab, onTabChange }: SidebarProps) {
  const allNavItems = [
    {
      id: "owner-dashboard",
      label: "Dashboard Owner",
      icon: LayoutDashboard,
    },
    {
      id: "ai-assistant",
      label: "AI Assistant Concierge",
      icon: Sparkles,
      badge: "AI",
    },
    {
      id: "cashflow",
      label: "Kas Operasional",
      icon: Wallet,
    },
    {
      id: "staff-management",
      label: "Karyawan & Custom Role",
      icon: UserPlus,
    },
    {
      id: "rooms",
      label: "Manajemen Kamar",
      icon: DoorClosed,
    },
    {
      id: "tenants",
      label: "Penghuni & Sewa",
      icon: Users,
    },
    {
      id: "electricity",
      label: "Token Listrik PLN",
      icon: Zap,
      badge: "WA",
    },
    {
      id: "billing",
      label: "Penagihan & Invoice",
      icon: Receipt,
    },
    {
      id: "owner-audit",
      label: "Laporan & Arus Kas",
      icon: FileSpreadsheet,
    },
    {
      id: "billing-settings",
      label: "Rekening Bank",
      icon: CreditCard,
    },
    {
      id: "profile",
      label: "Profil & Keamanan",
      icon: User,
    },
  ];

  const visibleItems = allNavItems.filter((item) =>
    hasPermission(currentRole, item.id)
  );

  return (
    <aside className="hidden md:flex flex-col items-center fixed left-4 sm:left-6 top-24 z-30">
      {/* Floating Slim Dock Container */}
      <div className="flex flex-col items-center gap-2.5 w-16 p-2.5 rounded-3xl bg-white/90 dark:bg-[#18181B]/90 backdrop-blur-xl border border-white/80 dark:border-white/10 shadow-spatial">
        {/* Navigation Icons List */}
        <nav className="flex flex-col items-center gap-2 w-full">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <div key={item.id} className="relative group flex items-center justify-center">
                <button
                  onClick={() => onTabChange(item.id)}
                  title={item.label}
                  className={`relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200 ${
                    isActive
                      ? "bg-[#0A0A0A] text-white shadow-spatial scale-105 dark:bg-white dark:text-[#0A0A0A]"
                      : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#D9FF43] text-[9px] font-black text-[#0A0A0A] ring-2 ring-white dark:ring-neutral-900">
                      ⚡
                    </span>
                  )}
                </button>

                {/* Floating Tooltip */}
                <div className="pointer-events-none absolute left-16 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap rounded-xl bg-[#0A0A0A] px-3 py-1.5 text-xs font-bold text-white shadow-xl dark:bg-white dark:text-[#0A0A0A]">
                  {item.label}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="w-8 h-px bg-neutral-200 dark:bg-neutral-800 my-0.5" />

        {/* Bottom Status Indicator */}
        <div
          title="n8n WhatsApp Webhook Active"
          className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#D9FF43]/20 text-[#0A0A0A] dark:text-[#D9FF43] transition-transform hover:scale-105"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-[#D9FF43] animate-pulse ring-2 ring-[#D9FF43]/50" />
        </div>
      </div>
    </aside>
  );
}
