"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Property } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { KostStorage } from "@/lib/storage";
import { useAuth } from "@/lib/auth-context";

interface FinanceWorkspaceState {
  properties: Property[];
  activeProperty: Property | undefined;
  activePropertyId: string;
  canSwitchProperties: boolean;
  selectProperty: (propertyId: string) => void;
}

const FinanceWorkspaceContext = createContext<FinanceWorkspaceState | null>(null);

function selectedPropertyKey(userId: string) {
  return `kost_active_finance_property:${userId}`;
}

export function FinanceWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, role } = useAuth();
  const effectiveRole = profile?.role || role;
  const userId = profile?.id || user?.id || "local-owner";
  const [properties, setProperties] = useState<Property[]>([]);
  const [activePropertyId, setActivePropertyId] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      let rows: Property[] = [];
      try {
        const localUser = typeof window !== "undefined" && localStorage.getItem("kost_local_auth_user");
        if (localUser) {
          rows = KostStorage.getProperties();
        } else {
          const client = createClient();
          const { data: { session }, error: sessionError } = await client.auth.getSession();
          if (sessionError) throw sessionError;
          if (session) {
            const { data, error } = await client.from("properties").select("*").order("created_at", { ascending: true });
            if (error) throw error;
            rows = (data || []) as Property[];
          }
        }
      } catch {
        rows = [];
      }
      if (effectiveRole !== "owner") {
        rows = profile?.property_id ? rows.filter(property => property.id === profile.property_id) : [];
      }
      if (cancelled) return;
      setProperties(rows);
      let savedId = "";
      try { savedId = localStorage.getItem(selectedPropertyKey(userId)) || ""; } catch { /* Storage may be disabled. */ }
      const selected = rows.find(property => property.id === savedId)
        || rows.find(property => property.id === profile?.property_id)
        || rows[0];
      setActivePropertyId(selected?.id || "");
    };
    void load();
    return () => { cancelled = true; };
  }, [effectiveRole, profile?.property_id, userId]);

  const selectProperty = useCallback((propertyId: string) => {
    if (effectiveRole !== "owner" || !properties.some(property => property.id === propertyId)) return;
    setActivePropertyId(propertyId);
    try { localStorage.setItem(selectedPropertyKey(userId), propertyId); } catch { /* Keep this selection for the current session. */ }
  }, [effectiveRole, properties, userId]);

  const activeProperty = properties.find(property => property.id === activePropertyId);
  const value = useMemo(() => ({
    properties,
    activeProperty,
    activePropertyId: activeProperty?.id || "",
    canSwitchProperties: effectiveRole === "owner" && properties.length > 1,
    selectProperty,
  }), [properties, activeProperty, effectiveRole, selectProperty]);

  return <FinanceWorkspaceContext.Provider value={value}>{children}</FinanceWorkspaceContext.Provider>;
}

export function useFinanceWorkspace() {
  const workspace = useContext(FinanceWorkspaceContext);
  if (!workspace) throw new Error("FinanceWorkspaceProvider is missing.");
  return workspace;
}

export function FinancePropertyPicker({ className = "" }: { className?: string }) {
  const { properties, activeProperty, activePropertyId, canSwitchProperties, selectProperty } = useFinanceWorkspace();
  if (!activeProperty || !canSwitchProperties) return null;
  return (
    <label className={`flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs text-neutral-400 ${className}`}>
      <span className="shrink-0">Properti</span>
      <select
        aria-label="Workspace properti finance"
        value={activePropertyId}
        onChange={event => selectProperty(event.target.value)}
        className="min-w-0 flex-1 bg-transparent py-2 font-semibold text-white outline-none"
      >
        {properties.map(property => <option key={property.id} value={property.id} className="bg-neutral-900 text-white">{property.name}</option>)}
      </select>
    </label>
  );
}
