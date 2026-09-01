import { createClient } from "./supabase/client";
import {
  Property,
  Room,
  Tenant,
  Lease,
  Invoice,
  Payment,
  ElectricityTransaction,
  RoomComplaint,
  FinanceWallet,
  CashTransaction,
  PaymentMethodConfig,
} from "@/types";

const isValidUUID = (str?: string): boolean => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

export const FrontendSupabaseService = {
  // Get all properties
  async getProperties(): Promise<Property[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from("properties").select("*").order("created_at", { ascending: true });
    if (error) {
      console.warn("Supabase fetch properties warning:", error.message);
      return [];
    }
    return data || [];
  },

  // Get all rooms with joined active tenants
  async getRooms(propertyId?: string): Promise<Room[]> {
    const supabase = createClient();
    let query = supabase.from("rooms").select(`
      *,
      leases (
        id,
        tenant_id,
        start_date,
        end_date,
        status,
        tenants (
          id,
          full_name,
          phone_number,
          id_card_number,
          id_card_url,
          emergency_contact_name,
          emergency_contact_phone,
          emergency_contact_relation
        )
      )
    `).order("room_number", { ascending: true });

    if (propertyId && isValidUUID(propertyId)) {
      query = query.eq("property_id", propertyId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn("Supabase fetch rooms warning:", error.message);
      return [];
    }

    return (data || []).map((room: any) => {
      const activeLease = (room.leases || []).find((l: any) => l.status === "active");
      const tenant = activeLease?.tenants;
      return {
        id: room.id,
        property_id: room.property_id,
        room_number: room.room_number,
        floor: room.floor,
        room_type: room.room_type || "Standard",
        base_price: Number(room.base_price),
        facilities: room.facilities || [],
        status: room.status,
        notes: room.notes,
        created_at: room.created_at,
        tenant_id: tenant?.id,
        current_tenant: tenant ? {
          id: tenant.id,
          full_name: tenant.full_name,
          phone_number: tenant.phone_number,
          id_card_number: tenant.id_card_number,
          id_card_url: tenant.id_card_url,
          emergency_contact_name: tenant.emergency_contact_name,
          emergency_contact_phone: tenant.emergency_contact_phone,
          emergency_contact_relation: tenant.emergency_contact_relation,
          lease_id: activeLease.id,
          start_date: activeLease.start_date,
          end_date: activeLease.end_date,
        } : undefined,
      };
    });
  },

  // Get all tenants
  async getTenants(propertyId?: string): Promise<Tenant[]> {
    const supabase = createClient();
    let query = supabase.from("tenants").select(`
      *,
      leases (
        id,
        room_id,
        start_date,
        end_date,
        billing_cycle_day,
        rent_amount,
        deposit_amount,
        status,
        rooms (room_number)
      )
    `).order("full_name", { ascending: true });

    if (propertyId && isValidUUID(propertyId)) {
      query = query.eq("property_id", propertyId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn("Supabase fetch tenants warning:", error.message);
      return [];
    }

    return (data || []).map((t: any) => {
      const activeLease = (t.leases || []).find((l: any) => l.status === "active");
      return {
        id: t.id,
        property_id: t.property_id,
        full_name: t.full_name,
        phone_number: t.phone_number,
        id_card_number: t.id_card_number,
        id_card_url: t.id_card_url,
        emergency_contact_name: t.emergency_contact_name,
        emergency_contact_phone: t.emergency_contact_phone,
        emergency_contact_relation: t.emergency_contact_relation,
        created_at: t.created_at,
        active_lease: activeLease ? {
          id: activeLease.id,
          property_id: t.property_id,
          room_id: activeLease.room_id,
          room_number: activeLease.rooms?.room_number,
          tenant_id: t.id,
          start_date: activeLease.start_date,
          end_date: activeLease.end_date,
          billing_cycle_day: activeLease.billing_cycle_day,
          rent_amount: Number(activeLease.rent_amount),
          deposit_amount: Number(activeLease.deposit_amount),
          status: activeLease.status,
          created_at: activeLease.created_at || t.created_at,
        } : undefined,
      };
    });
  },

  // Get all leases
  async getLeases(propertyId?: string): Promise<Lease[]> {
    const supabase = createClient();
    let query = supabase.from("leases").select(`
      *,
      rooms (room_number),
      tenants (full_name, phone_number)
    `).order("created_at", { ascending: false });

    if (propertyId && isValidUUID(propertyId)) {
      query = query.eq("property_id", propertyId);
    }

    const { data, error } = await query;
    if (error) return [];

    return (data || []).map((l: any) => ({
      id: l.id,
      property_id: l.property_id,
      room_id: l.room_id,
      tenant_id: l.tenant_id,
      start_date: l.start_date,
      end_date: l.end_date,
      billing_cycle_day: l.billing_cycle_day,
      rent_amount: Number(l.rent_amount),
      deposit_amount: Number(l.deposit_amount),
      status: l.status,
      created_at: l.created_at,
      room_number: l.rooms?.room_number,
      tenant_name: l.tenants?.full_name,
      tenant_phone: l.tenants?.phone_number,
    }));
  },

  // Get all invoices
  async getInvoices(propertyId?: string): Promise<Invoice[]> {
    const supabase = createClient();
    let query = supabase.from("invoices").select(`
      *,
      leases (
        room_id,
        rooms (room_number),
        tenants (full_name, phone_number)
      ),
      payments (*)
    `).order("created_at", { ascending: false });

    if (propertyId && isValidUUID(propertyId)) {
      query = query.eq("property_id", propertyId);
    }

    const { data, error } = await query;
    if (error) return [];

    return (data || []).map((inv: any) => ({
      id: inv.id,
      property_id: inv.property_id,
      lease_id: inv.lease_id,
      invoice_number: inv.invoice_number,
      billing_period: inv.billing_period,
      subtotal_rent: Number(inv.subtotal_rent),
      additional_fees: Number(inv.additional_fees || 0),
      notes: inv.notes,
      total_amount: Number(inv.total_amount),
      due_date: inv.due_date,
      status: inv.status,
      created_at: inv.created_at,
      room_number: inv.leases?.rooms?.room_number,
      tenant_name: inv.leases?.tenants?.full_name,
      tenant_phone: inv.leases?.tenants?.phone_number,
      payments: (inv.payments || []).map((p: any) => ({
        id: p.id,
        invoice_id: p.invoice_id,
        amount_paid: Number(p.amount_paid),
        payment_method: p.payment_method,
        proof_url: p.proof_url,
        verified_by: p.verified_by,
        paid_at: p.paid_at,
        notes: p.notes,
      })),
    }));
  },

  // Get electricity transactions
  async getElectricityTransactions(propertyId?: string): Promise<ElectricityTransaction[]> {
    const supabase = createClient();
    let query = supabase.from("electricity_transactions").select(`
      *,
      rooms (room_number),
      tenants (full_name, phone_number)
    `).order("created_at", { ascending: false });

    if (propertyId && isValidUUID(propertyId)) {
      query = query.eq("property_id", propertyId);
    }

    const { data, error } = await query;
    if (error) return [];

    return (data || []).map((el: any) => ({
      id: el.id,
      property_id: el.property_id,
      lease_id: el.lease_id,
      room_id: el.room_id,
      tenant_id: el.tenant_id,
      token_code: el.token_code,
      nominal_amount: Number(el.nominal_amount),
      kwh_units: el.kwh_units ? Number(el.kwh_units) : undefined,
      cost_price: Number(el.cost_price),
      selling_price: Number(el.selling_price),
      profit_margin: Number(el.profit_margin || (Number(el.selling_price) - Number(el.cost_price))),
      payment_status: el.payment_status,
      invoice_id: el.invoice_id,
      sent_at: el.sent_at,
      created_at: el.created_at,
      room_number: el.rooms?.room_number,
      tenant_name: el.tenants?.full_name,
      tenant_phone: el.tenants?.phone_number,
    }));
  },

  // Get Complaints
  async getComplaints(propertyId?: string): Promise<RoomComplaint[]> {
    const supabase = createClient();
    let query = supabase.from("room_complaints").select("*").order("created_at", { ascending: false });
    if (propertyId && isValidUUID(propertyId)) query = query.eq("property_id", propertyId);
    const { data, error } = await query;
    if (error) return [];
    return data || [];
  },

  // Get Wallets & Cash Transactions
  async getWallets(propertyId?: string): Promise<FinanceWallet[]> {
    const supabase = createClient();
    let query = supabase.from("finance_wallets").select("*").order("created_at", { ascending: true });
    if (propertyId && isValidUUID(propertyId)) query = query.eq("property_id", propertyId);
    const { data, error } = await query;
    if (error) return [];
    return (data || []).map((w: any) => ({ ...w, initial_balance: Number(w.initial_balance) }));
  },

  async getCashTransactions(propertyId?: string): Promise<CashTransaction[]> {
    const supabase = createClient();
    let query = supabase.from("cash_transactions").select("*").order("date", { ascending: false });
    if (propertyId && isValidUUID(propertyId)) query = query.eq("property_id", propertyId);
    const { data, error } = await query;
    if (error) return [];
    return (data || []).map((t: any) => ({ ...t, amount: Number(t.amount) }));
  },

  async getPaymentMethods(propertyId?: string): Promise<PaymentMethodConfig[]> {
    const supabase = createClient();
    let query = supabase.from("payment_methods_config").select("*").order("created_at", { ascending: true });
    if (propertyId && isValidUUID(propertyId)) query = query.eq("property_id", propertyId);
    const { data, error } = await query;
    if (error) return [];
    return data || [];
  },

  async getDefaultPropertyId(): Promise<string> {
    try {
      const props = await this.getProperties();
      return props[0]?.id || "a0000000-0000-0000-0000-000000000001";
    } catch {
      return "a0000000-0000-0000-0000-000000000001";
    }
  },

  // MUTATIONS (WRITE TO SUPABASE)
  async createRoom(room: Partial<Room>) {
    const supabase = createClient();
    const propId = isValidUUID(room.property_id)
      ? room.property_id
      : await this.getDefaultPropertyId();

    const insertObj: any = {
      property_id: propId,
      room_number: String(room.room_number || "").trim(),
      floor: Number(room.floor) || 1,
      room_type: room.room_type || "Standard",
      base_price: Number(room.base_price) || 0,
      facilities: room.facilities || [],
      status: room.status || "available",
      notes: room.notes || null,
    };
    if (isValidUUID(room.id)) {
      insertObj.id = room.id;
    }

    const { data, error } = await supabase.from("rooms").insert(insertObj).select().single();
    if (error) console.error("Error creating room in Supabase:", error);
    return data;
  },

  async updateRoom(id: string, updates: Partial<Room>) {
    const supabase = createClient();
    const updateData: any = {};
    if (updates.room_number !== undefined) updateData.room_number = String(updates.room_number).trim();
    if (updates.floor !== undefined) updateData.floor = Number(updates.floor);
    if (updates.room_type !== undefined) updateData.room_type = updates.room_type;
    if (updates.base_price !== undefined) updateData.base_price = Number(updates.base_price);
    if (updates.facilities !== undefined) updateData.facilities = updates.facilities;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    let query = supabase.from("rooms").update(updateData);
    if (isValidUUID(id)) {
      query = query.eq("id", id);
    } else {
      const roomNum = updates.room_number || id.replace(/^room-/, "");
      query = query.eq("room_number", roomNum);
    }

    const { data, error } = await query.select().single();
    if (error) console.error("Error updating room in Supabase:", error);
    return data;
  },

  async deleteRoom(id: string) {
    const supabase = createClient();
    let query = supabase.from("rooms").delete();
    if (isValidUUID(id)) {
      query = query.eq("id", id);
    } else {
      query = query.eq("room_number", id.replace(/^room-/, ""));
    }
    const { error } = await query;
    if (error) console.error("Error deleting room in Supabase:", error);
  },

  async createTenant(tenant: Partial<Tenant>) {
    const supabase = createClient();
    const propId = isValidUUID(tenant.property_id)
      ? tenant.property_id
      : await this.getDefaultPropertyId();

    const insertObj: any = {
      property_id: propId,
      full_name: tenant.full_name,
      phone_number: tenant.phone_number,
      id_card_number: tenant.id_card_number || null,
      id_card_url: tenant.id_card_url || null,
      emergency_contact_name: tenant.emergency_contact_name || null,
      emergency_contact_phone: tenant.emergency_contact_phone || null,
      emergency_contact_relation: tenant.emergency_contact_relation || null,
    };
    if (isValidUUID(tenant.id)) {
      insertObj.id = tenant.id;
    }

    const { data, error } = await supabase.from("tenants").insert(insertObj).select().single();
    if (error) console.error("Error creating tenant in Supabase:", error);
    return data;
  },

  async updateTenant(id: string, updates: Partial<Tenant>) {
    const supabase = createClient();
    let query = supabase.from("tenants").update(updates);
    if (isValidUUID(id)) {
      query = query.eq("id", id);
    }
    const { data, error } = await query.select().single();
    if (error) console.error("Error updating tenant in Supabase:", error);
    return data;
  },

  async deleteTenant(id: string) {
    const supabase = createClient();
    let query = supabase.from("tenants").delete();
    if (isValidUUID(id)) {
      query = query.eq("id", id);
    }
    const { error } = await query;
    if (error) console.error("Error deleting tenant in Supabase:", error);
  },

  async createLease(lease: Partial<Lease>) {
    const supabase = createClient();
    const propId = isValidUUID(lease.property_id)
      ? lease.property_id
      : await this.getDefaultPropertyId();

    const insertObj: any = {
      property_id: propId,
      room_id: lease.room_id,
      tenant_id: lease.tenant_id,
      start_date: lease.start_date,
      end_date: lease.end_date || null,
      billing_cycle_day: Number(lease.billing_cycle_day) || 1,
      rent_amount: Number(lease.rent_amount) || 0,
      deposit_amount: Number(lease.deposit_amount) || 0,
      status: lease.status || "active",
    };
    if (isValidUUID(lease.id)) {
      insertObj.id = lease.id;
    }

    const { data, error } = await supabase.from("leases").insert(insertObj).select().single();
    if (error) console.error("Error creating lease in Supabase:", error);
    return data;
  },

  async createInvoice(invoice: Partial<Invoice>) {
    const supabase = createClient();
    const propId = isValidUUID(invoice.property_id)
      ? invoice.property_id
      : await this.getDefaultPropertyId();

    const insertObj: any = {
      property_id: propId,
      lease_id: invoice.lease_id,
      invoice_number: invoice.invoice_number || `INV-${Date.now()}`,
      billing_period: invoice.billing_period,
      subtotal_rent: Number(invoice.subtotal_rent) || 0,
      additional_fees: Number(invoice.additional_fees) || 0,
      notes: invoice.notes || null,
      total_amount: Number(invoice.total_amount) || 0,
      due_date: invoice.due_date,
      status: invoice.status || "unpaid",
    };
    if (isValidUUID(invoice.id)) {
      insertObj.id = invoice.id;
    }

    const { data, error } = await supabase.from("invoices").insert(insertObj).select().single();
    if (error) console.error("Error creating invoice in Supabase:", error);
    return data;
  },

  async updateInvoice(id: string, updates: Partial<Invoice>) {
    const supabase = createClient();
    const { data, error } = await supabase.from("invoices").update(updates).eq("id", id).select().single();
    if (error) console.error("Error updating invoice in Supabase:", error);
    return data;
  },

  async createPayment(payment: Partial<Payment>) {
    const supabase = createClient();
    const insertObj: any = {
      invoice_id: payment.invoice_id,
      amount_paid: Number(payment.amount_paid) || 0,
      payment_method: payment.payment_method || "cash",
      proof_url: payment.proof_url || null,
      verified_by: payment.verified_by || "Admin",
      notes: payment.notes || null,
    };
    if (isValidUUID(payment.id)) {
      insertObj.id = payment.id;
    }

    const { data, error } = await supabase.from("payments").insert(insertObj).select().single();
    if (error) console.error("Error recording payment in Supabase:", error);
    return data;
  },

  async createElectricityTransaction(el: Partial<ElectricityTransaction>) {
    const supabase = createClient();
    const propId = isValidUUID(el.property_id)
      ? el.property_id
      : await this.getDefaultPropertyId();

    const insertObj: any = {
      property_id: propId,
      lease_id: el.lease_id || null,
      room_id: el.room_id,
      tenant_id: el.tenant_id,
      token_code: el.token_code,
      nominal_amount: Number(el.nominal_amount) || 0,
      kwh_units: el.kwh_units ? Number(el.kwh_units) : null,
      cost_price: Number(el.cost_price) || 0,
      selling_price: Number(el.selling_price) || 0,
      payment_status: el.payment_status || "paid_cash",
      invoice_id: el.invoice_id || null,
      sent_at: el.sent_at || null,
    };
    if (isValidUUID(el.id)) {
      insertObj.id = el.id;
    }

    const { data, error } = await supabase.from("electricity_transactions").insert(insertObj).select().single();
    if (error) console.error("Error creating electricity transaction in Supabase:", error);
    return data;
  },

  async createComplaint(complaint: Partial<RoomComplaint>) {
    const supabase = createClient();
    const propId = isValidUUID(complaint.property_id)
      ? complaint.property_id
      : await this.getDefaultPropertyId();

    const insertObj: any = {
      property_id: propId,
      room_id: complaint.room_id || null,
      room_number: complaint.room_number || "General",
      tenant_id: complaint.tenant_id || null,
      tenant_name: complaint.tenant_name || "Penghuni",
      tenant_phone: complaint.tenant_phone || "",
      source: complaint.source || "whatsapp_cs_ai",
      raw_chat_message: complaint.raw_chat_message || "",
      ai_extracted_summary: complaint.ai_extracted_summary || null,
      ai_response_sent: complaint.ai_response_sent || null,
      category: complaint.category || "general",
      priority: complaint.priority || "medium",
      status: complaint.status || "pending",
      assigned_staff_name: complaint.assigned_staff_name || null,
      resolution_notes: complaint.resolution_notes || null,
    };
    if (isValidUUID(complaint.id)) {
      insertObj.id = complaint.id;
    }

    const { data, error } = await supabase.from("room_complaints").insert(insertObj).select().single();
    if (error) console.error("Error creating complaint in Supabase:", error);
    return data;
  },

  async updateComplaint(id: string, updates: Partial<RoomComplaint>) {
    const supabase = createClient();
    const { data, error } = await supabase.from("room_complaints").update(updates).eq("id", id).select().single();
    if (error) console.error("Error updating complaint in Supabase:", error);
    return data;
  },

  async createWallet(wallet: Partial<FinanceWallet>) {
    const supabase = createClient();
    const propId = isValidUUID(wallet.property_id)
      ? wallet.property_id
      : await this.getDefaultPropertyId();

    const insertObj: any = {
      property_id: propId,
      name: wallet.name,
      type: wallet.type || "cash",
      wallet_kind: wallet.wallet_kind || "asset",
      category_name: wallet.category_name || null,
      account_number: wallet.account_number || null,
      account_holder: wallet.account_holder || null,
      initial_balance: Number(wallet.initial_balance) || 0,
      color: wallet.color || null,
      icon: wallet.icon || null,
      is_default: Boolean(wallet.is_default),
    };
    if (isValidUUID(wallet.id)) {
      insertObj.id = wallet.id;
    }

    const { data, error } = await supabase.from("finance_wallets").insert(insertObj).select().single();
    if (error) console.error("Error creating wallet in Supabase:", error);
    return data;
  },

  async createCashTransaction(tx: Partial<CashTransaction>) {
    const supabase = createClient();
    const propId = isValidUUID(tx.property_id)
      ? tx.property_id
      : await this.getDefaultPropertyId();

    const insertObj: any = {
      property_id: propId,
      type: tx.type,
      category: tx.category,
      category_name: tx.category_name || tx.category,
      category_id: isValidUUID(tx.category_id) ? tx.category_id : null,
      wallet_id: isValidUUID(tx.wallet_id) ? tx.wallet_id : null,
      wallet_name: tx.wallet_name || null,
      title: tx.title,
      amount: Number(tx.amount) || 0,
      date: tx.date || new Date().toISOString().split("T")[0],
      payment_method: tx.payment_method || "Kas Tunai",
      receipt_url: tx.receipt_url || null,
      notes: tx.notes || null,
      recorded_by: tx.recorded_by || "Owner",
    };
    if (isValidUUID(tx.id)) {
      insertObj.id = tx.id;
    }

    const { data, error } = await supabase.from("cash_transactions").insert(insertObj).select().single();
    if (error) console.error("Error creating cash transaction in Supabase:", error);
    return data;
  },
};
