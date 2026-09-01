import { supabase } from "../config/supabase";

const isValidUUID = (str?: string): boolean => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

export const SupabaseService = {
  async getDefaultPropertyId(): Promise<string> {
    try {
      const { data } = await supabase.from("properties").select("id").limit(1);
      return data?.[0]?.id || "a0000000-0000-0000-0000-000000000001";
    } catch {
      return "a0000000-0000-0000-0000-000000000001";
    }
  },

  // Properties
  async getProperties() {
    const { data, error } = await supabase.from("properties").select("*").order("created_at", { ascending: true });
    if (error) throw error;
    return data;
  },

  async getPropertyById(id: string) {
    const { data, error } = await supabase.from("properties").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  },

  async createProperty(payload: { name: string; address: string; city?: string; phone?: string }) {
    const { data, error } = await supabase.from("properties").insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async updateProperty(id: string, payload: Partial<{ name: string; address: string; city: string; phone: string }>) {
    const { data, error } = await supabase.from("properties").update(payload).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },

  // Rooms
  async getRooms(propertyId?: string) {
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
    if (error) throw error;

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

  async createRoom(payload: any) {
    const propId = isValidUUID(payload.property_id) ? payload.property_id : await this.getDefaultPropertyId();
    const insertObj: any = {
      property_id: propId,
      room_number: String(payload.room_number || "").trim(),
      floor: Number(payload.floor) || 1,
      room_type: payload.room_type || "Standard",
      base_price: Number(payload.base_price) || 0,
      facilities: payload.facilities || [],
      status: payload.status || "available",
      notes: payload.notes || null,
    };
    if (isValidUUID(payload.id)) {
      insertObj.id = payload.id;
    }

    const { data, error } = await supabase.from("rooms").insert(insertObj).select().single();
    if (error) throw error;
    return data;
  },

  async updateRoom(id: string, payload: any) {
    const updateData: any = {};
    if (payload.room_number !== undefined) updateData.room_number = String(payload.room_number).trim();
    if (payload.floor !== undefined) updateData.floor = Number(payload.floor);
    if (payload.room_type !== undefined) updateData.room_type = payload.room_type;
    if (payload.base_price !== undefined) updateData.base_price = Number(payload.base_price);
    if (payload.facilities !== undefined) updateData.facilities = payload.facilities;
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.notes !== undefined) updateData.notes = payload.notes;

    let query = supabase.from("rooms").update(updateData);
    if (isValidUUID(id)) {
      query = query.eq("id", id);
    } else {
      const roomNum = payload.room_number || id.replace(/^room-/, "");
      query = query.eq("room_number", roomNum);
    }

    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  },

  async deleteRoom(id: string) {
    let query = supabase.from("rooms").delete();
    if (isValidUUID(id)) {
      query = query.eq("id", id);
    } else {
      query = query.eq("room_number", id.replace(/^room-/, ""));
    }
    const { error } = await query;
    if (error) throw error;
    return { success: true };
  },

  // Tenants
  async getTenants(propertyId?: string) {
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
        rooms (
          room_number
        )
      )
    `).order("full_name", { ascending: true });

    if (propertyId && isValidUUID(propertyId)) {
      query = query.eq("property_id", propertyId);
    }

    const { data, error } = await query;
    if (error) throw error;

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
        } : undefined,
      };
    });
  },

  async createTenant(payload: any) {
    const propId = isValidUUID(payload.property_id) ? payload.property_id : await this.getDefaultPropertyId();
    const insertObj: any = {
      property_id: propId,
      full_name: payload.full_name,
      phone_number: payload.phone_number,
      id_card_number: payload.id_card_number || null,
      id_card_url: payload.id_card_url || null,
      emergency_contact_name: payload.emergency_contact_name || null,
      emergency_contact_phone: payload.emergency_contact_phone || null,
      emergency_contact_relation: payload.emergency_contact_relation || null,
    };
    if (isValidUUID(payload.id)) {
      insertObj.id = payload.id;
    }

    const { data, error } = await supabase.from("tenants").insert(insertObj).select().single();
    if (error) throw error;
    return data;
  },

  async updateTenant(id: string, payload: any) {
    let query = supabase.from("tenants").update(payload);
    if (isValidUUID(id)) {
      query = query.eq("id", id);
    } else {
      query = query.eq("phone_number", payload.phone_number || "");
    }
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  },

  async deleteTenant(id: string) {
    let query = supabase.from("tenants").delete();
    if (isValidUUID(id)) {
      query = query.eq("id", id);
    }
    const { error } = await query;
    if (error) throw error;
    return { success: true };
  },

  // Leases
  async getLeases(propertyId?: string) {
    let query = supabase.from("leases").select(`
      *,
      rooms (room_number),
      tenants (full_name, phone_number)
    `).order("created_at", { ascending: false });

    if (propertyId && isValidUUID(propertyId)) {
      query = query.eq("property_id", propertyId);
    }

    const { data, error } = await query;
    if (error) throw error;

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

  async createLease(payload: any) {
    const propId = isValidUUID(payload.property_id) ? payload.property_id : await this.getDefaultPropertyId();
    const insertObj: any = {
      property_id: propId,
      room_id: payload.room_id,
      tenant_id: payload.tenant_id,
      start_date: payload.start_date,
      end_date: payload.end_date || null,
      billing_cycle_day: Number(payload.billing_cycle_day) || 1,
      rent_amount: Number(payload.rent_amount),
      deposit_amount: Number(payload.deposit_amount) || 0,
      status: payload.status || "active",
    };
    if (isValidUUID(payload.id)) {
      insertObj.id = payload.id;
    }

    const { data, error } = await supabase.from("leases").insert(insertObj).select().single();
    if (error) throw error;
    return data;
  },

  async updateLease(id: string, payload: any) {
    const { data, error } = await supabase.from("leases").update(payload).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },

  // Invoices
  async getInvoices(propertyId?: string) {
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
    if (error) throw error;

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

  async createInvoice(payload: any) {
    const propId = isValidUUID(payload.property_id) ? payload.property_id : await this.getDefaultPropertyId();
    const insertObj: any = {
      property_id: propId,
      lease_id: payload.lease_id,
      invoice_number: payload.invoice_number || `INV-${Date.now()}`,
      billing_period: payload.billing_period,
      subtotal_rent: Number(payload.subtotal_rent),
      additional_fees: Number(payload.additional_fees || 0),
      notes: payload.notes || null,
      total_amount: Number(payload.total_amount || (Number(payload.subtotal_rent) + Number(payload.additional_fees || 0))),
      due_date: payload.due_date,
      status: payload.status || "unpaid",
    };
    if (isValidUUID(payload.id)) {
      insertObj.id = payload.id;
    }

    const { data, error } = await supabase.from("invoices").insert(insertObj).select().single();
    if (error) throw error;
    return data;
  },

  async updateInvoice(id: string, payload: any) {
    const { data, error } = await supabase.from("invoices").update(payload).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },

  // Payments
  async recordPayment(payload: {
    invoice_id: string;
    amount_paid: number;
    payment_method: string;
    proof_url?: string;
    verified_by?: string;
    notes?: string;
    id?: string;
  }) {
    const insertObj: any = {
      invoice_id: payload.invoice_id,
      amount_paid: Number(payload.amount_paid),
      payment_method: payload.payment_method,
      proof_url: payload.proof_url || null,
      verified_by: payload.verified_by || "Admin",
      notes: payload.notes || null,
    };
    if (isValidUUID(payload.id)) {
      insertObj.id = payload.id;
    }

    const { data: payment, error: pError } = await supabase.from("payments").insert(insertObj).select().single();
    if (pError) throw pError;

    // Check if total payments cover invoice total amount
    const { data: allPayments } = await supabase.from("payments").select("amount_paid").eq("invoice_id", payload.invoice_id);
    const totalPaid = (allPayments || []).reduce((sum, p) => sum + Number(p.amount_paid), 0);

    const { data: invoice } = await supabase.from("invoices").select("total_amount").eq("id", payload.invoice_id).single();
    if (invoice && totalPaid >= Number(invoice.total_amount)) {
      await supabase.from("invoices").update({ status: "paid" }).eq("id", payload.invoice_id);
    }

    return payment;
  },

  // Electricity Transactions
  async getElectricityTransactions(propertyId?: string) {
    let query = supabase.from("electricity_transactions").select(`
      *,
      rooms (room_number),
      tenants (full_name, phone_number)
    `).order("created_at", { ascending: false });

    if (propertyId && isValidUUID(propertyId)) {
      query = query.eq("property_id", propertyId);
    }

    const { data, error } = await query;
    if (error) throw error;

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

  async createElectricityTransaction(payload: any) {
    const propId = isValidUUID(payload.property_id) ? payload.property_id : await this.getDefaultPropertyId();
    const insertObj: any = {
      property_id: propId,
      lease_id: payload.lease_id || null,
      room_id: payload.room_id,
      tenant_id: payload.tenant_id,
      token_code: payload.token_code,
      nominal_amount: Number(payload.nominal_amount),
      kwh_units: payload.kwh_units ? Number(payload.kwh_units) : null,
      cost_price: Number(payload.cost_price),
      selling_price: Number(payload.selling_price),
      payment_status: payload.payment_status || "paid_cash",
      invoice_id: payload.invoice_id || null,
      sent_at: payload.sent_at || null,
    };
    if (isValidUUID(payload.id)) {
      insertObj.id = payload.id;
    }

    const { data, error } = await supabase.from("electricity_transactions").insert(insertObj).select().single();
    if (error) throw error;
    return data;
  },

  async updateElectricityTransaction(id: string, payload: any) {
    const { data, error } = await supabase.from("electricity_transactions").update(payload).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },

  // Room Complaints
  async getComplaints(propertyId?: string) {
    let query = supabase.from("room_complaints").select("*").order("created_at", { ascending: false });
    if (propertyId && isValidUUID(propertyId)) {
      query = query.eq("property_id", propertyId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createComplaint(payload: any) {
    const propId = isValidUUID(payload.property_id) ? payload.property_id : await this.getDefaultPropertyId();
    const insertObj: any = {
      ...payload,
      property_id: propId,
    };
    if (isValidUUID(payload.id)) {
      insertObj.id = payload.id;
    }
    const { data, error } = await supabase.from("room_complaints").insert(insertObj).select().single();
    if (error) throw error;
    return data;
  },

  async updateComplaint(id: string, payload: any) {
    const { data, error } = await supabase.from("room_complaints").update(payload).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },

  // Finance Wallets & Transactions
  async getWallets(propertyId?: string) {
    let query = supabase.from("finance_wallets").select("*").order("created_at", { ascending: true });
    if (propertyId && isValidUUID(propertyId)) query = query.eq("property_id", propertyId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((w: any) => ({ ...w, initial_balance: Number(w.initial_balance) }));
  },

  async createWallet(payload: any) {
    const propId = isValidUUID(payload.property_id) ? payload.property_id : await this.getDefaultPropertyId();
    const insertObj: any = {
      property_id: propId,
      name: payload.name,
      type: payload.type || "cash",
      wallet_kind: payload.wallet_kind || "asset",
      category_name: payload.category_name || null,
      account_number: payload.account_number || null,
      account_holder: payload.account_holder || null,
      initial_balance: Number(payload.initial_balance || 0),
      color: payload.color || null,
      icon: payload.icon || null,
      is_default: Boolean(payload.is_default),
    };
    if (isValidUUID(payload.id)) {
      insertObj.id = payload.id;
    }

    const { data, error } = await supabase.from("finance_wallets").insert(insertObj).select().single();
    if (error) throw error;
    return data;
  },

  async getCashTransactions(propertyId?: string) {
    let query = supabase.from("cash_transactions").select("*").order("date", { ascending: false });
    if (propertyId && isValidUUID(propertyId)) query = query.eq("property_id", propertyId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((t: any) => ({ ...t, amount: Number(t.amount) }));
  },

  async createCashTransaction(payload: any) {
    const propId = isValidUUID(payload.property_id) ? payload.property_id : await this.getDefaultPropertyId();
    const insertObj: any = {
      property_id: propId,
      type: payload.type,
      category: payload.category,
      category_name: payload.category_name || payload.category,
      category_id: isValidUUID(payload.category_id) ? payload.category_id : null,
      wallet_id: isValidUUID(payload.wallet_id) ? payload.wallet_id : null,
      wallet_name: payload.wallet_name || null,
      title: payload.title,
      amount: Number(payload.amount),
      date: payload.date || new Date().toISOString().split("T")[0],
      payment_method: payload.payment_method || "Kas Tunai",
      receipt_url: payload.receipt_url || null,
      notes: payload.notes || null,
      recorded_by: payload.recorded_by || "Owner",
    };
    if (isValidUUID(payload.id)) {
      insertObj.id = payload.id;
    }

    const { data, error } = await supabase.from("cash_transactions").insert(insertObj).select().single();
    if (error) throw error;
    return data;
  },

  // Payment Methods
  async getPaymentMethods(propertyId?: string) {
    let query = supabase.from("payment_methods_config").select("*").order("created_at", { ascending: true });
    if (propertyId && isValidUUID(propertyId)) query = query.eq("property_id", propertyId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createPaymentMethod(payload: any) {
    const propId = isValidUUID(payload.property_id) ? payload.property_id : await this.getDefaultPropertyId();
    const insertObj = { ...payload, property_id: propId };
    const { data, error } = await supabase.from("payment_methods_config").insert(insertObj).select().single();
    if (error) throw error;
    return data;
  },

  async updatePaymentMethod(id: string, payload: any) {
    const { data, error } = await supabase.from("payment_methods_config").update(payload).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
};
