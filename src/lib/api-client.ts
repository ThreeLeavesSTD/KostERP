import {
  Property,
  Room,
  Tenant,
  Lease,
  Invoice,
  Payment,
  ElectricityTransaction,
  PaymentMethodConfig,
  RoomComplaint,
  CashTransaction,
  FinanceWallet,
  FinanceCategory,
  TransactionType,
  OwnerDashboardMetrics,
  UserProfile,
  RolePermissionConfig,
  Lead,
  SurveySchedule,
} from "@/types";
import { createClient } from "./supabase/client";
import { KostStorage } from "./storage";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000/api";

async function getAuthHeader(): Promise<Record<string, string>> {
  if (typeof window === "undefined") return {};
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  } catch {
    // Ignore error in server-side / SSR contexts
  }
  return {};
}

async function fetchWithFallback<T>(
  endpoint: string,
  fallbackFn: () => T,
  options?: RequestInit
): Promise<T> {
  try {
    const authHeader = await getAuthHeader();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2-second timeout for local backend

    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
        ...(options?.headers || {}),
      },
      signal: controller.signal,
      ...options,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return fallbackFn();
    }

    const result = await res.json();
    return (result.data ?? result) as T;
  } catch {
    // Offline / backend not running / network error -> return local storage data
    return fallbackFn();
  }
}

export const KostApiClient = {
  // Dashboard Metrics (Backend-calculated with KostStorage Single Source of Truth Fallback)
  async getDashboardSummary(): Promise<OwnerDashboardMetrics> {
    return fetchWithFallback<OwnerDashboardMetrics>("/dashboard/summary", () =>
      KostStorage.getOwnerMetrics()
    );
  },

  // Properties
  async getProperties(): Promise<Property[]> {
    return fetchWithFallback<Property[]>("/properties", () =>
      KostStorage.getProperties()
    );
  },

  async getPropertyById(id: string): Promise<Property> {
    return fetchWithFallback<Property>(`/properties/${id}`, () => {
      const all = KostStorage.getProperties();
      return all.find((p) => p.id === id) || all[0];
    });
  },

  async createProperty(property: Partial<Property>): Promise<Property> {
    const local = KostStorage.getProperties()[0] || (property as Property);
    fetchWithFallback("/properties", () => local, {
      method: "POST",
      body: JSON.stringify(property),
    });
    return local;
  },

  async updateProperty(id: string, property: Partial<Property>): Promise<Property> {
    const local = KostStorage.getProperties()[0] || (property as Property);
    fetchWithFallback(`/properties/${id}`, () => local, {
      method: "PUT",
      body: JSON.stringify(property),
    });
    return local;
  },

  async deleteProperty(id: string): Promise<{ success: boolean }> {
    fetchWithFallback(`/properties/${id}`, () => ({ success: true }), {
      method: "DELETE",
    });
    return { success: true };
  },

  // Rooms
  async getRooms(propertyId?: string): Promise<Room[]> {
    const query = propertyId ? `?property_id=${propertyId}` : "";
    return fetchWithFallback<Room[]>(`/rooms${query}`, () =>
      KostStorage.getRooms()
    );
  },

  async createRoom(room: Partial<Room>): Promise<Room> {
    const local = KostStorage.addRoom(room as any);
    fetchWithFallback("/rooms", () => local, {
      method: "POST",
      body: JSON.stringify(room),
    });
    return local;
  },

  async updateRoom(id: string, room: Partial<Room>): Promise<Room> {
    const local = KostStorage.updateRoom(id, room) || (room as Room);
    fetchWithFallback(`/rooms/${id}`, () => local, {
      method: "PUT",
      body: JSON.stringify(room),
    });
    return local;
  },

  async deleteRoom(id: string): Promise<{ success: boolean }> {
    KostStorage.deleteRoom(id);
    fetchWithFallback(`/rooms/${id}`, () => ({ success: true }), {
      method: "DELETE",
    });
    return { success: true };
  },

  // Tenants
  async getTenants(propertyId?: string): Promise<Tenant[]> {
    const query = propertyId ? `?property_id=${propertyId}` : "";
    return fetchWithFallback<Tenant[]>(`/tenants${query}`, () =>
      KostStorage.getTenants()
    );
  },

  async createTenant(tenant: Partial<Tenant>): Promise<Tenant> {
    const local = KostStorage.addTenant(tenant as any);
    fetchWithFallback("/tenants", () => local, {
      method: "POST",
      body: JSON.stringify(tenant),
    });
    return local;
  },

  async updateTenant(id: string, tenant: Partial<Tenant>): Promise<Tenant> {
    const local = KostStorage.updateTenant(id, tenant) || (tenant as Tenant);
    fetchWithFallback(`/tenants/${id}`, () => local, {
      method: "PUT",
      body: JSON.stringify(tenant),
    });
    return local;
  },

  async deleteTenant(id: string): Promise<{ success: boolean }> {
    KostStorage.deleteTenant(id);
    fetchWithFallback(`/tenants/${id}`, () => ({ success: true }), {
      method: "DELETE",
    });
    return { success: true };
  },

  // Leases
  async getLeases(propertyId?: string): Promise<Lease[]> {
    const query = propertyId ? `?property_id=${propertyId}` : "";
    return fetchWithFallback<Lease[]>(`/leases${query}`, () =>
      KostStorage.getLeases()
    );
  },

  async createLease(lease: Partial<Lease>): Promise<Lease> {
    const local = KostStorage.createLease(lease as any);
    fetchWithFallback("/leases", () => local, {
      method: "POST",
      body: JSON.stringify(lease),
    });
    return local;
  },

  async updateLease(id: string, lease: Partial<Lease>): Promise<Lease> {
    const list = KostStorage.getLeases();
    const idx = list.findIndex((l) => l.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...lease };
    }
    fetchWithFallback(`/leases/${id}`, () => lease as Lease, {
      method: "PUT",
      body: JSON.stringify(lease),
    });
    return (list[idx] || lease) as Lease;
  },

  async deleteLease(id: string): Promise<{ success: boolean }> {
    KostStorage.terminateLease(id);
    fetchWithFallback(`/leases/${id}`, () => ({ success: true }), {
      method: "DELETE",
    });
    return { success: true };
  },

  // Invoices
  async getInvoices(propertyId?: string): Promise<Invoice[]> {
    const query = propertyId ? `?property_id=${propertyId}` : "";
    return fetchWithFallback<Invoice[]>(`/invoices${query}`, () =>
      KostStorage.getInvoices()
    );
  },

  async createInvoice(invoice: Partial<Invoice>): Promise<Invoice> {
    const local = KostStorage.addInvoice(invoice as any);
    fetchWithFallback("/invoices", () => local, {
      method: "POST",
      body: JSON.stringify(invoice),
    });
    return local;
  },

  async updateInvoice(id: string, invoice: Partial<Invoice>): Promise<Invoice> {
    const local = KostStorage.updateInvoice(id, invoice) || (invoice as Invoice);
    fetchWithFallback(`/invoices/${id}`, () => local, {
      method: "PUT",
      body: JSON.stringify(invoice),
    });
    return local;
  },

  async deleteInvoice(id: string): Promise<{ success: boolean }> {
    KostStorage.deleteInvoice(id);
    fetchWithFallback(`/invoices/${id}`, () => ({ success: true }), {
      method: "DELETE",
    });
    return { success: true };
  },

  // Payments
  async recordPayment(payload: {
    invoice_id: string;
    amount_paid: number;
    payment_method: string;
    proof_url?: string;
    verified_by?: string;
    notes?: string;
  }): Promise<Payment> {
    const local = KostStorage.verifyPayment(payload as any);
    fetchWithFallback("/payments", () => local, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return local;
  },

  // Payment Methods Config
  async getPaymentMethods(propertyId?: string): Promise<PaymentMethodConfig[]> {
    const query = propertyId ? `?property_id=${propertyId}` : "";
    return fetchWithFallback<PaymentMethodConfig[]>(`/payment-methods${query}`, () =>
      KostStorage.getPaymentMethods()
    );
  },

  async createPaymentMethod(payload: Partial<PaymentMethodConfig>): Promise<PaymentMethodConfig> {
    const all = KostStorage.getPaymentMethods();
    const newMethod: PaymentMethodConfig = {
      id: `pm-${Date.now()}`,
      property_id: payload.property_id || "prop-01",
      bank_name: payload.bank_name || "BCA",
      account_number: payload.account_number || "",
      account_holder: payload.account_holder || "",
      instructions: payload.instructions || "",
      is_active: payload.is_active ?? true,
    };
    KostStorage.updatePaymentMethods([...all, newMethod]);
    fetchWithFallback("/payment-methods", () => newMethod, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return newMethod;
  },

  async updatePaymentMethod(id: string, payload: Partial<PaymentMethodConfig>): Promise<PaymentMethodConfig> {
    const all = KostStorage.getPaymentMethods();
    const updated = all.map((m) => (m.id === id ? { ...m, ...payload } : m));
    KostStorage.updatePaymentMethods(updated);
    const target = updated.find((m) => m.id === id) || (payload as PaymentMethodConfig);
    fetchWithFallback(`/payment-methods/${id}`, () => target, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return target;
  },

  async deletePaymentMethod(id: string): Promise<{ success: boolean }> {
    const all = KostStorage.getPaymentMethods();
    KostStorage.updatePaymentMethods(all.filter((m) => m.id !== id));
    fetchWithFallback(`/payment-methods/${id}`, () => ({ success: true }), {
      method: "DELETE",
    });
    return { success: true };
  },

  // Electricity
  async getElectricityTransactions(propertyId?: string): Promise<ElectricityTransaction[]> {
    const query = propertyId ? `?property_id=${propertyId}` : "";
    return fetchWithFallback<ElectricityTransaction[]>(`/electricity${query}`, () =>
      KostStorage.getElectricityTransactions()
    );
  },

  async createElectricityTransaction(payload: Partial<ElectricityTransaction>): Promise<ElectricityTransaction> {
    const local = KostStorage.addElectricityTransaction(payload as any);
    fetchWithFallback("/electricity", () => local, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return local;
  },

  async updateElectricityTransaction(id: string, payload: Partial<ElectricityTransaction>): Promise<ElectricityTransaction> {
    const local = KostStorage.updateElectricityTransaction(id, payload) || (payload as ElectricityTransaction);
    fetchWithFallback(`/electricity/${id}`, () => local, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return local;
  },

  // Complaints
  async getComplaints(propertyId?: string): Promise<RoomComplaint[]> {
    const query = propertyId ? `?property_id=${propertyId}` : "";
    return fetchWithFallback<RoomComplaint[]>(`/complaints${query}`, () =>
      KostStorage.getComplaints()
    );
  },

  async createComplaint(payload: Partial<RoomComplaint>): Promise<RoomComplaint> {
    const local = KostStorage.addComplaint(payload as any);
    fetchWithFallback("/complaints", () => local, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return local;
  },

  async updateComplaint(id: string, payload: Partial<RoomComplaint>): Promise<RoomComplaint> {
    const local = KostStorage.updateComplaint(id, payload) || (payload as RoomComplaint);
    fetchWithFallback(`/complaints/${id}`, () => local, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return local;
  },

  async deleteComplaint(id: string): Promise<{ success: boolean }> {
    KostStorage.deleteComplaint(id);
    fetchWithFallback(`/complaints/${id}`, () => ({ success: true }), {
      method: "DELETE",
    });
    return { success: true };
  },

  // Finance Wallets
  async getWallets(propertyId?: string): Promise<FinanceWallet[]> {
    const query = propertyId ? `?property_id=${propertyId}` : "";
    return fetchWithFallback<FinanceWallet[]>(`/finance/wallets${query}`, () =>
      KostStorage.getWallets()
    );
  },

  async createWallet(payload: Partial<FinanceWallet>): Promise<FinanceWallet> {
    const local = KostStorage.addWallet(payload as any);
    fetchWithFallback("/finance/wallets", () => local, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return local;
  },

  async updateWallet(id: string, payload: Partial<FinanceWallet>): Promise<FinanceWallet> {
    const local = KostStorage.updateWallet(id, payload) || (payload as FinanceWallet);
    fetchWithFallback(`/finance/wallets/${id}`, () => local, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return local;
  },

  async deleteWallet(id: string): Promise<{ success: boolean }> {
    KostStorage.deleteWallet(id);
    fetchWithFallback(`/finance/wallets/${id}`, () => ({ success: true }), {
      method: "DELETE",
    });
    return { success: true };
  },

  // Finance Categories
  async getFinanceCategories(
    filter?: TransactionType | "asset" | "liability" | "wallet" | "transaction"
  ): Promise<FinanceCategory[]> {
    return fetchWithFallback<FinanceCategory[]>(
      filter ? `/finance/categories?filter=${filter}` : "/finance/categories",
      () => KostStorage.getFinanceCategories(filter)
    );
  },

  async createFinanceCategory(payload: Partial<FinanceCategory>): Promise<FinanceCategory> {
    const local = KostStorage.addFinanceCategory(payload as any);
    fetchWithFallback("/finance/categories", () => local, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return local;
  },

  async updateFinanceCategory(id: string, payload: Partial<FinanceCategory>): Promise<FinanceCategory> {
    const local = KostStorage.updateFinanceCategory(id, payload) || (payload as FinanceCategory);
    fetchWithFallback(`/finance/categories/${id}`, () => local, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return local;
  },

  async deleteFinanceCategory(id: string): Promise<{ success: boolean }> {
    KostStorage.deleteFinanceCategory(id);
    fetchWithFallback(`/finance/categories/${id}`, () => ({ success: true }), {
      method: "DELETE",
    });
    return { success: true };
  },

  // Cash Transactions
  async getCashTransactions(propertyId?: string): Promise<CashTransaction[]> {
    const query = propertyId ? `?property_id=${propertyId}` : "";
    return fetchWithFallback<CashTransaction[]>(`/finance/transactions${query}`, () =>
      KostStorage.getCashTransactions()
    );
  },

  async createCashTransaction(payload: Partial<CashTransaction>): Promise<CashTransaction> {
    const local = KostStorage.addCashTransaction(payload as any);
    fetchWithFallback("/finance/transactions", () => local, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return local;
  },

  async updateCashTransaction(id: string, payload: Partial<CashTransaction>): Promise<CashTransaction> {
    const local = KostStorage.updateCashTransaction(id, payload) || (payload as CashTransaction);
    fetchWithFallback(`/finance/transactions/${id}`, () => local, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return local;
  },

  async deleteCashTransaction(id: string): Promise<{ success: boolean }> {
    KostStorage.deleteCashTransaction(id);
    fetchWithFallback(`/finance/transactions/${id}`, () => ({ success: true }), {
      method: "DELETE",
    });
    return { success: true };
  },

  // Staff Management
  async getStaff(propertyId?: string): Promise<UserProfile[]> {
    const query = propertyId ? `?property_id=${propertyId}` : "";
    return fetchWithFallback<UserProfile[]>(`/staff${query}`, () =>
      KostStorage.getStaffAccounts() as any
    );
  },

  async createStaff(payload: {
    full_name: string;
    role: string;
    email?: string;
    phone_number?: string;
    login_id?: string;
    password?: string;
  }): Promise<{
    id: string;
    login_id: string;
    full_name: string;
    role: string;
    email?: string | null;
    phone_number?: string | null;
    password: string;
  }> {
    const local = KostStorage.addStaffAccount(payload as any);
    fetchWithFallback("/staff", () => local, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return local as any;
  },

  async resetStaffPassword(id: string, password?: string): Promise<{ password: string }> {
    const pass = password || "123456";
    KostStorage.updateStaffAccount(id, { password: pass });
    fetchWithFallback(`/staff/${id}/reset-password`, () => ({ password: pass }), {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    return { password: pass };
  },

  async updateStaff(
    id: string,
    payload: {
      role?: string;
      is_active?: boolean;
      full_name?: string;
      phone_number?: string;
      email?: string;
      login_id?: string;
    }
  ): Promise<UserProfile> {
    const local = KostStorage.updateStaffAccount(id, payload as any);
    fetchWithFallback(`/staff/${id}`, () => local as any, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return local as any;
  },

  // Roles & Permissions Management
  async getRoles(propertyId?: string): Promise<RolePermissionConfig[]> {
    const query = propertyId ? `?property_id=${propertyId}` : "";
    return fetchWithFallback<RolePermissionConfig[]>(`/roles${query}`, () => [
      {
        id: "owner",
        name: "Owner",
        description: "Pemilik properti dengan akses penuh ke seluruh fitur dan finansial",
        badge_color: "lime",
        is_system: true,
        permissions: ["owner-dashboard", "ai-assistant", "cashflow", "rooms", "tenants", "electricity", "billing", "owner-audit", "billing-settings", "staff-management", "profile"],
      },
      {
        id: "admin",
        name: "Admin Pengelola",
        description: "Operasional kamar, data penghuni, penagihan invoice, dan catat transaksi kas",
        badge_color: "info",
        is_system: true,
        permissions: ["owner-dashboard", "ai-assistant", "cashflow", "rooms", "tenants", "electricity", "billing", "owner-audit", "billing-settings", "profile"],
      },
      {
        id: "cleaning_staff",
        name: "Cleaning & Maintenance Staff",
        description: "Monitoring status kebersihan kamar dan respon komplain fasilitas kamar",
        badge_color: "warning",
        is_system: true,
        permissions: ["rooms", "ai-assistant", "profile"],
      },
    ]);
  },

  async createRole(payload: {
    id?: string;
    name: string;
    description?: string;
    badge_color?: string;
    permissions: string[];
  }): Promise<RolePermissionConfig> {
    const fallbackObj: RolePermissionConfig = {
      id: payload.id || `role-${Date.now()}`,
      name: payload.name,
      description: payload.description || "",
      badge_color: payload.badge_color || "info",
      is_system: false,
      permissions: payload.permissions,
    };
    return fetchWithFallback<RolePermissionConfig>("/roles", () => fallbackObj, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateRole(
    id: string,
    payload: {
      name?: string;
      description?: string;
      badge_color?: string;
      permissions?: string[];
    }
  ): Promise<RolePermissionConfig> {
    const fallbackObj: RolePermissionConfig = {
      id,
      name: payload.name || "",
      description: payload.description || "",
      badge_color: payload.badge_color || "info",
      is_system: ["owner", "admin", "cleaning_staff"].includes(id),
      permissions: payload.permissions || [],
    };
    return fetchWithFallback<RolePermissionConfig>(`/roles/${id}`, () => fallbackObj, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteRole(id: string): Promise<{ success: boolean; message?: string }> {
    return fetchWithFallback<{ success: boolean; message?: string }>(
      `/roles/${id}`,
      () => ({ success: true }),
      {
        method: "DELETE",
      }
    );
  },

  // Leads & Surveys
  async getLeads(propertyId?: string): Promise<Lead[]> {
    const query = propertyId ? `?propertyId=${propertyId}` : "";
    return fetchWithFallback<Lead[]>(`/leads${query}`, () => []);
  },

  async createLead(payload: Partial<Lead>): Promise<Lead> {
    return fetchWithFallback<Lead>("/leads", () => payload as Lead, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateLead(id: string, payload: Partial<Lead>): Promise<Lead> {
    return fetchWithFallback<Lead>(`/leads/${id}`, () => payload as Lead, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteLead(id: string): Promise<{ success: boolean }> {
    return fetchWithFallback<{ success: boolean }>(
      `/leads/${id}`,
      () => ({ success: true }),
      {
        method: "DELETE",
      }
    );
  },

  async getSurveys(propertyId?: string): Promise<SurveySchedule[]> {
    const query = propertyId ? `?propertyId=${propertyId}` : "";
    return fetchWithFallback<SurveySchedule[]>(`/surveys${query}`, () => []);
  },

  async createSurvey(payload: Partial<SurveySchedule>): Promise<SurveySchedule> {
    return fetchWithFallback<SurveySchedule>("/surveys", () => payload as SurveySchedule, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateSurvey(id: string, payload: Partial<SurveySchedule>): Promise<SurveySchedule> {
    return fetchWithFallback<SurveySchedule>(`/surveys/${id}`, () => payload as SurveySchedule, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteSurvey(id: string): Promise<{ success: boolean }> {
    return fetchWithFallback<{ success: boolean }>(
      `/surveys/${id}`,
      () => ({ success: true }),
      {
        method: "DELETE",
      }
    );
  },
};
