"use client";

import React from "react";
import {
  MapPin,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { UserRole } from "@/types";
import { KostStorage } from "@/lib/storage";
import { useAuth } from "@/lib/auth-context";
import { useFinanceWorkspace } from "@/lib/finance-workspace-context";
import { FINANCE_ROUTES } from "@/types/finance";
import { NotificationPopover } from "./notification-popover";

interface HeaderProps {
  currentRole: UserRole;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export function Header({ currentRole, activeTab, onTabChange, onLogout, theme, onToggleTheme }: HeaderProps) {
  const { profile, user } = useAuth();
  const { properties, activeProperty } = useFinanceWorkspace();
  const usesFinanceWorkspace = activeTab === "owner-dashboard" || activeTab === "billing" || FINANCE_ROUTES.includes(activeTab);
  const headerProperty = usesFinanceWorkspace ? activeProperty : properties[0];

  // Nama pengguna riil / nama orang yang sedang login
  const defaultOwner = KostStorage.getUserProfile();
  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    (currentRole === "owner" ? defaultOwner.full_name : null) ||
    (profile?.login_id ? `Staf (${profile.login_id})` : null) ||
    (user?.email ? user.email.split("@")[0] : null) ||
    currentRole.replace("_", " ");

  const nameInitials = displayName
    .split(" ")
    .filter(Boolean)
    .map((n: string) => n[0] || "")
    .slice(0, 2)
    .join("")
    .toUpperCase() || currentRole[0].toUpperCase();

  const roleSubtitle = profile?.login_id
    ? `ID: ${profile.login_id}`
    : currentRole === "owner"
    ? "Owner"
    : currentRole === "admin"
    ? "Admin"
    : "Staff";

  return (
    <header className="app-header sticky top-0 z-30 flex h-16 w-full min-w-0 items-center justify-between gap-2 bg-[#EDEDED]/90 px-3 py-2 backdrop-blur-md dark:bg-[#0A0A0A]/90 sm:h-20 sm:gap-4 sm:px-8 sm:py-3">
      {/* Left: Property Name */}
      <div className="min-w-0 flex-1">
        <h1 title={headerProperty?.name || "Properti Kost"} className="truncate text-sm font-black tracking-tight text-neutral-900 dark:text-white sm:text-xl">
          {headerProperty?.name || "Properti Kost"}
        </h1>
      </div>

      {/* Right: Location, Notification Center Popover & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
          aria-pressed={theme === "light"}
          title={theme === "dark" ? "Mode terang" : "Mode gelap"}
          className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-white/70 bg-white/85 px-3 py-2 text-xs font-semibold text-neutral-700 shadow-spatial transition-colors hover:bg-white dark:border-white/10 dark:bg-[#18181B]/85 dark:text-neutral-200 dark:hover:bg-[#242426]"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span className="hidden lg:inline">{theme === "dark" ? "Terang" : "Gelap"}</span>
        </button>

        {/* Property Location Pill */}
        <div className="hidden lg:flex items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-spatial border border-white/60 dark:bg-[#18181B]/80 dark:text-neutral-300 dark:border-white/10 whitespace-nowrap">
          <MapPin className="h-3.5 w-3.5 text-neutral-500" />
          <span className="max-w-[140px] truncate">{headerProperty?.address?.split(",")[0] || headerProperty?.city || "Lokasi"}</span>
        </div>

        {/* Real Functional Notification Center */}
        <NotificationPopover onNavigateTab={onTabChange} />

        {/* User Profile Capsule (Menampilkan Nama Orang & Subtitle Role) */}
        <div
          className={`flex items-center rounded-full border shadow-spatial transition-all sm:pr-1 ${
            activeTab === "profile"
              ? "bg-[#0A0A0A] text-white border-neutral-900 dark:bg-white dark:text-[#0A0A0A]"
              : "bg-white/85 border-white/70 dark:bg-[#18181B]/85 dark:border-white/10"
          }`}
          title={`Login sebagai: ${displayName} (${roleSubtitle}). Klik untuk buka Profil.`}
        >
          <button type="button" aria-label={`Buka profil ${displayName}`} onClick={() => onTabChange("profile")} className="flex h-11 min-w-11 items-center gap-2.5 rounded-full p-1.5 text-left">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full font-black text-xs uppercase shadow-xs shrink-0 ${
              activeTab === "profile"
                ? "bg-[#D9FF43] text-[#0A0A0A]"
                : "bg-[#0A0A0A] text-white dark:bg-white dark:text-[#0A0A0A]"
            }`}
          >
            {nameInitials}
          </div>

          <div className="text-left hidden sm:flex flex-col">
            <p className="text-xs font-black leading-tight max-w-[130px] truncate text-neutral-900 dark:text-white">
              {displayName}
            </p>
            <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-400 capitalize leading-none mt-0.5">
              {roleSubtitle}
            </p>
          </div>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onLogout();
            }}
            title="Keluar Akun (Logout)"
            aria-label="Keluar akun"
            className="ml-1 hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 sm:flex"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
