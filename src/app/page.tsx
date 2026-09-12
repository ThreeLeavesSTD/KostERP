"use client";

import React, { useState, useEffect, useCallback } from "react";
import { UserRole } from "@/types";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
// Views
import { OwnerDashboardView } from "@/components/owner/owner-dashboard-view";
import { OwnerAuditView } from "@/components/owner/owner-audit-view";
import { RoomsView } from "@/components/rooms/rooms-view";
import { RoomTypesView } from "@/components/rooms/room-types-view";
import { TenantsView } from "@/components/tenants/tenants-view";
import { ElectricityView } from "@/components/electricity/electricity-view";
import { BillingView } from "@/components/billing/billing-view";
import { AIAssistantView } from "@/components/assistant/ai-assistant-view";
import { FloatingAIChatbot } from "@/components/assistant/floating-ai-chatbot";
import { ProfileView } from "@/components/profile/profile-view";
import { StaffManagementView } from "@/components/staff/staff-management-view";
import { CashFlowView } from "@/components/finance/cashflow-view";
import { LeadsView } from "@/components/leads/leads-view";
import { PropertySettingsView } from "@/components/property/property-settings-view";

import { useAuth } from "@/lib/auth-context";
import { hasPermission, getPermissionsForRole, ALL_PERMISSIONS } from "@/lib/permissions";
import { LoginForm } from "@/components/auth/login-form";

export default function HomePage() {
  const { user, profile, role, isLoading, signOut } = useAuth();
  const currentRole = (profile?.role || role || "admin") as UserRole;
  const isAuthenticated = !!user;

  const [activeTab, setActiveTab] = useState<string>("owner-dashboard");
  const [isAiChatOpen, setIsAiChatOpen] = useState<boolean>(false);
  const [assistantInitialPrompt, setAssistantInitialPrompt] = useState<string>("");
  const [isTabInitialized, setIsTabInitialized] = useState<boolean>(false);

  useEffect(() => {
    // Prevent non-Error Event objects from bubbling to Next.js dev overlay
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (
        event.reason instanceof Event ||
        (event.reason && typeof event.reason === "object" && !("stack" in event.reason) && !("message" in event.reason))
      ) {
        event.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  // Helper untuk menentukan tab default sesuai izin role
  const getDefaultTab = useCallback((userRole: UserRole, userPerms?: string[]) => {
    if (hasPermission(userRole, "owner-dashboard", userPerms)) return "owner-dashboard";
    if (hasPermission(userRole, "rooms", userPerms)) return "rooms";
    const allowed = getPermissionsForRole(userRole, userPerms);
    return allowed[0] || "profile";
  }, []);

  // Navigasi tab dengan persistensi ke URL hash & LocalStorage
  const handleNavigateTab = useCallback((tab: string, prompt?: string) => {
    // Menu AI Chatbot sekarang menjadi pop-up di pojok kanan bawah agar pengguna bisa membuka menu lain sambil chat
    if (tab === "ai-assistant") {
      setIsAiChatOpen((prev) => !prev);
      if (prompt) {
        setAssistantInitialPrompt(prompt);
      }
      return;
    }

    if (!tab || typeof tab !== "string" || !ALL_PERMISSIONS.includes(tab)) return;
    if (prompt) {
      setAssistantInitialPrompt(prompt);
    }
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("kost_active_tab", tab);
        if (window.location.hash !== `#${tab}`) {
          window.history.replaceState(null, "", `#${tab}`);
        }
      } catch {}
    }
  }, []);

  // 1. Inisialisasi tab saat pertama kali render di browser (baca URL pathname / hash / search / localStorage)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const rawPath = window.location.pathname.replace(/^\/+/, "").split("/")[0].trim();
    const hash = window.location.hash.replace("#", "").trim();
    const queryTab = new URLSearchParams(window.location.search).get("tab")?.trim();
    const localTab = localStorage.getItem("kost_active_tab")?.trim();

    const candidateTab = [rawPath, hash, queryTab, localTab].find(
      (t) => t && ALL_PERMISSIONS.includes(t)
    );

    if (candidateTab === "ai-assistant") {
      setActiveTab("owner-dashboard");
      setIsAiChatOpen(true);
    } else if (candidateTab) {
      setActiveTab(candidateTab);
    }
    setIsTabInitialized(true);
  }, []);

  // 2. Validasi izin akses tab saat autentikasi & profil termuat
  // CATATAN: Jangan mereset tab jika tab yang sedang aktif diizinkan untuk role ini!
  useEffect(() => {
    if (!isAuthenticated || !isTabInitialized) return;

    // Cek apakah tab saat ini diizinkan
    const isAllowed = hasPermission(currentRole, activeTab, profile?.permissions);

    if (isAllowed) {
      // Tab saat ini sah & diizinkan, sinkronkan ke URL & storage
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("kost_active_tab", activeTab);
          if (window.location.hash !== `#${activeTab}`) {
            window.history.replaceState(null, "", `#${activeTab}`);
          }
        } catch {}
      }
    } else {
      // Tab saat ini tidak diizinkan untuk role ini, alihkan ke default tab yang diizinkan
      const fallbackTab = getDefaultTab(currentRole, profile?.permissions);
      handleNavigateTab(fallbackTab);
    }
  }, [isAuthenticated, isTabInitialized, currentRole, profile?.permissions, activeTab, getDefaultTab, handleNavigateTab]);

  // 3. Listener perubahan URL hash / browser back & forward (popstate & hashchange)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleLocationChange = () => {
      const rawPath = window.location.pathname.replace(/^\/+/, "").split("/")[0].trim();
      const hash = window.location.hash.replace("#", "").trim();
      const candidate = (rawPath && ALL_PERMISSIONS.includes(rawPath)) ? rawPath : hash;

      if (candidate && ALL_PERMISSIONS.includes(candidate) && hasPermission(currentRole, candidate, profile?.permissions)) {
        setActiveTab(candidate);
        try {
          localStorage.setItem("kost_active_tab", candidate);
        } catch {}
      }
    };

    window.addEventListener("hashchange", handleLocationChange);
    window.addEventListener("popstate", handleLocationChange);
    return () => {
      window.removeEventListener("hashchange", handleLocationChange);
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, [currentRole, profile?.permissions]);

  const handleLogout = async () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("kost_active_tab");
        window.history.replaceState(null, "", window.location.pathname);
      } catch {}
    }
    await signOut();
  };

  const handleCreateLeaseForRoom = (roomId: string) => {
    handleNavigateTab("tenants");
  };

  const handleOpenElectricityForRoom = (roomId: string) => {
    handleNavigateTab("electricity");
  };

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#EDEDED] dark:bg-[#0A0A0A] text-neutral-900 dark:text-white transition-colors">
      {/* Top Floating App Header */}
      <Header
        currentRole={currentRole}
        activeTab={activeTab}
        onTabChange={handleNavigateTab}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <div className="flex-1 px-2 sm:px-6 pb-6">
        {/* Desktop Floating Slim Dock (Fixed in view) */}
        <Sidebar
          currentRole={currentRole}
          activeTab={activeTab}
          onTabChange={handleNavigateTab}
        />

        {/* Content Area with left offset for fixed dock */}
        <main className="md:pl-24 rounded-3xl p-3 sm:p-5 lg:p-6 pb-28 md:pb-6">
          <div className="mx-auto max-w-7xl">
            {activeTab === "owner-dashboard" && (
              <OwnerDashboardView onNavigateTab={handleNavigateTab} />
            )}
            {activeTab === "ai-assistant" && (
              <AIAssistantView
                initialPrompt={assistantInitialPrompt}
                onNavigateTab={handleNavigateTab}
                onClearInitialPrompt={() => setAssistantInitialPrompt("")}
              />
            )}
            {activeTab === "cashflow" && (
              <CashFlowView currentRole={currentRole} />
            )}
            {activeTab === "staff-management" && (
              <StaffManagementView
                currentRole={currentRole}
                onNavigateTab={handleNavigateTab}
              />
            )}
            {activeTab === "profile" && (
              <ProfileView
                currentRole={currentRole}
                onNavigateTab={handleNavigateTab}
                onLogout={handleLogout}
              />
            )}
            {activeTab === "owner-audit" && <OwnerAuditView />}
            {activeTab === "rooms" && (
              <RoomsView
                onCreateLeaseForRoom={handleCreateLeaseForRoom}
                onOpenElectricityForRoom={handleOpenElectricityForRoom}
                onNavigateTab={handleNavigateTab}
              />
            )}
            {activeTab === "room-types" && (
              <RoomTypesView
                currentRole={currentRole}
                onNavigateTab={handleNavigateTab}
              />
            )}
            {activeTab === "tenants" && <TenantsView />}
            {activeTab === "leads" && <LeadsView currentRole={currentRole} />}
            {activeTab === "electricity" && <ElectricityView />}
            {activeTab === "billing" && <BillingView />}
            {activeTab === "property-settings" && (
              <PropertySettingsView currentRole={currentRole} />
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        currentRole={currentRole}
        activeTab={activeTab}
        onTabChange={handleNavigateTab}
      />

      {/* Floating AI Chatbot Pop-up di Pojok Kanan Bawah */}
      <FloatingAIChatbot
        isOpen={isAiChatOpen}
        onToggle={() => setIsAiChatOpen((prev) => !prev)}
        onClose={() => setIsAiChatOpen(false)}
        initialPrompt={assistantInitialPrompt}
        onClearInitialPrompt={() => setAssistantInitialPrompt("")}
        onNavigateTab={handleNavigateTab}
      />
    </div>
  );
}
