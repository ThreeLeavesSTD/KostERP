"use client";

import React, { useState, useEffect } from "react";
import {
  MapPin,
  LogOut,
} from "lucide-react";
import { UserRole } from "@/types";
import { KostApiClient } from "@/lib/api-client";
import { NotificationPopover } from "./notification-popover";

interface HeaderProps {
  currentRole: UserRole;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

export function Header({ currentRole, activeTab, onTabChange, onLogout }: HeaderProps) {
  const [propertyName, setPropertyName] = useState("Kost Putri Graha Asri");
  const [propertyAddress, setPropertyAddress] = useState("Margonda, Depok");

  useEffect(() => {
    KostApiClient.getProperties()
      .then((props) => {
        if (props.length > 0) {
          setPropertyName(props[0].name);
          if (props[0].address) {
            setPropertyAddress(props[0].address.split(",")[0] || "Depok");
          }
        }
      })
      .catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between px-4 sm:px-8 py-3 bg-[#EDEDED]/90 dark:bg-[#0A0A0A]/90 backdrop-blur-md gap-2 sm:gap-4">
      {/* Left: Brand Monogram & Property Information */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0A0A0A] text-white shadow-sm dark:bg-white dark:text-[#0A0A0A] transition-transform hover:scale-105">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-black tracking-tight text-neutral-900 dark:text-white whitespace-nowrap">
              {propertyName}
            </h1>
            <span className="rounded-full bg-[#D9FF43] px-2 py-0.5 text-[10px] font-black text-[#0A0A0A]">
              ERP 2.0
            </span>
          </div>
          <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            Sistem Operasional & Token Listrik
          </p>
        </div>
      </div>

      {/* Right: Location, Notification Center Popover & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Property Location Pill */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-spatial border border-white/60 dark:bg-[#18181B]/80 dark:text-neutral-300 dark:border-white/10 whitespace-nowrap">
          <MapPin className="h-3.5 w-3.5 text-neutral-500" />
          <span className="max-w-[140px] truncate">{propertyAddress}</span>
        </div>

        {/* Real Functional Notification Center */}
        <NotificationPopover onNavigateTab={onTabChange} />

        {/* User Profile Capsule */}
        <div
          onClick={() => onTabChange("profile")}
          className={`flex items-center gap-2 rounded-full pl-2 pr-2.5 py-1.5 shadow-spatial border transition-all cursor-pointer hover:shadow-spatial-lg ${
            activeTab === "profile"
              ? "bg-[#0A0A0A] text-white border-neutral-900 dark:bg-white dark:text-[#0A0A0A]"
              : "bg-white/85 border-white/70 dark:bg-[#18181B]/85 dark:border-white/10"
          }`}
          title="Buka Profil Pengguna & Keamanan"
        >
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full font-black text-xs uppercase shadow-xs ${
              activeTab === "profile"
                ? "bg-[#D9FF43] text-[#0A0A0A]"
                : "bg-[#0A0A0A] text-white dark:bg-white dark:text-[#0A0A0A]"
            }`}
          >
            {currentRole[0]}
          </div>

          <div className="text-left hidden sm:block">
            <p className="text-xs font-black capitalize leading-tight">
              {currentRole.replace("_", " ")}
            </p>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onLogout();
            }}
            title="Keluar Akun (Logout)"
            className="ml-0.5 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-1 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/40"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
