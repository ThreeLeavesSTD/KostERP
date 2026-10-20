import {
  Property,
  Room,
  RoomType,
  Tenant,
  Lease,
  Invoice,
  InvoiceStatus,
  Payment,
  ElectricityTransaction,
  PaymentMethodConfig,
  OwnerDashboardMetrics,
  RoomStatus,
  StaffAccount,
  UserProfile,
  UserRole,
  RolePermissionConfig,
  RoomComplaint,
  CashTransaction,
  FinanceWallet,
  FinanceCategory,
  TransactionType,
  Lead,
  SurveySchedule,
} from "@/types";
import {
  initialProperties,
  initialRooms,
  initialRoomTypes,
  initialTenants,
  initialLeases,
  initialInvoices,
  initialElectricityTransactions,
  initialPaymentMethods,
  initialStaffAccounts,
  initialUserProfile,
  initialRoleConfigs,
  initialComplaints,
  initialCashTransactions,
  initialFinanceWallets,
  initialFinanceCategories,
  initialLeads,
  initialSurveys,
} from "./mock-data";
import { FrontendSupabaseService } from "./supabase-service";
import { KostApiClient } from "./api-client";
import { getPermissionsForRole, hasPermission as checkStaticPermission } from "./permissions";
import type { Expense, FinanceBudget, RoomInvestment } from "@/types/finance";

const STORAGE_KEYS = {
  PROPERTIES: "kost_erp_properties",
  ROOMS: "kost_erp_rooms",
  ROOM_TYPES: "kost_erp_room_types",
  TENANTS: "kost_erp_tenants",
  LEASES: "kost_erp_leases",
  INVOICES: "kost_erp_invoices",
  ELECTRICITY: "kost_erp_electricity",
  PAYMENT_METHODS: "kost_erp_payment_methods",
  ACTIVE_ROLE: "kost_erp_active_role",
  STAFF_ACCOUNTS: "kost_erp_staff_accounts",
  USER_PROFILE: "kost_erp_user_profile",
  ROLES: "kost_erp_roles",
  COMPLAINTS: "kost_erp_complaints",
  CASH_TRANSACTIONS: "kost_erp_cash_transactions",
  WALLETS: "kost_erp_wallets",
  FINANCE_CATEGORIES: "kost_erp_finance_categories",
  LEADS: "kost_erp_leads",
  SURVEYS: "kost_erp_surveys",
  EXPENSES: "kost_erp_expenses",
  BUDGETS: "kost_erp_finance_budgets",
  INVESTMENTS: "kost_erp_room_investments",
};

// Safe JSON parser for localStorage
function getItem<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return defaultValue;
  }
}

// Safe UUID generator matching PostgreSQL UUID type
export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let storageChangeTimer: any = null;
function notifyStorageChange(key?: string) {
  if (typeof window === "undefined") return;
  if (storageChangeTimer) clearTimeout(storageChangeTimer);
  storageChangeTimer = setTimeout(() => {
    window.dispatchEvent(new CustomEvent("kost_storage_change", { detail: { key } }));
  }, 40);
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    notifyStorageChange(key);
  } catch (e) {
    console.error(`Error saving ${key} to localStorage:`, e);
  }
}

function setFinanceItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  // Finance forms must report quota/storage errors instead of claiming a save.
  localStorage.setItem(key, JSON.stringify(value));
  notifyStorageChange(key);
}

export const KostStorage = {
  saveFinanceSource: (data: { propertyId: string; properties: Property[]; rooms: Room[]; roomTypes: RoomType[]; leases: Lease[]; invoices: Invoice[]; transactions: CashTransaction[]; wallets: FinanceWallet[]; tenants?: Tenant[]; electricity?: ElectricityTransaction[] }) => {
    const merge = <T extends { property_id: string }>(existing: T[], incoming: T[]) => [...existing.filter(r => r.property_id !== data.propertyId), ...incoming];
    setItem(STORAGE_KEYS.PROPERTIES, [...KostStorage.getProperties().filter(p => p.id !== data.propertyId), ...data.properties]);
    setItem(STORAGE_KEYS.ROOMS, merge(KostStorage.getRooms(), data.rooms));
    setItem(STORAGE_KEYS.ROOM_TYPES, merge(KostStorage.getRoomTypes(), data.roomTypes));
    setItem(STORAGE_KEYS.LEASES, merge(KostStorage.getLeases(), data.leases));
    setItem(STORAGE_KEYS.INVOICES, merge(KostStorage.getInvoices(), data.invoices));
    setItem(STORAGE_KEYS.CASH_TRANSACTIONS, merge(KostStorage.getCashTransactions(), data.transactions));
    setItem(STORAGE_KEYS.WALLETS, merge(KostStorage.getWallets(), data.wallets));
    if (data.tenants) setItem(STORAGE_KEYS.TENANTS, merge(KostStorage.getTenants(), data.tenants));
    if (data.electricity) setItem(STORAGE_KEYS.ELECTRICITY, merge(KostStorage.getElectricityTransactions(), data.electricity));
  },
  getExpenses: (): Expense[] => getItem(STORAGE_KEYS.EXPENSES, []),
  saveExpenses: (rows: Expense[]) => setFinanceItem(STORAGE_KEYS.EXPENSES, rows),
  saveInvoices: (rows: Invoice[]) => setFinanceItem(STORAGE_KEYS.INVOICES, rows),
  getFinanceBudgets: (): FinanceBudget[] => getItem(STORAGE_KEYS.BUDGETS, []),
  saveFinanceBudgets: (rows: FinanceBudget[]) => setFinanceItem(STORAGE_KEYS.BUDGETS, rows),
  getRoomInvestments: (): RoomInvestment[] => getItem(STORAGE_KEYS.INVESTMENTS, []),
  saveRoomInvestments: (rows: RoomInvestment[]) => setFinanceItem(STORAGE_KEYS.INVESTMENTS, rows),
  // Initialize storage with defaults if empty
  init: () => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(STORAGE_KEYS.PROPERTIES)) {
      setItem(STORAGE_KEYS.PROPERTIES, initialProperties);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ROOMS)) {
      setItem(STORAGE_KEYS.ROOMS, initialRooms);
    }
    if (!localStorage.getItem(STORAGE_KEYS.TENANTS)) {
      setItem(STORAGE_KEYS.TENANTS, initialTenants);
    }
    if (!localStorage.getItem(STORAGE_KEYS.LEASES)) {
      setItem(STORAGE_KEYS.LEASES, initialLeases);
    }
    if (!localStorage.getItem(STORAGE_KEYS.INVOICES)) {
      setItem(STORAGE_KEYS.INVOICES, initialInvoices);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ELECTRICITY)) {
      setItem(STORAGE_KEYS.ELECTRICITY, initialElectricityTransactions);
    }
    if (!localStorage.getItem(STORAGE_KEYS.PAYMENT_METHODS)) {
      setItem(STORAGE_KEYS.PAYMENT_METHODS, initialPaymentMethods);
    }
    if (!localStorage.getItem(STORAGE_KEYS.STAFF_ACCOUNTS)) {
      setItem(STORAGE_KEYS.STAFF_ACCOUNTS, initialStaffAccounts);
    }
    if (!localStorage.getItem(STORAGE_KEYS.USER_PROFILE)) {
      setItem(STORAGE_KEYS.USER_PROFILE, initialUserProfile);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ROLES)) {
      setItem(STORAGE_KEYS.ROLES, initialRoleConfigs);
    }
    if (!localStorage.getItem(STORAGE_KEYS.COMPLAINTS)) {
      setItem(STORAGE_KEYS.COMPLAINTS, initialComplaints);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CASH_TRANSACTIONS)) {
      setItem(STORAGE_KEYS.CASH_TRANSACTIONS, initialCashTransactions);
    }
    if (!localStorage.getItem(STORAGE_KEYS.WALLETS)) {
      setItem(STORAGE_KEYS.WALLETS, initialFinanceWallets);
    }
    if (!localStorage.getItem(STORAGE_KEYS.FINANCE_CATEGORIES)) {
      setItem(STORAGE_KEYS.FINANCE_CATEGORIES, initialFinanceCategories);
    }
  },

  // Sync storage cache with live Supabase database
  syncWithSupabase: async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    try {
      // 1. Try Backend REST API first
      let properties: Property[] = [];
      let rooms: Room[] = [];
      let roomTypes: RoomType[] = [];
      let tenants: Tenant[] = [];
      let leases: Lease[] = [];
      let invoices: Invoice[] = [];
      let electricity: ElectricityTransaction[] = [];
      let complaints: RoomComplaint[] = [];
      let wallets: FinanceWallet[] = [];
      let transactions: CashTransaction[] = [];

      try {
        properties = await KostApiClient.getProperties();
        rooms = await KostApiClient.getRooms();
        roomTypes = await KostApiClient.getRoomTypes();
        tenants = await KostApiClient.getTenants();
        leases = await KostApiClient.getLeases();
        invoices = await KostApiClient.getInvoices();
        electricity = await KostApiClient.getElectricityTransactions();
        complaints = await KostApiClient.getComplaints();
        wallets = await KostApiClient.getWallets();
        transactions = await KostApiClient.getCashTransactions();
      } catch (backendErr) {
        // 2. Fallback to direct Supabase browser client
        properties = await FrontendSupabaseService.getProperties();
        rooms = await FrontendSupabaseService.getRooms();
        roomTypes = await FrontendSupabaseService.getRoomTypes();
        tenants = await FrontendSupabaseService.getTenants();
        leases = await FrontendSupabaseService.getLeases();
        invoices = await FrontendSupabaseService.getInvoices();
        electricity = await FrontendSupabaseService.getElectricityTransactions();
        complaints = await FrontendSupabaseService.getComplaints();
        wallets = await FrontendSupabaseService.getWallets();
        transactions = await FrontendSupabaseService.getCashTransactions();
      }

      if (properties.length > 0) setItem(STORAGE_KEYS.PROPERTIES, properties);
      if (rooms.length > 0) setItem(STORAGE_KEYS.ROOMS, rooms);
      if (roomTypes.length > 0) setItem(STORAGE_KEYS.ROOM_TYPES, roomTypes);
      if (tenants.length > 0) setItem(STORAGE_KEYS.TENANTS, tenants);
      if (leases.length > 0) setItem(STORAGE_KEYS.LEASES, leases);
      if (invoices.length > 0) setItem(STORAGE_KEYS.INVOICES, invoices);
      if (electricity.length > 0) setItem(STORAGE_KEYS.ELECTRICITY, electricity);
      if (complaints.length > 0) setItem(STORAGE_KEYS.COMPLAINTS, complaints);
      if (wallets.length > 0) setItem(STORAGE_KEYS.WALLETS, wallets);
      if (transactions.length > 0) setItem(STORAGE_KEYS.CASH_TRANSACTIONS, transactions);

      return true;
    } catch (e) {
      console.warn("Supabase auto-sync notice:", e);
      return false;
    }
  },

  // Reset to initial mock data
  resetToDefault: () => {
    setItem(STORAGE_KEYS.PROPERTIES, initialProperties);
    setItem(STORAGE_KEYS.ROOMS, initialRooms);
    setItem(STORAGE_KEYS.ROOM_TYPES, initialRoomTypes);
    setItem(STORAGE_KEYS.TENANTS, initialTenants);
    setItem(STORAGE_KEYS.LEASES, initialLeases);
    setItem(STORAGE_KEYS.INVOICES, initialInvoices);
    setItem(STORAGE_KEYS.ELECTRICITY, initialElectricityTransactions);
    setItem(STORAGE_KEYS.PAYMENT_METHODS, initialPaymentMethods);
    setItem(STORAGE_KEYS.STAFF_ACCOUNTS, initialStaffAccounts);
    setItem(STORAGE_KEYS.USER_PROFILE, initialUserProfile);
    setItem(STORAGE_KEYS.ROLES, initialRoleConfigs);
    setItem(STORAGE_KEYS.COMPLAINTS, initialComplaints);
    setItem(STORAGE_KEYS.CASH_TRANSACTIONS, initialCashTransactions);
    setItem(STORAGE_KEYS.WALLETS, initialFinanceWallets);
    setItem(STORAGE_KEYS.FINANCE_CATEGORIES, initialFinanceCategories);
  },

  // PROPERTIES
  getProperties: (): Property[] => getItem(STORAGE_KEYS.PROPERTIES, initialProperties),

  updateProperty: (id: string, updates: Partial<Property>): Property => {
    const all = getItem<Property[]>(STORAGE_KEYS.PROPERTIES, initialProperties);
    const updated = all.map((p) => (p.id === id ? { ...p, ...updates } : p));
    setItem(STORAGE_KEYS.PROPERTIES, updated);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("kost_storage_change", { detail: { key: STORAGE_KEYS.PROPERTIES } })
      );
    }
    return updated.find((p) => p.id === id) || updated[0];
  },

  // ROOMS (RELATIONALLY LINKED TO TENANTS VIA TENANT_ID AS PRIMARY KEY)
  getRooms: (): Room[] => {
    const rawRooms = getItem<Room[]>(STORAGE_KEYS.ROOMS, initialRooms);
    const tenants = getItem<Tenant[]>(STORAGE_KEYS.TENANTS, initialTenants);
    const leases = getItem<Lease[]>(STORAGE_KEYS.LEASES, initialLeases);
    const roomTypes = getItem<RoomType[]>(STORAGE_KEYS.ROOM_TYPES, initialRoomTypes);

    return rawRooms.map((room) => {
      // Resolve matched category
      const matchedRt = roomTypes.find(
        (rt) => rt.property_id === room.property_id && (rt.id === room.room_type_id || rt.name.toLowerCase() === room.room_type?.toLowerCase())
      );

      // Find active lease for this room if any
      const activeLease = leases.find(
        (l) => l.property_id === room.property_id && (l.room_id === room.id || l.room_number === room.room_number) && l.status === "active"
      );

      // Determine relational tenant ID (from room.tenant_id, activeLease, or current_tenant.id)
      const tenantId = room.tenant_id || activeLease?.tenant_id || room.current_tenant?.id;
      const matchedTenant = tenantId ? tenants.find((t) => t.id === tenantId && t.property_id === room.property_id) : undefined;

      const baseRoom = {
        ...room,
        room_type: matchedRt?.name || room.room_type || "Standard",
        room_type_id: matchedRt?.id || room.room_type_id,
        base_price: matchedRt ? matchedRt.base_price : room.base_price,
        facilities: (matchedRt?.facilities && matchedRt.facilities.length > 0) ? matchedRt.facilities : (room.facilities || []),
        description: matchedRt?.description || room.description,
      };

      if (matchedTenant) {
        return {
          ...baseRoom,
          status: room.status === "maintenance" ? "maintenance" : "occupied",
          tenant_id: matchedTenant.id,
          current_tenant: {
            id: matchedTenant.id, // Primary Key of Tenant
            full_name: matchedTenant.full_name,
            phone_number: matchedTenant.phone_number,
            id_card_number: matchedTenant.id_card_number,
            id_card_url: matchedTenant.id_card_url,
            emergency_contact_name: matchedTenant.emergency_contact_name,
            emergency_contact_phone: matchedTenant.emergency_contact_phone,
            emergency_contact_relation: matchedTenant.emergency_contact_relation,
            lease_id: activeLease?.id || room.current_tenant?.lease_id || "lease-active",
            start_date: activeLease?.start_date || room.current_tenant?.start_date,
            end_date: activeLease?.end_date || room.current_tenant?.end_date,
          },
        };
      } else if (room.status === "occupied" && room.current_tenant) {
        return baseRoom;
      } else {
        return {
          ...baseRoom,
          tenant_id: undefined,
          current_tenant: undefined,
        };
      }
    });
  },

  assignTenantToRoom: (
    roomId: string,
    tenantId: string | null,
    endDate?: string
  ): Room | null => {
    const rawRooms = getItem<Room[]>(STORAGE_KEYS.ROOMS, initialRooms);
    const tenants = getItem<Tenant[]>(STORAGE_KEYS.TENANTS, initialTenants);
    const index = rawRooms.findIndex((r) => r.id === roomId);
    if (index === -1) return null;

    if (!tenantId) {
      rawRooms[index] = {
        ...rawRooms[index],
        status: "available",
        tenant_id: undefined,
        current_tenant: undefined,
      };

      // Sync room status to Supabase
      FrontendSupabaseService.updateRoom(rawRooms[index].id, {
        status: "available",
        tenant_id: undefined,
      }).catch((err) => console.warn("Supabase room update sync:", err));

      // Terminate active lease for this room if any
      const rawLeases = getItem<Lease[]>(STORAGE_KEYS.LEASES, initialLeases);
      const updatedLeases = rawLeases.map((l) => {
        if ((l.room_id === roomId || l.room_number === rawRooms[index].room_number) && l.status === "active") {
          return { ...l, status: "terminated" as const };
        }
        return l;
      });
      setItem(STORAGE_KEYS.LEASES, updatedLeases);
    } else {
      const tenant = tenants.find((t) => t.id === tenantId);
      if (!tenant) return null;

      const leaseId = generateUUID();
      const activeEndDate = endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      rawRooms[index] = {
        ...rawRooms[index],
        status: "occupied",
        tenant_id: tenant.id,
        current_tenant: {
          id: tenant.id,
          full_name: tenant.full_name,
          phone_number: tenant.phone_number,
          id_card_number: tenant.id_card_number,
          id_card_url: tenant.id_card_url,
          emergency_contact_name: tenant.emergency_contact_name,
          emergency_contact_phone: tenant.emergency_contact_phone,
          emergency_contact_relation: tenant.emergency_contact_relation,
          lease_id: leaseId,
          start_date: new Date().toISOString().slice(0, 10),
          end_date: activeEndDate,
        },
      };

      // Sync room status to Supabase
      FrontendSupabaseService.updateRoom(rawRooms[index].id, {
        status: "occupied",
        tenant_id: tenant.id,
      }).catch((err) => console.warn("Supabase room update sync:", err));

      // Update or create active lease for this room and tenant
      const rawLeases = getItem<Lease[]>(STORAGE_KEYS.LEASES, initialLeases);
      const existingLeaseIndex = rawLeases.findIndex(
        (l) => (l.room_id === roomId || l.room_number === rawRooms[index].room_number) && l.status === "active"
      );

      if (existingLeaseIndex !== -1) {
        rawLeases[existingLeaseIndex] = {
          ...rawLeases[existingLeaseIndex],
          tenant_id: tenant.id,
          tenant_name: tenant.full_name,
          tenant_phone: tenant.phone_number,
          end_date: activeEndDate,
        };
      } else {
        const newLease: Lease = {
          id: leaseId,
          property_id: rawRooms[index].property_id || "a0000000-0000-0000-0000-000000000001",
          room_id: rawRooms[index].id,
          room_number: rawRooms[index].room_number,
          tenant_id: tenant.id,
          tenant_name: tenant.full_name,
          tenant_phone: tenant.phone_number,
          rent_amount: rawRooms[index].base_price,
          deposit_amount: 0,
          start_date: new Date().toISOString().slice(0, 10),
          end_date: activeEndDate,
          billing_cycle_day: 1,
          status: "active",
          created_at: new Date().toISOString(),
        };
        rawLeases.unshift(newLease);
        FrontendSupabaseService.createLease(newLease).catch((err) => console.warn("Supabase lease sync:", err));
      }
      setItem(STORAGE_KEYS.LEASES, rawLeases);
    }

    setItem(STORAGE_KEYS.ROOMS, [...rawRooms]);
    return rawRooms[index];
  },

  addRoom: (roomData: Omit<Room, "id" | "created_at">): Room => {
    const rooms = KostStorage.getRooms();
    const newRoom: Room = {
      ...roomData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.ROOMS, [newRoom, ...rooms]);
    FrontendSupabaseService.createRoom(newRoom).catch((err) => console.warn("Supabase room sync:", err));
    return newRoom;
  },

  updateRoom: (id: string, updates: Partial<Room>): Room | null => {
    const rawRooms = getItem<Room[]>(STORAGE_KEYS.ROOMS, initialRooms);
    const index = rawRooms.findIndex((r) => r.id === id);
    if (index === -1) return null;
    const updated = { ...rawRooms[index], ...updates };
    rawRooms[index] = updated;
    setItem(STORAGE_KEYS.ROOMS, [...rawRooms]);
    FrontendSupabaseService.updateRoom(id, updates).catch((err) => console.warn("Supabase room update sync:", err));
    return updated;
  },

  deleteRoom: (id: string): boolean => {
    const rawRooms = getItem<Room[]>(STORAGE_KEYS.ROOMS, initialRooms);
    const filtered = rawRooms.filter((r) => r.id !== id);
    setItem(STORAGE_KEYS.ROOMS, filtered);
    FrontendSupabaseService.deleteRoom(id).catch((err) => console.warn("Supabase room delete sync:", err));
    return true;
  },

  // ROOM TYPES (KATEGORI & SHOWCASE KAMAR)
  getRoomTypes: (): RoomType[] => {
    return getItem<RoomType[]>(STORAGE_KEYS.ROOM_TYPES, initialRoomTypes);
  },

  addRoomType: (roomTypeData: Omit<RoomType, "id" | "created_at"> & { id?: string }): RoomType => {
    const types = KostStorage.getRoomTypes();
    const newType: RoomType = {
      ...roomTypeData,
      id: roomTypeData.id || generateUUID(),
      created_at: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.ROOM_TYPES, [...types, newType]);
    FrontendSupabaseService.createRoomType(newType).catch((err) => console.warn("Supabase room type sync:", err));
    return newType;
  },

  updateRoomType: (id: string, updates: Partial<RoomType>): RoomType | null => {
    const types = KostStorage.getRoomTypes();
    const index = types.findIndex((t) => t.id === id);
    if (index === -1) return null;
    const oldName = types[index].name;
    const updated = { ...types[index], ...updates, updated_at: new Date().toISOString() };
    types[index] = updated;
    setItem(STORAGE_KEYS.ROOM_TYPES, [...types]);

    // Auto sync rooms with this category
    if (updates.name) {
      const rawRooms = getItem<Room[]>(STORAGE_KEYS.ROOMS, initialRooms);
      const updatedRooms = rawRooms.map((r) =>
        r.room_type_id === id || r.room_type?.toLowerCase() === oldName.toLowerCase()
          ? { ...r, room_type: updates.name!, room_type_id: id }
          : r
      );
      setItem(STORAGE_KEYS.ROOMS, updatedRooms);
    }

    FrontendSupabaseService.updateRoomType(id, updates).catch((err) => console.warn("Supabase room type update sync:", err));
    return updated;
  },

  deleteRoomType: (id: string): boolean => {
    const types = KostStorage.getRoomTypes();
    const filtered = types.filter((t) => t.id !== id);
    setItem(STORAGE_KEYS.ROOM_TYPES, filtered);
    FrontendSupabaseService.deleteRoomType(id).catch((err) => console.warn("Supabase room type delete sync:", err));
    return true;
  },

  // TENANTS
  getTenants: (): Tenant[] => getItem(STORAGE_KEYS.TENANTS, initialTenants),

  addTenant: (tenantData: Omit<Tenant, "id" | "created_at">): Tenant => {
    const tenants = KostStorage.getTenants();
    const newTenant: Tenant = {
      ...tenantData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.TENANTS, [newTenant, ...tenants]);
    FrontendSupabaseService.createTenant(newTenant).catch((err) => console.warn("Supabase tenant sync:", err));
    return newTenant;
  },

  updateTenant: (id: string, updates: Partial<Tenant>): Tenant | null => {
    const tenants = KostStorage.getTenants();
    const index = tenants.findIndex((t) => t.id === id);
    if (index === -1) return null;
    const updated = { ...tenants[index], ...updates };
    tenants[index] = updated;
    setItem(STORAGE_KEYS.TENANTS, [...tenants]);
    FrontendSupabaseService.updateTenant(id, updates).catch((err) => console.warn("Supabase tenant update sync:", err));

    // Cascade to rawRooms to keep occupant details synchronized via Primary Key
    const rawRooms = getItem<Room[]>(STORAGE_KEYS.ROOMS, initialRooms);
    let roomsChanged = false;
    const updatedRooms = rawRooms.map((r) => {
      if (r.tenant_id === id || r.current_tenant?.id === id) {
        roomsChanged = true;
        return {
          ...r,
          tenant_id: id,
          current_tenant: r.current_tenant
            ? {
                ...r.current_tenant,
                id: updated.id,
                full_name: updated.full_name,
                phone_number: updated.phone_number,
                id_card_number: updated.id_card_number,
                id_card_url: updated.id_card_url,
                emergency_contact_name: updated.emergency_contact_name,
                emergency_contact_phone: updated.emergency_contact_phone,
                emergency_contact_relation: updated.emergency_contact_relation,
              }
            : undefined,
        };
      }
      return r;
    });
    if (roomsChanged) {
      setItem(STORAGE_KEYS.ROOMS, updatedRooms);
    }

    // Cascade to leases
    const rawLeases = getItem<Lease[]>(STORAGE_KEYS.LEASES, initialLeases);
    let leasesChanged = false;
    const updatedLeases = rawLeases.map((l) => {
      if (l.tenant_id === id) {
        leasesChanged = true;
        return {
          ...l,
          tenant_name: updated.full_name,
          tenant_phone: updated.phone_number,
        };
      }
      return l;
    });
    if (leasesChanged) {
      setItem(STORAGE_KEYS.LEASES, updatedLeases);
    }

    return updated;
  },

  deleteTenant: (id: string): boolean => {
    const tenants = KostStorage.getTenants();
    setItem(STORAGE_KEYS.TENANTS, tenants.filter((t) => t.id !== id));
    FrontendSupabaseService.deleteTenant(id).catch((err) => console.warn("Supabase tenant delete sync:", err));

    // Release any rooms occupied by this tenant
    const rawRooms = getItem<Room[]>(STORAGE_KEYS.ROOMS, initialRooms);
    let roomsChanged = false;
    const updatedRooms = rawRooms.map((r) => {
      if (r.tenant_id === id || r.current_tenant?.id === id) {
        roomsChanged = true;
        return {
          ...r,
          status: "available" as RoomStatus,
          tenant_id: undefined,
          current_tenant: undefined,
        };
      }
      return r;
    });
    if (roomsChanged) {
      setItem(STORAGE_KEYS.ROOMS, updatedRooms);
    }

    // Terminate matching leases
    const rawLeases = getItem<Lease[]>(STORAGE_KEYS.LEASES, initialLeases);
    const updatedLeases = rawLeases.map((l) => {
      if (l.tenant_id === id && l.status === "active") {
        return { ...l, status: "terminated" as const };
      }
      return l;
    });
    setItem(STORAGE_KEYS.LEASES, updatedLeases);

    return true;
  },

  // LEASES (KONTRAK SEWA)
  getLeases: (): Lease[] => getItem(STORAGE_KEYS.LEASES, initialLeases),

  createLease: (data: {
    property_id: string;
    room_id: string;
    tenant_id: string;
    start_date: string;
    end_date?: string;
    billing_cycle_day: number;
    rent_amount: number;
    deposit_amount: number;
  }): Lease => {
    const leases = KostStorage.getLeases();
    const rooms = KostStorage.getRooms();
    const tenants = KostStorage.getTenants();

    const room = rooms.find((r) => r.id === data.room_id);
    const tenant = tenants.find((t) => t.id === data.tenant_id);

    const newLease: Lease = {
      ...data,
      id: generateUUID(),
      status: "active",
      created_at: new Date().toISOString(),
      room_number: room?.room_number || "",
      tenant_name: tenant?.full_name || "",
      tenant_phone: tenant?.phone_number || "",
    };

    // Update room status to occupied
    if (room) {
      KostStorage.updateRoom(room.id, {
        status: "occupied",
        current_tenant: {
          id: tenant?.id || "",
          full_name: tenant?.full_name || "",
          phone_number: tenant?.phone_number || "",
          lease_id: newLease.id,
          end_date: data.end_date,
        },
      });
    }

    // Auto create first invoice (Rent + Deposit)
    const invNumber = `INV/${new Date().toISOString().slice(0, 7).replace("-", "")}/${Math.floor(
      100 + Math.random() * 900
    )}`;
    KostStorage.addInvoice({
      property_id: data.property_id,
      lease_id: newLease.id,
      invoice_number: invNumber,
      billing_period: new Date().toISOString().slice(0, 7),
      subtotal_rent: data.rent_amount,
      additional_fees: data.deposit_amount,
      notes: `Sewa Awal Kamar ${room?.room_number} + Deposit Rp ${data.deposit_amount.toLocaleString("id-ID")}`,
      total_amount: data.rent_amount + data.deposit_amount,
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: "unpaid",
      room_number: room?.room_number,
      tenant_name: tenant?.full_name,
      tenant_phone: tenant?.phone_number,
    });

    setItem(STORAGE_KEYS.LEASES, [newLease, ...leases]);
    FrontendSupabaseService.createLease(newLease).catch((err) => console.warn("Supabase lease sync:", err));
    return newLease;
  },

  terminateLease: (leaseId: string): void => {
    const leases = KostStorage.getLeases();
    const lease = leases.find((l) => l.id === leaseId);
    if (!lease) return;

    // Update lease status
    lease.status = "completed";
    setItem(STORAGE_KEYS.LEASES, [...leases]);

    // Free up room
    if (lease.room_id) {
      KostStorage.updateRoom(lease.room_id, {
        status: "available",
        current_tenant: undefined,
      });
    }
  },

  // INVOICES
  getInvoices: (): Invoice[] => {
    const invoices = getItem<Invoice[]>(STORAGE_KEYS.INVOICES, initialInvoices);
    const todayStr = new Date().toISOString().slice(0, 10);

    // Auto update overdue status
    let changed = false;
    const resolvedInvoices = invoices.map((inv) => {
      if (inv.status === "unpaid" && inv.due_date && inv.due_date < todayStr) {
        changed = true;
        return { ...inv, status: "overdue" as InvoiceStatus };
      }
      return inv;
    });

    if (changed) {
      setItem(STORAGE_KEYS.INVOICES, resolvedInvoices);
    }
    return resolvedInvoices;
  },

  addInvoice: (invoiceData: Omit<Invoice, "id" | "created_at" | "payments">): Invoice => {
    const invoices = KostStorage.getInvoices();
    const newInvoice: Invoice = {
      ...invoiceData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      reminder_count: 0,
      payments: [],
    };
    setItem(STORAGE_KEYS.INVOICES, [newInvoice, ...invoices]);
    FrontendSupabaseService.createInvoice(newInvoice).catch((err) => console.warn("Supabase invoice sync:", err));
    return newInvoice;
  },

  updateInvoice: (id: string, updates: Partial<Invoice>): Invoice | null => {
    const invoices = KostStorage.getInvoices();
    const index = invoices.findIndex((i) => i.id === id);
    if (index === -1) return null;
    const updated = { ...invoices[index], ...updates };
    invoices[index] = updated;
    setItem(STORAGE_KEYS.INVOICES, [...invoices]);
    FrontendSupabaseService.updateInvoice(id, updates).catch((err) => console.warn("Supabase invoice update sync:", err));
    return updated;
  },

  deleteInvoice: (id: string): boolean => {
    const invoices = KostStorage.getInvoices();
    setItem(
      STORAGE_KEYS.INVOICES,
      invoices.filter((i) => i.id !== id)
    );
    return true;
  },

  recordInvoiceReminder: (id: string, template?: string): Invoice | null => {
    const invoices = KostStorage.getInvoices();
    const index = invoices.findIndex((i) => i.id === id);
    if (index === -1) return null;

    const inv = invoices[index];
    const updated: Invoice = {
      ...inv,
      reminder_count: (inv.reminder_count || 0) + 1,
      last_reminder_at: new Date().toISOString(),
      last_reminder_template: template || "invoice_reminder",
    };
    invoices[index] = updated;
    setItem(STORAGE_KEYS.INVOICES, [...invoices]);
    return updated;
  },

  verifyPayment: (data: {
    invoice_id: string;
    amount_paid: number;
    payment_method: string;
    wallet_id?: string | null;
    proof_url?: string;
    verified_by?: string;
    notes?: string;
  }): Payment => {
    const invoices = KostStorage.getInvoices();
    const invoice = invoices.find((i) => i.id === data.invoice_id);
    if (!invoice) throw new Error("Invoice tidak ditemukan");
    const alreadyPaid = (invoice.payments || []).reduce((total, payment) => total + Number(payment.amount_paid || 0), 0);
    const remaining = Math.max(0, Number(invoice.total_amount) - alreadyPaid);
    if (!Number.isFinite(data.amount_paid) || data.amount_paid <= 0 || data.amount_paid > remaining) throw new Error("Nominal pembayaran harus lebih dari nol dan tidak boleh melebihi sisa tagihan.");

    const newPayment: Payment = {
      id: generateUUID(),
      invoice_id: data.invoice_id,
      amount_paid: data.amount_paid,
      payment_method: data.payment_method,
      wallet_id: data.wallet_id || null,
      proof_url: data.proof_url,
      verified_by: data.verified_by || "Admin Kost",
      paid_at: new Date().toISOString(),
      notes: data.notes,
      created_at: new Date().toISOString(),
    };

    invoice.status = alreadyPaid + data.amount_paid >= Number(invoice.total_amount)
      ? "paid"
      : invoice.due_date < new Date().toISOString().slice(0, 10) ? "overdue" : "unpaid";
    invoice.payments = [...(invoice.payments || []), newPayment];
    setItem(STORAGE_KEYS.INVOICES, [...invoices]);
    return newPayment;
  },

  // ELECTRICITY TRANSACTIONS
  getElectricityTransactions: (): ElectricityTransaction[] =>
    getItem(STORAGE_KEYS.ELECTRICITY, initialElectricityTransactions),

  addElectricityTransaction: (
    data: Omit<ElectricityTransaction, "id" | "created_at" | "profit_margin">
  ): ElectricityTransaction => {
    const list = KostStorage.getElectricityTransactions();
    const profit_margin = data.selling_price - data.cost_price;
    const newTx: ElectricityTransaction = {
      ...data,
      profit_margin,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };

    // If payment status is invoiced, optionally update the active invoice
    if (data.payment_status === "invoiced" && data.lease_id) {
      const invoices = KostStorage.getInvoices();
      const currentInvoice = invoices.find(
        (i) => i.lease_id === data.lease_id && i.status === "unpaid"
      );
      if (currentInvoice) {
        currentInvoice.additional_fees += data.selling_price;
        currentInvoice.total_amount += data.selling_price;
        currentInvoice.notes = (currentInvoice.notes || "") + ` + Token PLN (${data.nominal_amount / 1000}k)`;
        newTx.invoice_id = currentInvoice.id;
        setItem(STORAGE_KEYS.INVOICES, [...invoices]);
      }
    }

    setItem(STORAGE_KEYS.ELECTRICITY, [newTx, ...list]);
    FrontendSupabaseService.createElectricityTransaction(newTx).catch((err) => console.warn("Supabase electricity sync:", err));
    return newTx;
  },

  markTokenSent: (id: string): void => {
    const list = KostStorage.getElectricityTransactions();
    const tx = list.find((t) => t.id === id);
    if (tx) {
      tx.sent_at = new Date().toISOString();
      setItem(STORAGE_KEYS.ELECTRICITY, [...list]);
    }
  },

  updateElectricityTransaction: (
    id: string,
    updates: Partial<ElectricityTransaction>
  ): ElectricityTransaction | null => {
    const list = KostStorage.getElectricityTransactions();
    const index = list.findIndex((t) => t.id === id);
    if (index === -1) return null;
    const updated = { ...list[index], ...updates };
    list[index] = updated;
    setItem(STORAGE_KEYS.ELECTRICITY, [...list]);
    return updated;
  },

  // PAYMENT METHODS CONFIG
  getPaymentMethods: (): PaymentMethodConfig[] =>
    getItem(STORAGE_KEYS.PAYMENT_METHODS, initialPaymentMethods),

  updatePaymentMethods: (methods: PaymentMethodConfig[]): void => {
    setItem(STORAGE_KEYS.PAYMENT_METHODS, methods);
  },

  // OWNER DASHBOARD METRICS CALCULATOR
  getOwnerMetrics: (): OwnerDashboardMetrics => {
    const rooms = KostStorage.getRooms();
    const invoices = KostStorage.getInvoices();
    const electricity = KostStorage.getElectricityTransactions();

    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter((r) => r.status === "occupied").length;
    const availableRooms = rooms.filter((r) => r.status === "available").length;
    const maintenanceRooms = rooms.filter((r) => r.status === "maintenance").length;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    // Revenue calculation
    const paidInvoices = invoices.filter((i) => i.status === "paid");
    const currentMonthRevenue = paidInvoices.reduce((sum, i) => sum + i.total_amount, 0);
    const targetMonthlyRevenue = rooms.reduce((sum, r) => sum + (r.base_price || 0), 0);

    // Unpaid & Overdue
    const unpaidInvoices = invoices.filter((i) => i.status === "unpaid" || i.status === "overdue");
    const totalUnpaidAmount = unpaidInvoices.reduce((sum, i) => sum + i.total_amount, 0);

    // Electricity Profit
    const electricityProfitTotal = electricity.reduce((sum, e) => sum + (e.profit_margin || 0), 0);

    // Recent Payments
    const recentPayments: OwnerDashboardMetrics["recentPayments"] = [];
    paidInvoices.forEach((inv) => {
      if (inv.payments && inv.payments.length > 0) {
        inv.payments.forEach((p) => {
          recentPayments.push({
            id: p.id,
            invoice_number: inv.invoice_number,
            room_number: inv.room_number || "-",
            tenant_name: inv.tenant_name || "-",
            amount: p.amount_paid,
            payment_method: p.payment_method,
            paid_at: p.paid_at,
          });
        });
      }
    });

    recentPayments.sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());

    return {
      totalRooms,
      occupiedRooms,
      availableRooms,
      maintenanceRooms,
      occupancyRate,
      currentMonthRevenue,
      targetMonthlyRevenue,
      totalUnpaidAmount,
      unpaidInvoicesCount: unpaidInvoices.length,
      electricityProfitTotal,
      electricityTransactionsCount: electricity.length,
      recentPayments: recentPayments.slice(0, 10),
    };
  },

  // STAFF ACCOUNTS MANAGEMENT (CREATE ID & PASSWORD)
  getStaffAccounts: (): StaffAccount[] =>
    getItem(STORAGE_KEYS.STAFF_ACCOUNTS, initialStaffAccounts),

  addStaffAccount: (
    data: Omit<StaffAccount, "id" | "created_at">
  ): StaffAccount => {
    const list = KostStorage.getStaffAccounts();
    const newStaff: StaffAccount = {
      ...data,
      id: `staff-${Date.now().toString().slice(-4)}`,
      created_at: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.STAFF_ACCOUNTS, [newStaff, ...list]);
    return newStaff;
  },

  updateStaffAccount: (
    id: string,
    updates: Partial<StaffAccount>
  ): StaffAccount | null => {
    const list = KostStorage.getStaffAccounts();
    const index = list.findIndex((s) => s.id === id);
    if (index === -1) return null;
    const updated = { ...list[index], ...updates };
    list[index] = updated;
    setItem(STORAGE_KEYS.STAFF_ACCOUNTS, [...list]);
    return updated;
  },

  deleteStaffAccount: (id: string): boolean => {
    const list = KostStorage.getStaffAccounts();
    setItem(
      STORAGE_KEYS.STAFF_ACCOUNTS,
      list.filter((s) => s.id !== id)
    );
    return true;
  },

  // USER PROFILE
  getUserProfile: (): UserProfile =>
    getItem(STORAGE_KEYS.USER_PROFILE, initialUserProfile),

  updateUserProfile: (profile: Partial<UserProfile>): UserProfile => {
    const current = KostStorage.getUserProfile();
    const updated = { ...current, ...profile };
    setItem(STORAGE_KEYS.USER_PROFILE, updated);
    return updated;
  },

  // AUTHENTICATION HELPER (DEPRECATED - Gantikan dengan Supabase Auth)
  authenticate: (
    _usernameInput?: string,
    _passwordInput?: string
  ): { success: boolean; role?: UserRole; message?: string; staff?: StaffAccount } => {
    return {
      success: false,
      message: "Autentikasi lokal dinonaktifkan. Silakan gunakan Supabase Auth (Email & Password).",
    };
  },

  // ROLE & PERMISSION MANAGEMENT
  getRoles: (): RolePermissionConfig[] =>
    getItem(STORAGE_KEYS.ROLES, initialRoleConfigs),

  getRoleById: (id: string): RolePermissionConfig | undefined => {
    const roles = KostStorage.getRoles();
    return roles.find((r) => r.id === id);
  },

  addRole: (
    data: Omit<RolePermissionConfig, "id" | "created_at">
  ): RolePermissionConfig => {
    const roles = KostStorage.getRoles();
    const newRole: RolePermissionConfig = {
      ...data,
      id: `role-${Date.now().toString().slice(-4)}`,
      created_at: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.ROLES, [...roles, newRole]);
    return newRole;
  },

  updateRole: (
    id: string,
    updates: Partial<RolePermissionConfig>
  ): RolePermissionConfig | null => {
    const roles = KostStorage.getRoles();
    const index = roles.findIndex((r) => r.id === id);
    if (index === -1) return null;
    const updated = { ...roles[index], ...updates };
    roles[index] = updated;
    setItem(STORAGE_KEYS.ROLES, [...roles]);
    return updated;
  },

  deleteRole: (id: string): boolean => {
    const roles = KostStorage.getRoles();
    const target = roles.find((r) => r.id === id);
    if (target?.is_system) {
      return false;
    }
    setItem(
      STORAGE_KEYS.ROLES,
      roles.filter((r) => r.id !== id)
    );
    return true;
  },

  hasPermission: (roleId: string, permissionTab: string): boolean => {
    return checkStaticPermission(roleId, permissionTab);
  },

  getRolePermissions: (roleId: string): string[] => {
    return getPermissionsForRole(roleId);
  },

  // ROOM COMPLAINTS (WHATSAPP CS AI & SUPABASE DB RECORD)
  getComplaints: (): RoomComplaint[] =>
    getItem(STORAGE_KEYS.COMPLAINTS, initialComplaints),

  getComplaintsByRoomId: (roomId: string): RoomComplaint[] => {
    const complaints = KostStorage.getComplaints();
    return complaints.filter(
      (c) => c.room_id === roomId || c.room_number === roomId
    );
  },

  addComplaint: (
    data: Omit<RoomComplaint, "id" | "created_at">
  ): RoomComplaint => {
    const complaints = KostStorage.getComplaints();
    const newComplaint: RoomComplaint = {
      ...data,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.COMPLAINTS, [newComplaint, ...complaints]);
    FrontendSupabaseService.createComplaint(newComplaint).catch((err) => console.warn("Supabase complaint sync:", err));
    return newComplaint;
  },

  updateComplaint: (
    id: string,
    updates: Partial<RoomComplaint>
  ): RoomComplaint | null => {
    const complaints = KostStorage.getComplaints();
    const index = complaints.findIndex((c) => c.id === id);
    if (index === -1) return null;
    const updated = {
      ...complaints[index],
      ...updates,
      updated_at: new Date().toISOString(),
      ...(updates.status === "resolved"
        ? { resolved_at: new Date().toISOString() }
        : {}),
    };
    complaints[index] = updated;
    setItem(STORAGE_KEYS.COMPLAINTS, [...complaints]);
    FrontendSupabaseService.updateComplaint(id, updates).catch((err) => console.warn("Supabase complaint update sync:", err));
    return updated;
  },

  deleteComplaint: (id: string): boolean => {
    const complaints = KostStorage.getComplaints();
    setItem(
      STORAGE_KEYS.COMPLAINTS,
      complaints.filter((c) => c.id !== id)
    );
    return true;
  },

  simulateWhatsAppCSIncoming: (data: {
    room_number: string;
    tenant_name: string;
    tenant_phone: string;
    message: string;
  }): RoomComplaint => {
    const rooms = KostStorage.getRooms();
    const matchedRoom = rooms.find((r) => r.room_number === data.room_number);
    const msg = data.message.toLowerCase();

    // AI classification logic
    let category: RoomComplaint["category"] = "general";
    let priority: RoomComplaint["priority"] = "medium";
    let aiSummary = data.message;

    if (
      msg.includes("ac") ||
      msg.includes("panas") ||
      msg.includes("dingin") ||
      msg.includes("remot")
    ) {
      category = "ac_facility";
      aiSummary = `Kendala AC: ${data.message.slice(0, 70)}`;
    } else if (
      msg.includes("kran") ||
      msg.includes("bocor") ||
      msg.includes("air") ||
      msg.includes("pipa") ||
      msg.includes("wastafel") ||
      msg.includes("toilet") ||
      msg.includes("wc")
    ) {
      category = "plumbing";
      priority = "urgent";
      aiSummary = `Kebocoran Air / Pipa: ${data.message.slice(0, 70)}`;
    } else if (
      msg.includes("listrik") ||
      msg.includes("lampu") ||
      msg.includes("mati") ||
      msg.includes("konslet") ||
      msg.includes("mcb") ||
      msg.includes("stop kontak")
    ) {
      category = "electricity";
      priority = "high";
      aiSummary = `Instalasi Listrik / Lampu: ${data.message.slice(0, 70)}`;
    } else if (
      msg.includes("kotor") ||
      msg.includes("sampah") ||
      msg.includes("bau") ||
      msg.includes("sapu") ||
      msg.includes("pel")
    ) {
      category = "cleanliness";
      priority = "low";
      aiSummary = `Kebersihan Lingkungan: ${data.message.slice(0, 70)}`;
    }

    const aiReply = `Halo Kak ${data.tenant_name}! Pesan keluhan Anda terkait Kamar ${data.room_number} telah berhasil dicatat oleh CS AI ke sistem database Kost Graha Asri. Tim pengelola segera menindaklanjuti. Terima kasih! 🙏`;

    return KostStorage.addComplaint({
      property_id: "a0000000-0000-0000-0000-000000000001",
      room_id: matchedRoom?.id || `room-${data.room_number}`,
      room_number: data.room_number,
      tenant_name: data.tenant_name,
      tenant_phone: data.tenant_phone,
      source: "whatsapp_cs_ai",
      raw_chat_message: data.message,
      ai_extracted_summary: aiSummary,
      ai_response_sent: aiReply,
      category,
      priority,
      status: "pending",
    });
  },

  // CASH TRANSACTIONS (PENCATATAN KAS OPERASIONAL / FINANCE TRACKER)
  getCashTransactions: (): CashTransaction[] =>
    getItem<CashTransaction[]>(STORAGE_KEYS.CASH_TRANSACTIONS, initialCashTransactions),

  saveCashTransactions: (rows: CashTransaction[]) => setFinanceItem(STORAGE_KEYS.CASH_TRANSACTIONS, rows),
  saveWallets: (rows: FinanceWallet[]) => setFinanceItem(STORAGE_KEYS.WALLETS, rows),

  addCashTransaction: (
    data: Omit<CashTransaction, "id" | "created_at">
  ): CashTransaction => {
    const list = KostStorage.getCashTransactions();
    const newTx: CashTransaction = {
      ...data,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.CASH_TRANSACTIONS, [newTx, ...list]);
    FrontendSupabaseService.createCashTransaction(newTx).catch((err) => console.warn("Supabase cash transaction sync:", err));
    return newTx;
  },

  updateCashTransaction: (
    id: string,
    updates: Partial<CashTransaction>
  ): CashTransaction | null => {
    const list = KostStorage.getCashTransactions();
    const index = list.findIndex((tx) => tx.id === id);
    if (index === -1) return null;
    const updated = { ...list[index], ...updates };
    list[index] = updated;
    setItem(STORAGE_KEYS.CASH_TRANSACTIONS, [...list]);
    return updated;
  },

  deleteCashTransaction: (id: string): boolean => {
    const list = KostStorage.getCashTransactions();
    const filtered = list.filter((tx) => tx.id !== id);
    setItem(STORAGE_KEYS.CASH_TRANSACTIONS, filtered);
    return true;
  },

  getCashFlowSummary: (monthFilter?: string) => {
    const list = KostStorage.getCashTransactions();
    const filtered = monthFilter
      ? list.filter((tx) => tx.date.startsWith(monthFilter))
      : list;

    let totalIncome = 0;
    let totalExpense = 0;
    const expenseByCategory: Record<string, number> = {};
    const incomeByCategory: Record<string, number> = {};

    filtered.forEach((tx) => {
      if (tx.type === "income") {
        totalIncome += tx.amount;
        const cat = tx.category_name || tx.category || "Pemasukan Lainnya";
        incomeByCategory[cat] = (incomeByCategory[cat] || 0) + tx.amount;
      } else {
        totalExpense += tx.amount;
        const cat = tx.category_name || tx.category || "Pengeluaran Lainnya";
        expenseByCategory[cat] = (expenseByCategory[cat] || 0) + tx.amount;
      }
    });

    const netCashFlow = totalIncome - totalExpense;

    // All-time balance
    let allTimeBalance = 0;
    list.forEach((tx) => {
      if (tx.type === "income") allTimeBalance += tx.amount;
      else allTimeBalance -= tx.amount;
    });

    return {
      totalIncome,
      totalExpense,
      netCashFlow,
      balance: allTimeBalance,
      expenseByCategory,
      incomeByCategory,
      transactionCount: filtered.length,
    };
  },

  // WALLETS / REKENING KAS OPERASIONAL
  getWallets: (): FinanceWallet[] =>
    getItem<FinanceWallet[]>(STORAGE_KEYS.WALLETS, initialFinanceWallets),

  addWallet: (
    data: Omit<FinanceWallet, "id" | "created_at">
  ): FinanceWallet => {
    const list = KostStorage.getWallets();
    const newWallet: FinanceWallet = {
      ...data,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.WALLETS, [newWallet, ...list]);
    FrontendSupabaseService.createWallet(newWallet).catch((err) => console.warn("Supabase wallet sync:", err));
    return newWallet;
  },

  updateWallet: (
    id: string,
    updates: Partial<FinanceWallet>
  ): FinanceWallet | null => {
    const list = KostStorage.getWallets();
    const index = list.findIndex((w) => w.id === id);
    if (index === -1) return null;
    const updated = { ...list[index], ...updates };
    list[index] = updated;
    setItem(STORAGE_KEYS.WALLETS, [...list]);
    return updated;
  },

  deleteWallet: (id: string): boolean => {
    const list = KostStorage.getWallets();
    const filtered = list.filter((w) => w.id !== id);
    setItem(STORAGE_KEYS.WALLETS, filtered);
    return true;
  },

  getWalletBalances: () => {
    const wallets = KostStorage.getWallets();
    const transactions = KostStorage.getCashTransactions();

    return wallets.map((wallet) => {
      let income = 0;
      let expense = 0;

      transactions.forEach((tx) => {
        const matchesWallet =
          tx.wallet_id === wallet.id ||
          tx.wallet_name?.toLowerCase() === wallet.name.toLowerCase() ||
          tx.payment_method.toLowerCase().includes(wallet.name.toLowerCase()) ||
          (wallet.type === "cash" && tx.payment_method.toLowerCase().includes("tunai")) ||
          (wallet.type === "bank" && wallet.name.toLowerCase().includes("bca") && tx.payment_method.toLowerCase().includes("bca")) ||
          (wallet.type === "bank" && wallet.name.toLowerCase().includes("mandiri") && tx.payment_method.toLowerCase().includes("mandiri")) ||
          (wallet.type === "ewallet" && tx.payment_method.toLowerCase().includes("qris"));

        if (matchesWallet) {
          if (tx.type === "income") income += tx.amount;
          else expense += tx.amount;
        }
      });

      const currentBalance = (wallet.initial_balance || 0) + income - expense;

      return {
        wallet,
        balance: currentBalance,
        totalIncome: income,
        totalExpense: expense,
      };
    });
  },

  // CUSTOM FINANCE CATEGORIES
  getFinanceCategories: (
    typeOrKindFilter?: TransactionType | "asset" | "liability" | "wallet" | "transaction"
  ): FinanceCategory[] => {
    let list = getItem<FinanceCategory[]>(
      STORAGE_KEYS.FINANCE_CATEGORIES,
      initialFinanceCategories
    );

    // Pastikan jika storage lokal lama belum ada kategori 'Operasional Kost', tambahkan secara otomatis
    if (!list.some((c) => c?.name && c.name.toLowerCase() === "operasional kost")) {
      const opCat: FinanceCategory = {
        id: "cat-exp-00",
        name: "Operasional Kost",
        scope: "transaction",
        type: "expense",
        category_kind: "expense",
        icon: "MoreHorizontal",
        is_default: true,
        created_at: new Date().toISOString(),
      };
      list = [opCat, ...list];
      setItem(STORAGE_KEYS.FINANCE_CATEGORIES, list);
    }

    if (!typeOrKindFilter) return list;

    // Filter khusus Kategori Wallet (Dompet / Rekening / Hutang)
    if (typeOrKindFilter === "wallet") {
      return list.filter(
        (c) =>
          c.scope === "wallet" ||
          c.category_kind === "asset" ||
          c.category_kind === "liability" ||
          (!c.type && c?.name && ["bank", "cash", "e-wallet", "ewallet", "business", "crypto", "digital bank", "hutang vendor", "cicilan / pinjaman", "deposit penghuni"].includes(c.name.toLowerCase()))
      );
    }

    // Filter khusus Kategori Transaksi (Operasional, WiFi, Listrik, Sewa Kamar, dll)
    if (typeOrKindFilter === "transaction") {
      return list.filter(
        (c) =>
          c.scope === "transaction" ||
          c.type === "income" ||
          c.type === "expense" ||
          c.category_kind === "income" ||
          c.category_kind === "expense"
      );
    }

    // Filter Kategori Aset Wallet
    if (typeOrKindFilter === "asset") {
      return list.filter(
        (c) =>
          (c.category_kind === "asset" || (c.scope === "wallet" && c.category_kind !== "liability")) &&
          c.type !== "expense" &&
          c.type !== "income"
      );
    }

    // Filter Kategori Liability Wallet
    if (typeOrKindFilter === "liability") {
      return list.filter(
        (c) =>
          c.category_kind === "liability" &&
          c.type !== "expense" &&
          c.type !== "income"
      );
    }

    // Filter Kategori Transaksi Pengeluaran (Expense)
    if (typeOrKindFilter === "expense") {
      return list.filter(
        (c) =>
          (c.type === "expense" || c.category_kind === "expense") &&
          c.scope !== "wallet" &&
          c.category_kind !== "asset" &&
          c.category_kind !== "liability"
      );
    }

    // Filter Kategori Transaksi Pemasukan (Income)
    if (typeOrKindFilter === "income") {
      return list.filter(
        (c) =>
          (c.type === "income" || c.category_kind === "income") &&
          c.scope !== "wallet" &&
          c.category_kind !== "asset" &&
          c.category_kind !== "liability"
      );
    }

    return list;
  },

  addFinanceCategory: (
    data: Omit<FinanceCategory, "id" | "created_at">
  ): FinanceCategory => {
    const list = KostStorage.getFinanceCategories();
    const prefix = data.category_kind || data.type || data.scope || "gen";
    const newCat: FinanceCategory = {
      ...data,
      id: `cat-${prefix.slice(0, 3)}-${Date.now().toString().slice(-4)}`,
      created_at: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.FINANCE_CATEGORIES, [newCat, ...list]);
    return newCat;
  },

  updateFinanceCategory: (
    id: string,
    updates: Partial<FinanceCategory>
  ): FinanceCategory | null => {
    const list = KostStorage.getFinanceCategories();
    const index = list.findIndex((c) => c.id === id);
    if (index === -1) return null;
    const updated = { ...list[index], ...updates };
    list[index] = updated;
    setItem(STORAGE_KEYS.FINANCE_CATEGORIES, [...list]);
    return updated;
  },

  deleteFinanceCategory: (id: string): boolean => {
    const list = KostStorage.getFinanceCategories();
    const filtered = list.filter((c) => c.id !== id);
    setItem(STORAGE_KEYS.FINANCE_CATEGORIES, filtered);
    return true;
  },

  // LEADS & CRM PIPELINE
  getLeads: (propertyId?: string): Lead[] => {
    const leads = getItem<Lead[]>(STORAGE_KEYS.LEADS, initialLeads);
    if (!propertyId) return leads;
    return leads.filter((l) => l.property_id === propertyId);
  },

  saveLeads: (leads: Lead[]): void => {
    setItem(STORAGE_KEYS.LEADS, leads);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("kost_storage_change", { detail: { key: STORAGE_KEYS.LEADS } })
      );
    }
  },

  createLead: (payload: Partial<Lead>): Lead => {
    const leads = KostStorage.getLeads();
    const newLead: Lead = {
      id: payload.id || `lead-${Date.now()}`,
      property_id: payload.property_id || "a0000000-0000-0000-0000-000000000001",
      name: payload.name || "Calon Penghuni",
      phone: payload.phone || "",
      channel: payload.channel || "whatsapp",
      landing_page_campaign: payload.landing_page_campaign,
      preferred_room_type: payload.preferred_room_type,
      budget_min: payload.budget_min,
      budget_max: payload.budget_max,
      preferred_move_in_date: payload.preferred_move_in_date,
      is_warm: Boolean(payload.is_warm),
      status: payload.status || "new",
      assigned_staff_id: payload.assigned_staff_id,
      assigned_staff_name: payload.assigned_staff_name,
      follow_up_at: payload.follow_up_at,
      notes: payload.notes,
      created_at: payload.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    KostStorage.saveLeads([newLead, ...leads]);
    return newLead;
  },

  updateLead: (id: string, updates: Partial<Lead>): Lead => {
    const leads = KostStorage.getLeads();
    const index = leads.findIndex((l) => l.id === id);
    if (index === -1) {
      return KostStorage.createLead({ ...updates, id });
    }
    const updated = {
      ...leads[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    leads[index] = updated;
    KostStorage.saveLeads([...leads]);
    return updated;
  },

  deleteLead: (id: string): boolean => {
    const leads = KostStorage.getLeads();
    const filtered = leads.filter((l) => l.id !== id);
    KostStorage.saveLeads(filtered);
    // Hapus juga survei terkait jika ada
    const surveys = KostStorage.getSurveys();
    const filteredSurveys = surveys.filter((s) => s.lead_id !== id);
    KostStorage.saveSurveys(filteredSurveys);
    return true;
  },

  // SURVEY SCHEDULES
  getSurveys: (propertyId?: string): SurveySchedule[] => {
    const surveys = getItem<SurveySchedule[]>(STORAGE_KEYS.SURVEYS, initialSurveys);
    if (!propertyId) return surveys;
    return surveys.filter((s) => s.property_id === propertyId);
  },

  saveSurveys: (surveys: SurveySchedule[]): void => {
    setItem(STORAGE_KEYS.SURVEYS, surveys);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("kost_storage_change", { detail: { key: STORAGE_KEYS.SURVEYS } })
      );
    }
  },

  createSurvey: (payload: Partial<SurveySchedule>): SurveySchedule => {
    const surveys = KostStorage.getSurveys();
    const newSurvey: SurveySchedule = {
      id: payload.id || `survey-${Date.now()}`,
      property_id: payload.property_id || "a0000000-0000-0000-0000-000000000001",
      lead_id: payload.lead_id || "",
      lead_name: payload.lead_name,
      lead_phone: payload.lead_phone,
      room_id: payload.room_id,
      room_number: payload.room_number,
      scheduled_at: payload.scheduled_at || new Date().toISOString(),
      status: payload.status || "scheduled",
      assigned_staff_id: payload.assigned_staff_id,
      assigned_staff_name: payload.assigned_staff_name,
      result_notes: payload.result_notes,
      created_at: payload.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    KostStorage.saveSurveys([newSurvey, ...surveys]);

    // Jika lead masih 'new' atau 'contacted', otomatis majukan ke 'survey_scheduled'
    if (newSurvey.lead_id) {
      const lead = KostStorage.getLeads().find((l) => l.id === newSurvey.lead_id);
      if (
        lead &&
        (lead.status === "new" ||
          lead.status === "contacted" ||
          lead.status === "follow_up")
      ) {
        KostStorage.updateLead(newSurvey.lead_id, { status: "survey_scheduled" });
      }
    }
    return newSurvey;
  },

  updateSurvey: (id: string, updates: Partial<SurveySchedule>): SurveySchedule => {
    const surveys = KostStorage.getSurveys();
    const index = surveys.findIndex((s) => s.id === id);
    if (index === -1) {
      return KostStorage.createSurvey({ ...updates, id });
    }
    const updated = {
      ...surveys[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    surveys[index] = updated;
    KostStorage.saveSurveys([...surveys]);

    // Jika survey status selesai, otomatis perbarui lead status ke survey_done jika masih survey_scheduled
    if (updates.status === "completed" && updated.lead_id) {
      const lead = KostStorage.getLeads().find((l) => l.id === updated.lead_id);
      if (lead && lead.status === "survey_scheduled") {
        KostStorage.updateLead(updated.lead_id, { status: "survey_done" });
      }
    }
    return updated;
  },

  deleteSurvey: (id: string): boolean => {
    const surveys = KostStorage.getSurveys();
    const filtered = surveys.filter((s) => s.id !== id);
    KostStorage.saveSurveys(filtered);
    return true;
  },
};
