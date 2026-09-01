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
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000/api";

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
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
  // Properties
  async getProperties(): Promise<Property[]> {
    return fetchJson<Property[]>("/properties");
  },

  async createProperty(property: Partial<Property>): Promise<Property> {
    return fetchJson<Property>("/properties", {
      method: "POST",
      body: JSON.stringify(property),
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

  // Finance
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
};
