export type RoomStatus = 'available' | 'occupied' | 'maintenance';
export type LeaseStatus = 'active' | 'completed' | 'cancelled' | 'terminated';
export type InvoiceStatus = 'unpaid' | 'paid' | 'overdue';
export type TokenPaymentStatus = 'paid_cash' | 'paid_transfer' | 'invoiced' | 'unpaid';
export type UserRole = 'owner' | 'admin' | 'cleaning_staff' | string;

export interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  description?: string;
  cover_image?: string;
  created_at: string;
}

export interface RoomType {
  id: string;
  property_id: string;
  name: string;
  slug?: string;
  base_price: number;
  facilities: string[];
  room_size?: string;
  description?: string;
  photos?: string[];
  is_active?: boolean;
  display_order?: number;
  created_at: string;
  updated_at?: string;
  // Computed / joined
  total_rooms?: number;
  available_rooms?: number;
}

export interface Room {
  id: string;
  property_id: string;
  room_type_id?: string;
  room_number: string;
  floor: number;
  room_type: string;
  base_price: number;
  facilities: string[];
  status: RoomStatus;
  notes?: string;
  description?: string;
  photos?: string[];
  created_at: string;
  tenant_id?: string; // Foreign Key referencing Tenant.id (Primary Key)
  // Joined fields from Tenant master entity
  current_tenant?: {
    id: string; // Tenant Primary Key
    full_name: string;
    phone_number: string;
    id_card_number?: string;
    id_card_url?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    emergency_contact_relation?: string;
    lease_id?: string;
    start_date?: string;
    end_date?: string;
  };
}

export interface Tenant {
  id: string;
  property_id: string;
  full_name: string;
  phone_number: string; // E.164 (+62...)
  id_card_number?: string;
  id_card_url?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  created_at: string;
  // Joined fields
  active_lease?: Lease;
}

export interface Lease {
  id: string;
  property_id: string;
  room_id: string;
  tenant_id: string;
  start_date: string;
  end_date?: string;
  billing_cycle_day: number; // 1 - 31
  rent_amount: number;
  deposit_amount: number;
  status: LeaseStatus;
  created_at: string;
  // Joined
  room_number?: string;
  tenant_name?: string;
  tenant_phone?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  amount: number;
}

export interface Invoice {
  id: string;
  property_id: string;
  lease_id?: string;
  room_id?: string;
  invoice_number: string;
  billing_period: string; // '2026-08'
  subtotal_rent: number;
  additional_fees: number;
  items?: InvoiceItem[];
  notes?: string;
  total_amount: number;
  due_date: string;
  status: InvoiceStatus;
  created_at: string;
  reminder_count?: number;
  last_reminder_at?: string;
  last_reminder_template?: string;
  // Joined
  room_number?: string;
  tenant_name?: string;
  tenant_phone?: string;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount_paid: number;
  payment_method: string;
  proof_url?: string;
  verified_by: string;
  paid_at: string;
  notes?: string;
  created_at: string;
}

export interface ElectricityTransaction {
  id: string;
  property_id: string;
  lease_id?: string;
  room_id: string;
  tenant_id: string;
  token_code: string; // 20 digit
  nominal_amount: number;
  kwh_units?: number;
  cost_price: number;
  selling_price: number;
  profit_margin: number;
  payment_status: TokenPaymentStatus;
  invoice_id?: string;
  sent_at?: string;
  created_at: string;
  // Joined
  room_number?: string;
  tenant_name?: string;
  tenant_phone?: string;
}

export interface PaymentMethodConfig {
  id: string;
  property_id: string;
  bank_name: string;
  account_number?: string;
  account_holder?: string;
  qris_image_url?: string;
  instructions?: string;
  is_active: boolean;
}

export interface OwnerDashboardMetrics {
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  maintenanceRooms: number;
  occupancyRate: number; // percentage
  currentMonthRevenue: number;
  targetMonthlyRevenue: number;
  totalUnpaidAmount: number;
  unpaidInvoicesCount: number;
  electricityProfitTotal: number;
  electricityTransactionsCount: number;
  recentPayments: {
    id: string;
    invoice_number: string;
    room_number: string;
    tenant_name: string;
    amount: number;
    payment_method: string;
    paid_at: string;
  }[];
}

export interface StaffAccount {
  id: string;
  property_id: string;
  full_name: string;
  username: string;
  password?: string;
  role: UserRole | string;
  custom_role_id?: string | null;
  phone_number: string;
  email?: string;
  login_id?: string | null;
  shift?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  username?: string;
  email?: string;
  phone_number?: string;
  login_id?: string | null;
  role: UserRole;
  custom_role_id?: string | null;
  role_name?: string;
  permissions?: string[];
  avatar_url?: string;
  property_name?: string;
  property_id?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type FeaturePermission =
  | "owner-dashboard"
  | "ai-assistant"
  | "cashflow"
  | "rooms"
  | "tenants"
  | "electricity"
  | "billing"
  | "owner-audit"
  | "staff-management"
  | "profile"
  | "leads";

export interface RolePermissionConfig {
  id: string;
  property_id?: string;
  name: string;
  description: string;
  badge_color?: "lime" | "info" | "warning" | "destructive" | "success" | "secondary" | string;
  is_system?: boolean;
  permissions: string[];
  created_at?: string;
  updated_at?: string;
}

export type ComplaintStatus = "pending" | "in_progress" | "resolved";
export type ComplaintCategory = "ac_facility" | "plumbing" | "electricity" | "cleanliness" | "security" | "general" | "other";
export type ComplaintPriority = "low" | "medium" | "high" | "urgent";

export interface RoomComplaint {
  id: string;
  property_id: string;
  room_id: string;
  room_number: string;
  tenant_id?: string;
  tenant_name: string;
  tenant_phone: string; // WhatsApp sender (+62...)
  source: "whatsapp_cs_ai";
  raw_chat_message: string; // Original WA chat text from tenant
  ai_extracted_summary: string; // AI generated summary/ticket
  ai_response_sent: string; // What CS AI responded back to tenant on WA
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  assigned_staff_name?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at?: string;
  resolved_at?: string;
}

export type TransactionType = "income" | "expense";
export type WalletKind = "asset" | "liability";

export interface FinanceCategory {
  id: string;
  name: string;
  scope?: "wallet" | "transaction"; // Pemisahan eksplisit: Kategori Wallet vs Kategori Transaksi
  type?: TransactionType; // "income" | "expense" untuk transaksi
  category_kind?: "asset" | "liability" | "income" | "expense";
  icon?: string;
  is_default?: boolean;
  created_at: string;
}

export interface FinanceWallet {
  id: string;
  property_id: string;
  name: string; // e.g. "BCA", "ovo", "Kas Tunai"
  type: "cash" | "bank" | "ewallet" | "other";
  wallet_kind: WalletKind; // "asset" or "liability"
  category_name?: string; // e.g. "Business", "Cash", "Personal"
  account_number?: string;
  account_holder?: string;
  initial_balance: number;
  color?: string;
  icon?: string;
  is_default?: boolean;
  created_at: string;
}

export interface CashTransaction {
  id: string;
  property_id: string;
  type: TransactionType;
  category: string;
  category_name?: string;
  category_id?: string;
  wallet_id?: string; // Foreign key to FinanceWallet
  wallet_name?: string; // e.g. "Kas Tunai", "BCA Operasional"
  title: string;
  amount: number;
  date: string; // YYYY-MM-DD
  payment_method: string; // "Kas Tunai", "BCA", "Mandiri", "QRIS", dll.
  receipt_url?: string;
  notes?: string;
  recorded_by: string; // "Owner", "Admin", etc.
  created_at: string;
}

export type LeadStatus =
  | "new"
  | "contacted"
  | "follow_up"
  | "survey_scheduled"
  | "survey_done"
  | "negotiation"
  | "won"
  | "lost";

export type LeadChannel =
  | "whatsapp"
  | "landing_page"
  | "instagram"
  | "tiktok"
  | "facebook"
  | "referral"
  | "marketplace"
  | "walk_in"
  | "other";

export type SurveyStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "no_show"
  | "cancelled";

export interface Lead {
  id: string;
  property_id: string;
  name: string;
  phone: string;
  channel: LeadChannel;
  landing_page_campaign?: string;
  preferred_room_type?: string;
  budget_min?: number;
  budget_max?: number;
  preferred_move_in_date?: string;
  is_warm: boolean;
  status: LeadStatus;
  assigned_staff_id?: string;
  assigned_staff_name?: string;
  follow_up_at?: string;
  notes?: string;
  surveys?: SurveySchedule[];
  created_at: string;
  updated_at?: string;
}

export interface SurveySchedule {
  id: string;
  property_id: string;
  lead_id: string;
  lead_name?: string;
  lead_phone?: string;
  room_id?: string;
  room_number?: string;
  scheduled_at: string;
  status: SurveyStatus;
  assigned_staff_id?: string;
  assigned_staff_name?: string;
  result_notes?: string;
  created_at: string;
  updated_at?: string;
}
