"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { KostStorage } from "@/lib/storage";
import { FinanceApi } from "@/lib/finance-api";
import type { FinanceData } from "@/lib/finance";

function readData(propertyId: string): FinanceData {
  const scoped = <T extends { property_id: string }>(rows: T[]) => rows.filter(r => r.property_id === propertyId);
  const rooms = scoped(KostStorage.getRooms()), leases = scoped(KostStorage.getLeases()), tenants = scoped(KostStorage.getTenants());
  return {
    rooms, leases,
    invoices: scoped(KostStorage.getInvoices()).map(invoice => {
      const lease = leases.find(l => l.id === invoice.lease_id);
      const room = rooms.find(r => r.id === (invoice.room_id || lease?.room_id));
      const tenant = tenants.find(t => t.id === lease?.tenant_id);
      return { ...invoice, room_id: invoice.room_id || room?.id, room_number: room?.room_number || invoice.room_number, tenant_name: tenant?.full_name || invoice.tenant_name, tenant_phone: tenant?.phone_number || invoice.tenant_phone };
    }), transactions: scoped(KostStorage.getCashTransactions()),
    wallets: scoped(KostStorage.getWallets()), expenses: scoped(KostStorage.getExpenses()),
    budgets: scoped(KostStorage.getFinanceBudgets()), investments: scoped(KostStorage.getRoomInvestments()),
    tenants, electricity: scoped(KostStorage.getElectricityTransactions()),
  };
}
export function useFinanceData(propertyId: string) {
  const [data, setData] = useState(() => readData(propertyId));
  const [loading, setLoading] = useState(true);
  const [local, setLocal] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const currentRequest = ++request.current;
    setLoading(true);
    setError("");
    try {
      const result = await FinanceApi.load(propertyId);
      if (currentRequest === request.current) setLocal(result.local);
    } catch (e) {
      if (currentRequest === request.current) setError(e instanceof Error ? e.message : (e as { message?: string })?.message || "Sinkronisasi gagal. Periksa koneksi dan migrasi finance.");
    } finally { if (currentRequest === request.current) { setData(readData(propertyId)); setLoading(false); } }
  }, [propertyId]);
  useEffect(() => {
    setData(readData(propertyId));
    setLocal(null);
    void refresh();
    const listener = () => setData(readData(propertyId));
    window.addEventListener("kost_storage_change", listener);
    window.addEventListener("storage", listener);
    return () => { request.current++; window.removeEventListener("kost_storage_change", listener); window.removeEventListener("storage", listener); };
  }, [propertyId, refresh]);
  return { data, loading, local, error, refresh };
}
