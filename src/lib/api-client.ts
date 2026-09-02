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
  OwnerDashboardMetrics,
  UserProfile,
} from "@/types";
import { createClient } from "./supabase/client";

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

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `HTTP error! status: ${res.status}`);
  }

  const result = await res.json();
  return result.data ?? result;
}

export const KostApiClient = {
  // Dashboard Metrics (Backend-calculated Single Source of Truth)
  async getDashboardSummary(): Promise<OwnerDashboardMetrics> {
    return fetchJson<OwnerDashboardMetrics>("/dashboard/summary");
  },

  // Properties
  async getProperties(): Promise<Property[]> {
    return fetchJson<Property[]>("/properties");
  },

  async getPropertyById(id: string): Promise<Property> {
    return fetchJson<Property>(`/properties/${id}`);
  },

  async createProperty(property: Partial<Property>): Promise<Property> {
    return fetchJson<Property>("/properties", {
      method: "POST",
      body: JSON.stringify(property),
    });
  },

  async updateProperty(id: string, property: Partial<Property>): Promise<Property> {
    return fetchJson<Property>(`/properties/${id}`, {
      method: "PUT",
      body: JSON.stringify(property),
    });
  },

  async deleteProperty(id: string): Promise<{ success: boolean }> {
    return fetchJson<{ success: boolean }>(`/properties/${id}`, {
      method: "DELETE",
    });
  },

  // Rooms
  async getRooms(propertyId?: string): Promise<Room[]> {
    const query = propertyId ? `?property_id=${propertyId}` : "";
    return fetchJson<Room[]>(`/rooms${query}`);
  },

  async createRoom(room: Partial<Room>): Promise<Room> {
    return fetchJson<Room>("/rooms", {
      method: "POST",
      body: JSON.stringify(room),
    });
  },

  async updateRoom(id: string, room: Partial<Room>): Promise<Room> {
    return fetchJson<Room>(`/rooms/${id}`, {
      method: "PUT",
      body: JSON.stringify(room),
    });
  },

  async deleteRoom(id: string): Promise<{ success: boolean }> {
    return fetchJson<{ success: boolean }>(`/rooms/${id}`, {
      method: "DELETE",
    });
  },

  // Tenants
  async getTenants(propertyId?: string): Promise<Tenant[]> {
    const query = propertyId ? `?property_id=${propertyId}` : "";
    return fetchJson<Tenant[]>(`/tenants${query}`);
  },

  async createTenant(tenant: Partial<Tenant>): Promise<Tenant> {
    return fetchJson<Tenant>("/tenants", {
      method: "POST",
      body: JSON.stringify(tenant),
    });
  },

  async updateTenant(id: string, tenant: Partial<Tenant>): Promise<Tenant> {
    return fetchJson<Tenant>(`/tenants/${id}`, {
      method: "PUT",
      body: JSON.stringify(tenant),
    });
  },

  async deleteTenant(id: string): Promise<{ success: boolean }> {
    return fetchJson<{ success: boolean }>(`/tenants/${id}`, {
      method: "DELETE",
    });
  },

  // Leases
  async getLeases(propertyId?: string): Promise<Lease[]> {
    const query = propertyId ? `?property_id=${propertyId}` : "";
    return fetchJson<Lease[]>(`/leases${query}`);
  },

  async createLease(lease: Partial<Lease>): Promise<Lease> {
    return fetchJson<Lease>("/leases", {
      method: "POST",
      body: JSON.stringify(lease),
    });
  },

  async updateLease(id: string, lease: Partial<Lease>): Promise<Lease> {
    return fetchJson<Lease>(`/leases/${id}`, {
      method: "PUT",
      body: JSON.stringify(lease),
    });
  },

  async deleteLease(id: string): Promise<{ success: boolean }> {
    return fetchJson<{ success: boolean }>(`/leases/${id}`, {
      method: "DELETE",
    });
  },

  // Invoices
  async getInvoices(propertyId?: string): Promise<Invoice[]> {
    const query = propertyId ? `?property_id=${propertyId}` : "";
    return fetchJson<Invoice[]>(`/invoices${query}`);
  },

  async createInvoice(invoice: Partial<Invoice>): Promise<Invoice> {
    return fetchJson<Invoice>("/invoices", {
      method: "POST",
      body: JSON.stringify(invoice),
    });
  },

  async updateInvoice(id: string, invoice: Partial<Invoice>): Promise<Invoice> {
    return fetchJson<Invoice>(`/invoices/${id}`, {
      method: "PUT",
      body: JSON.stringify(invoice),
    });
  },

  async deleteInvoice(id: string): Promise<{ success: boolean }> {
    return fetchJson<{ success: boolean }>(`/invoices/${id}`, {
      method: "DELETE",
    });
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
    return fetchJson<Payment>("/payments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // Payment Methods Config
  async getPaymentMethods(propertyId?: string): Promise<PaymentMethodConfig[]> {
    const query = propertyId ? `?property_id=${propertyId}` : "";
    return fetchJson<PaymentMethodConfig[]>(`/payment-methods${query}`);
  },

  async createPaymentMethod(payload: Partial<PaymentMethodConfig>): Promise<PaymentMethodConfig> {
    return fetchJson<PaymentMethodConfig>("/payment-methods", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updatePaymentMethod(id: string, payload: Partial<PaymentMethodConfig>): Promise<PaymentMethodConfig> {
    return fetchJson<PaymentMethodConfig>(`/payment-methods/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deletePaymentMethod(id: string): Promise<{ success: boolean }> {
    return fetchJson<{ success: boolean }>(`/payment-methods/${id}`, {
      method: "DELETE",
    });
  },

  // Electricity
  async getElectricityTransactions(propertyId?: string): Promise<ElectricityTransaction[]> {
    const query = propertyId ? `?property_id=${propertyId}` : "";
    return fetchJson<ElectricityTransaction[]>(`/electricity${query}`);
  },

  async createElectricityTransaction(payload: Partial<ElectricityTransaction>): Promise<ElectricityTransaction> {
    return fetchJson<ElectricityTransaction>("/electricity", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateElectricityTransaction(id: string, payload: Partial<ElectricityTransaction>): Promise<ElectricityTransaction> {
    return fetchJson<ElectricityTransaction>(`/electricity/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  // Complaints
  async getComplaints(propertyId?: string): Promise<RoomComplaint[]> {
    const query = propertyId ? `?property_id=${propertyId}` : "";
    return fetchJson<RoomComplaint[]>(`/complaints${query}`);
  },

  async createComplaint(payload: Partial<RoomComplaint>): Promise<RoomComplaint> {
    return fetchJson<RoomComplaint>("/complaints", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateComplaint(id: string, payload: Partial<RoomComplaint>): Promise<RoomComplaint> {
    return fetchJson<RoomComplaint>(`/complaints/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteComplaint(id: string): Promise<{ success: boolean }> {
    return fetchJson<{ success: boolean }>(`/complaints/${id}`, {
      method: "DELETE",
    });
  },

  // Finance Wallets
  async getWallets(propertyId?: string): Promise<FinanceWallet[]> {
    const query = propertyId ? `?property_id=${propertyId}` : "";
    return fetchJson<FinanceWallet[]>(`/finance/wallets${query}`);
  },

  async createWallet(payload: Partial<FinanceWallet>): Promise<FinanceWallet> {
    return fetchJson<FinanceWallet>("/finance/wallets", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateWallet(id: string, payload: Partial<FinanceWallet>): Promise<FinanceWallet> {
    return fetchJson<FinanceWallet>(`/finance/wallets/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteWallet(id: string): Promise<{ success: boolean }> {
    return fetchJson<{ success: boolean }>(`/finance/wallets/${id}`, {
      method: "DELETE",
    });
  },

  // Finance Categories
  async getFinanceCategories(): Promise<FinanceCategory[]> {
    return fetchJson<FinanceCategory[]>("/finance/categories");
  },

  async createFinanceCategory(payload: Partial<FinanceCategory>): Promise<FinanceCategory> {
    return fetchJson<FinanceCategory>("/finance/categories", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateFinanceCategory(id: string, payload: Partial<FinanceCategory>): Promise<FinanceCategory> {
    return fetchJson<FinanceCategory>(`/finance/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteFinanceCategory(id: string): Promise<{ success: boolean }> {
    return fetchJson<{ success: boolean }>(`/finance/categories/${id}`, {
      method: "DELETE",
    });
  },

  // Cash Transactions
  async getCashTransactions(propertyId?: string): Promise<CashTransaction[]> {
    const query = propertyId ? `?property_id=${propertyId}` : "";
    return fetchJson<CashTransaction[]>(`/finance/transactions${query}`);
  },

  async createCashTransaction(payload: Partial<CashTransaction>): Promise<CashTransaction> {
    return fetchJson<CashTransaction>("/finance/transactions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateCashTransaction(id: string, payload: Partial<CashTransaction>): Promise<CashTransaction> {
    return fetchJson<CashTransaction>(`/finance/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteCashTransaction(id: string): Promise<{ success: boolean }> {
    return fetchJson<{ success: boolean }>(`/finance/transactions/${id}`, {
      method: "DELETE",
    });
  },

  // Staff Management
  async getStaff(propertyId?: string): Promise<UserProfile[]> {
    const query = propertyId ? `?property_id=${propertyId}` : "";
    return fetchJson<UserProfile[]>(`/staff${query}`);
  },

  async updateStaff(id: string, payload: { role?: string; is_active?: boolean; full_name?: string; phone_number?: string }): Promise<UserProfile> {
    return fetchJson<UserProfile>(`/staff/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
};
