"use client";

import React from "react";
import { LayoutDashboard, DoorClosed, Users, Zap, Receipt, FileSpreadsheet, CreditCard, UserPlus, User, Wallet, Target, Building2, Layers } from "lucide-react";
import { UserRole } from "@/types";
import { hasPermission } from "@/lib/permissions";

interface MobileNavProps {
  currentRole: UserRole;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function MobileNav({ currentRole, activeTab, onTabChange }: MobileNavProps) {
  const allMobileItems = [
    { id: "owner-dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "cashflow", label: "Kas", icon: Wallet },
    { id: "staff-management", label: "Karyawan", icon: UserPlus },
    { id: "rooms", label: "Kamar", icon: DoorClosed },
    { id: "room-types", label: "Tipe", icon: Layers },
    { id: "tenants", label: "Penghuni", icon: Users },
    { id: "leads", label: "Leads", icon: Target },
    { id: "electricity", label: "Token", icon: Zap },
    { id: "billing", label: "Tagihan", icon: Receipt },
    { id: "owner-audit", label: "Laporan", icon: FileSpreadsheet },
    { id: "property-settings", label: "Properti", icon: Building2 },
    { id: "profile", label: "Profil", icon: User },
  ];

  const items = allMobileItems.filter((item) =>
    hasPermission(currentRole, item.id)
  );

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 flex h-16 items-center justify-around gap-1 overflow-x-auto rounded-full bg-white/90 px-4 shadow-spatial-lg backdrop-blur-2xl border border-white/60 dark:bg-[#18181B]/90 dark:border-white/10 md:hidden hide-scrollbar">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex shrink-0 flex-col items-center justify-center gap-1 py-1.5 px-3 rounded-full transition-all duration-200 ${
              isActive
                ? "bg-[#0A0A0A] text-white shadow-xs dark:bg-white dark:text-[#0A0A0A] scale-105"
                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="text-[9px] font-bold tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
