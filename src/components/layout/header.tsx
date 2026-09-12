"use client";

import React, { useState, useEffect } from "react";
import {
  MapPin,
  LogOut,
} from "lucide-react";
import { UserRole } from "@/types";
import { KostApiClient } from "@/lib/api-client";
import { KostStorage } from "@/lib/storage";
import { useAuth } from "@/lib/auth-context";
import { NotificationPopover } from "./notification-popover";

interface HeaderProps {
  currentRole: UserRole;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

export function Header({ currentRole, activeTab, onTabChange, onLogout }: HeaderProps) {
  const { profile, user } = useAuth();
  const [propertyName, setPropertyName] = useState("Kost Putri Graha Asri");
  const [propertyAddress, setPropertyAddress] = useState("Margonda, Depok");

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

  const fetchPropertyInfo = () => {
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
  };

  useEffect(() => {
    fetchPropertyInfo();

    const handleStorageChange = (e: any) => {
      if (!e.detail?.key || e.detail.key === "kost_erp_properties") {
        fetchPropertyInfo();
      }
    };

    window.addEventListener("kost_storage_change", handleStorageChange);
    return () => {
      window.removeEventListener("kost_storage_change", handleStorageChange);
    };
  }, [activeTab]);

  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between px-4 sm:px-8 py-3 bg-[#EDEDED]/90 dark:bg-[#0A0A0A]/90 backdrop-blur-md gap-2 sm:gap-4">
      {/* Left: Property Name */}
      <div className="flex items-center shrink-0">
        <h1 className="text-base sm:text-xl font-black tracking-tight text-neutral-900 dark:text-white whitespace-nowrap">
          {propertyName}
        </h1>
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

        {/* User Profile Capsule (Menampilkan Nama Orang & Subtitle Role) */}
        <div
          onClick={() => onTabChange("profile")}
          className={`flex items-center gap-2.5 rounded-full pl-2 pr-3 py-1.5 shadow-spatial border transition-all cursor-pointer hover:shadow-spatial-lg ${
            activeTab === "profile"
              ? "bg-[#0A0A0A] text-white border-neutral-900 dark:bg-white dark:text-[#0A0A0A]"
              : "bg-white/85 border-white/70 dark:bg-[#18181B]/85 dark:border-white/10"
          }`}
          title={`Login sebagai: ${displayName} (${roleSubtitle}). Klik untuk buka Profil.`}
        >
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

          <button
            onClick={(e) => {
              e.stopPropagation();
              onLogout();
            }}
            title="Keluar Akun (Logout)"
            className="ml-0.5 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-1 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
