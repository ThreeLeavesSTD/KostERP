"use client";

import React from "react";
import {
  LayoutDashboard,
  DoorClosed,
  Users,
  Zap,
  Receipt,
  Building2,
  FileSpreadsheet,
  Settings,
  UserPlus,
  User,
  Wallet,
  Target,
  Layers,
} from "lucide-react";
import { UserRole } from "@/types";
import { hasPermission } from "@/lib/permissions";
import { useAuth } from "@/lib/auth-context";

interface SidebarProps {
  currentRole: UserRole;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ currentRole, activeTab, onTabChange }: SidebarProps) {
  const { profile } = useAuth();
  const [hoveredTooltip, setHoveredTooltip] = React.useState<{
    label: string;
    top: number;
  } | null>(null);

  React.useEffect(() => {
    const handleDismissTooltip = () => setHoveredTooltip(null);
    window.addEventListener("scroll", handleDismissTooltip, { passive: true });
    window.addEventListener("resize", handleDismissTooltip, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleDismissTooltip);
      window.removeEventListener("resize", handleDismissTooltip);
    };
  }, []);

  const allNavItems = [
    {
      id: "owner-dashboard",
      label: "Dashboard Owner",
      icon: LayoutDashboard,
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
      id: "room-types",
      label: "Tipe & Showcase",
      icon: Layers,
    },
    {
      id: "tenants",
      label: "Penghuni & Sewa",
      icon: Users,
    },
    {
      id: "leads",
      label: "Leads & Survey",
      icon: Target,
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
      id: "property-settings",
      label: "Pengaturan Properti",
      icon: Building2,
    },
    {
      id: "profile",
      label: "Profil & Keamanan",
      icon: User,
    },
  ];

  const visibleItems = allNavItems.filter((item) =>
    hasPermission(currentRole, item.id, profile?.permissions)
  );

  return (
    <aside className="hidden md:flex flex-col items-center fixed left-3 sm:left-5 top-20 md:top-[84px] bottom-3 sm:bottom-4 z-30 pointer-events-none">
      {/* Floating Slim Dock Container */}
      <div className="pointer-events-auto flex flex-col items-center gap-1.5 w-14 sm:w-[58px] p-1.5 sm:p-2 rounded-3xl bg-white/90 dark:bg-[#18181B]/90 backdrop-blur-xl border border-white/80 dark:border-white/10 shadow-spatial max-h-full overflow-hidden">
        {/* Navigation Icons List */}
        <nav
          onScroll={() => setHoveredTooltip(null)}
          className="flex flex-col items-center gap-1 sm:gap-1.5 w-full overflow-y-auto hide-scrollbar py-0.5"
        >
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setHoveredTooltip(null);
                  onTabChange(item.id);
                }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredTooltip({
                    label: item.label,
                    top: rect.top + rect.height / 2,
                  });
                }}
                onMouseLeave={() => setHoveredTooltip(null)}
                title={item.label}
                className={`relative flex h-[38px] w-[38px] sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-2xl transition-all duration-200 ${
                  isActive
                    ? "bg-[#0A0A0A] text-white shadow-spatial scale-105 dark:bg-white dark:text-[#0A0A0A]"
                    : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800"
                }`}
              >
                <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                {item.badge && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-[#D9FF43] text-[8px] sm:text-[9px] font-black text-[#0A0A0A] ring-2 ring-white dark:ring-neutral-900">
                    ⚡
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="w-6 sm:w-7 shrink-0 h-px bg-neutral-200 dark:bg-neutral-800 my-0.5" />

        {/* Bottom Status Indicator */}
        <div
          onMouseEnter={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setHoveredTooltip({
              label: "n8n WhatsApp Webhook Aktif",
              top: rect.top + rect.height / 2,
            });
          }}
          onMouseLeave={() => setHoveredTooltip(null)}
          title="n8n WhatsApp Webhook Aktif"
          className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-[#D9FF43]/20 text-[#0A0A0A] dark:text-[#D9FF43] transition-transform hover:scale-105 cursor-default"
        >
          <span className="h-2 w-2 rounded-full bg-[#D9FF43] animate-pulse ring-2 ring-[#D9FF43]/50" />
        </div>
      </div>

      {/* Floating Tooltip outside overflow container to prevent clipping */}
      {hoveredTooltip && (
        <div
          style={{ top: `${hoveredTooltip.top}px` }}
          className="pointer-events-none fixed left-[72px] sm:left-[84px] -translate-y-1/2 z-50 whitespace-nowrap rounded-xl bg-[#0A0A0A] px-3 py-1.5 text-xs font-bold text-white shadow-xl dark:bg-white dark:text-[#0A0A0A] animate-in fade-in duration-150"
        >
          {hoveredTooltip.label}
        </div>
      )}
    </aside>
  );
}
