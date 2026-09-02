"use client";

import React, { useState, useEffect } from "react";
import { UserRole } from "@/types";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
// Views
import { OwnerDashboardView } from "@/components/owner/owner-dashboard-view";
import { OwnerAuditView } from "@/components/owner/owner-audit-view";
import { RoomsView } from "@/components/rooms/rooms-view";
import { TenantsView } from "@/components/tenants/tenants-view";
import { ElectricityView } from "@/components/electricity/electricity-view";
import { BillingView } from "@/components/billing/billing-view";
import { PaymentSettingsView } from "@/components/billing/payment-settings-view";
import { AIAssistantView } from "@/components/assistant/ai-assistant-view";
import { ProfileView } from "@/components/profile/profile-view";
import { StaffManagementView } from "@/components/staff/staff-management-view";
import { CashFlowView } from "@/components/finance/cashflow-view";

import { useAuth } from "@/lib/auth-context";
import { hasPermission, getPermissionsForRole } from "@/lib/permissions";
import { LoginForm } from "@/components/auth/login-form";

export default function HomePage() {
  const { user, profile, role, isLoading, signOut } = useAuth();
  const currentRole = (profile?.role || role || "admin") as UserRole;
  const isAuthenticated = !!user;

  const [activeTab, setActiveTab] = useState<string>("owner-dashboard");
  const [assistantInitialPrompt, setAssistantInitialPrompt] = useState<string>("");

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

  // Update tab default berdasarkan role user yang aktif
  useEffect(() => {
    if (isAuthenticated) {
      if (hasPermission(currentRole, "owner-dashboard")) {
        setActiveTab("owner-dashboard");
      } else if (hasPermission(currentRole, "rooms")) {
        setActiveTab("rooms");
      } else {
        const perms = getPermissionsForRole(currentRole);
        setActiveTab(perms[0] || "profile");
      }
    }
  }, [isAuthenticated, currentRole]);

  const handleNavigateTab = (tab: string, prompt?: string) => {
    if (prompt) {
      setAssistantInitialPrompt(prompt);
    }
    setActiveTab(tab);
  };

  const handleLogout = async () => {
    await signOut();
  };

  const handleCreateLeaseForRoom = (roomId: string) => {
    setActiveTab("tenants");
  };

  const handleOpenElectricityForRoom = (roomId: string) => {
    setActiveTab("electricity");
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
          <p className="mt-3 text-xs font-semibold text-gray-500">Memuat Sistem ERP Kost...</p>
        </div>
      </div>
    );
  }

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
        <main className="md:pl-20 rounded-3xl p-3 sm:p-5 lg:p-6 pb-28 md:pb-6">
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
              />
            )}
            {activeTab === "tenants" && <TenantsView />}
            {activeTab === "electricity" && <ElectricityView />}
            {activeTab === "billing" && <BillingView />}
            {activeTab === "billing-settings" && <PaymentSettingsView />}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        currentRole={currentRole}
        activeTab={activeTab}
        onTabChange={handleNavigateTab}
      />
    </div>
  );
}
