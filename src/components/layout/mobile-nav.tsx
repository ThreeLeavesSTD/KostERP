"use client";

import React, { useEffect, useState } from "react";
import {
  LayoutDashboard,
  DoorClosed,
  Users,
  Zap,
  Receipt,
  UserPlus,
  User,
  Wallet,
  Target,
  Building2,
  Layers,
  Menu,
  ShieldCheck,
} from "lucide-react";
import { UserRole } from "@/types";
import { hasPermission, financeLanding } from "@/lib/permissions";
import { FINANCE_ROUTES } from "@/types/finance";
import { useAuth } from "@/lib/auth-context";
import { Modal } from "@/components/ui/modal";
import { AiIcon } from "@/components/ui/ai-icon";

interface MobileNavProps {
  currentRole: UserRole;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function MobileNav({ currentRole, activeTab, onTabChange }: MobileNavProps) {
  const { profile } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [activeTab]);

  const allMobileItems = [
    { id: "owner-dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "rooms", label: "Kamar", icon: DoorClosed },
    { id: financeLanding(currentRole, profile?.permissions) || "cashflow", label: "Keuangan", icon: Wallet },
    { id: "billing", label: "Tagihan", icon: Receipt },
    { id: "tenants", label: "Penghuni", icon: Users },
    { id: "leads", label: "Leads", icon: Target },
    { id: "electricity", label: "Token PLN", icon: Zap },
    { id: "room-types", label: "Tipe", icon: Layers },
    { id: "staff-management", label: "Karyawan", icon: UserPlus },
    { id: "property-settings", label: "Properti", icon: Building2 },
    { id: "owner-audit", label: "Audit", icon: ShieldCheck },
    { id: "profile", label: "Profil", icon: User },
  ];

  const allowedItems = allMobileItems.filter((item, index) =>
    allMobileItems.findIndex((candidate) => candidate.id === item.id) === index &&
    hasPermission(currentRole, item.id, profile?.permissions)
  );

  const financeNavId = financeLanding(currentRole, profile?.permissions) || "cashflow";
  const isItemActive = (id: string) =>
    activeTab === id || (id === financeNavId && FINANCE_ROUTES.includes(activeTab));

  return (
    <>
      <nav
        aria-label="Navigasi utama handphone"
        className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200/80 bg-white/95 px-2 pt-1.5 shadow-spatial-lg backdrop-blur-2xl dark:border-white/10 dark:bg-[#111218]/95 md:hidden"
      >
        <div className="grid grid-cols-5 items-center gap-1">
          {/* Slot 1: Dashboard */}
          <button
            type="button"
            onClick={() => onTabChange("owner-dashboard")}
            className={`flex min-h-[50px] flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 transition-all ${
              isItemActive("owner-dashboard")
                ? "bg-[#D9FF43] text-[#0A0A0A] font-black shadow-xs"
                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 font-semibold"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="truncate text-[10px]">Dashboard</span>
          </button>

          {/* Slot 2: Kamar */}
          <button
            type="button"
            onClick={() => onTabChange("rooms")}
            className={`flex min-h-[50px] flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 transition-all ${
              isItemActive("rooms")
                ? "bg-[#D9FF43] text-[#0A0A0A] font-black shadow-xs"
                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 font-semibold"
            }`}
          >
            <DoorClosed className="h-4 w-4" />
            <span className="truncate text-[10px]">Kamar</span>
          </button>

          {/* Slot 3: CENTER AI CONCIERGE BUTTON (Pulsing Aura & Elevated Orb) */}
          <div className="flex flex-col items-center justify-center relative -top-3">
            <button
              type="button"
              onClick={() => onTabChange("ai-assistant")}
              aria-label="Buka Kost AI Concierge"
              className="relative flex h-13 w-13 items-center justify-center rounded-full bg-[#0B0C0E] text-[#D9FF43] border border-white/20 shadow-[0_8px_24px_rgba(0,0,0,0.5)] active:scale-95 transition-transform"
            >
              {/* Pulsing Aura Behind Center Orb */}
              <span
                className="absolute inset-[-6px] rounded-full bg-[#D9FF43]/25 blur-sm pointer-events-none"
                style={{ animation: "fabAuraPulse 3s ease-in-out infinite" }}
              />
              <AiIcon size={24} />
            </button>
            <span className="text-[9px] font-black text-neutral-800 dark:text-neutral-200 mt-0.5 tracking-tight">
              AI Concierge
            </span>
          </div>

          {/* Slot 4: Keuangan */}
          <button
            type="button"
            onClick={() => onTabChange(financeNavId)}
            className={`flex min-h-[50px] flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 transition-all ${
              isItemActive(financeNavId)
                ? "bg-[#D9FF43] text-[#0A0A0A] font-black shadow-xs"
                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 font-semibold"
            }`}
          >
            <Wallet className="h-4 w-4" />
            <span className="truncate text-[10px]">Keuangan</span>
          </button>

          {/* Slot 5: Menu Lainnya */}
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className={`flex min-h-[50px] flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 transition-all ${
              menuOpen
                ? "bg-[#D9FF43] text-[#0A0A0A] font-black"
                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 font-semibold"
            }`}
          >
            <Menu className="h-4 w-4" />
            <span className="truncate text-[10px]">Lainnya</span>
          </button>
        </div>
      </nav>

      {/* Menu Modal Drawer */}
      {menuOpen && (
        <Modal
          isOpen
          onClose={() => setMenuOpen(false)}
          title="Semua Menu Operasional"
          description="Akses cepat seluruh modul ERP Kost."
          maxWidth="md"
        >
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {allowedItems.map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onTabChange(item.id);
                  }}
                  className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left text-xs font-bold transition-all ${
                    isActive
                      ? "border-[#D9FF43] bg-[#D9FF43] text-[#0A0A0A] shadow-xs"
                      : "border-neutral-200/80 bg-neutral-50 text-neutral-800 hover:border-neutral-300 dark:border-white/10 dark:bg-[#171821] dark:text-neutral-200 dark:hover:border-white/20"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </Modal>
      )}
    </>
  );
}
