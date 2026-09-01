export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cash_transactions: {
        Row: {
          amount: number
          category: string
          category_id: string | null
          category_name: string | null
          created_at: string | null
          date: string
          id: string
          notes: string | null
          payment_method: string | null
          property_id: string
          receipt_url: string | null
          recorded_by: string | null
          title: string
          type: string
          wallet_id: string | null
          wallet_name: string | null
        }
        Insert: {
          amount?: number
          category: string
          category_id?: string | null
          category_name?: string | null
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          property_id: string
          receipt_url?: string | null
          recorded_by?: string | null
          title: string
          type: string
          wallet_id?: string | null
          wallet_name?: string | null
        }
        Update: {
          amount?: number
          category?: string
          category_id?: string | null
          category_name?: string | null
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          property_id?: string
          receipt_url?: string | null
          recorded_by?: string | null
          title?: string
          type?: string
          wallet_id?: string | null
          wallet_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "finance_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      electricity_transactions: {
        Row: {
          cost_price: number
          created_at: string | null
          id: string
          invoice_id: string | null
          kwh_units: number | null
          lease_id: string | null
          nominal_amount: number
          payment_status: Database["public"]["Enums"]["token_payment_status"]
          profit_margin: number | null
          property_id: string
          room_id: string
          selling_price: number
          sent_at: string | null
          tenant_id: string
          token_code: string
        }
        Insert: {
          cost_price: number
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          kwh_units?: number | null
          lease_id?: string | null
          nominal_amount: number
          payment_status?: Database["public"]["Enums"]["token_payment_status"]
          profit_margin?: number | null
          property_id: string
          room_id: string
          selling_price: number
          sent_at?: string | null
          tenant_id: string
          token_code: string
        }
        Update: {
          cost_price?: number
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          kwh_units?: number | null
          lease_id?: string | null
          nominal_amount?: number
          payment_status?: Database["public"]["Enums"]["token_payment_status"]
          profit_margin?: number | null
          property_id?: string
          room_id?: string
          selling_price?: number
          sent_at?: string | null
          tenant_id?: string
          token_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "electricity_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "electricity_transactions_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "electricity_transactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "electricity_transactions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "electricity_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_categories: {
        Row: {
          category_kind: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          type: string | null
        }
        Insert: {
          category_kind?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          type?: string | null
        }
        Update: {
          category_kind?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          type?: string | null
        }
        Relationships: []
      }
      finance_wallets: {
        Row: {
          account_holder: string | null
          account_number: string | null
          category_name: string | null
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          initial_balance: number
          is_default: boolean | null
          name: string
          property_id: string
          type: string
          wallet_kind: string
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          category_name?: string | null
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          initial_balance?: number
          is_default?: boolean | null
          name: string
          property_id: string
          type?: string
          wallet_kind?: string
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          category_name?: string | null
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          initial_balance?: number
          is_default?: boolean | null
          name?: string
          property_id?: string
          type?: string
          wallet_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_wallets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          additional_fees: number | null
          billing_period: string
          created_at: string | null
          due_date: string
          id: string
          invoice_number: string
          lease_id: string
          notes: string | null
          property_id: string
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal_rent: number
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          additional_fees?: number | null
          billing_period: string
          created_at?: string | null
          due_date: string
          id?: string
          invoice_number: string
          lease_id: string
          notes?: string | null
          property_id: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal_rent: number
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          additional_fees?: number | null
          billing_period?: string
          created_at?: string | null
          due_date?: string
          id?: string
          invoice_number?: string
          lease_id?: string
          notes?: string | null
          property_id?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal_rent?: number
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      leases: {
        Row: {
          billing_cycle_day: number
          created_at: string | null
          deposit_amount: number
          end_date: string | null
          id: string
          property_id: string
          rent_amount: number
          room_id: string
          start_date: string
          status: Database["public"]["Enums"]["lease_status"]
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          billing_cycle_day?: number
          created_at?: string | null
          deposit_amount?: number
          end_date?: string | null
          id?: string
          property_id: string
          rent_amount: number
          room_id: string
          start_date: string
          status?: Database["public"]["Enums"]["lease_status"]
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          billing_cycle_day?: number
          created_at?: string | null
          deposit_amount?: number
          end_date?: string | null
          id?: string
          property_id?: string
          rent_amount?: number
          room_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["lease_status"]
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods_config: {
        Row: {
          account_holder: string | null
          account_number: string | null
          bank_name: string
          created_at: string | null
          id: string
          instructions: string | null
          is_active: boolean | null
          property_id: string
          qris_image_url: string | null
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          bank_name: string
          created_at?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          property_id: string
          qris_image_url?: string | null
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          bank_name?: string
          created_at?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          property_id?: string
          qris_image_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_config_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_paid: number
          created_at: string | null
          id: string
          invoice_id: string
          notes: string | null
          paid_at: string | null
          payment_method: string
          proof_url: string | null
          verified_by: string | null
        }
        Insert: {
          amount_paid: number
          created_at?: string | null
          id?: string
          invoice_id: string
          notes?: string | null
          paid_at?: string | null
          payment_method: string
          proof_url?: string | null
          verified_by?: string | null
        }
        Update: {
          amount_paid?: number
          created_at?: string | null
          id?: string
          invoice_id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string
          proof_url?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          city: string | null
          created_at: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address: string
          city?: string | null
          created_at?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          city?: string | null
          created_at?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      room_complaints: {
        Row: {
          ai_extracted_summary: string | null
          ai_response_sent: string | null
          assigned_staff_name: string | null
          category: Database["public"]["Enums"]["complaint_category"]
          created_at: string | null
          id: string
          priority: Database["public"]["Enums"]["complaint_priority"]
          property_id: string
          raw_chat_message: string
          resolution_notes: string | null
          resolved_at: string | null
          room_id: string | null
          room_number: string
          source: string | null
          status: Database["public"]["Enums"]["complaint_status"]
          tenant_id: string | null
          tenant_name: string
          tenant_phone: string
          updated_at: string | null
        }
        Insert: {
          ai_extracted_summary?: string | null
          ai_response_sent?: string | null
          assigned_staff_name?: string | null
          category?: Database["public"]["Enums"]["complaint_category"]
          created_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["complaint_priority"]
          property_id: string
          raw_chat_message: string
          resolution_notes?: string | null
          resolved_at?: string | null
          room_id?: string | null
          room_number: string
          source?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          tenant_id?: string | null
          tenant_name: string
          tenant_phone: string
          updated_at?: string | null
        }
        Update: {
          ai_extracted_summary?: string | null
          ai_response_sent?: string | null
          assigned_staff_name?: string | null
          category?: Database["public"]["Enums"]["complaint_category"]
          created_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["complaint_priority"]
          property_id?: string
          raw_chat_message?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          room_id?: string | null
          room_number?: string
          source?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          tenant_id?: string | null
          tenant_name?: string
          tenant_phone?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_complaints_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_complaints_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_complaints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          base_price: number
          created_at: string | null
          facilities: string[] | null
          floor: number
          id: string
          notes: string | null
          property_id: string
          room_number: string
          room_type: string | null
          status: Database["public"]["Enums"]["room_status"]
          updated_at: string | null
        }
        Insert: {
          base_price?: number
          created_at?: string | null
          facilities?: string[] | null
          floor?: number
          id?: string
          notes?: string | null
          property_id: string
          room_number: string
          room_type?: string | null
          status?: Database["public"]["Enums"]["room_status"]
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          created_at?: string | null
          facilities?: string[] | null
          floor?: number
          id?: string
          notes?: string | null
          property_id?: string
          room_number?: string
          room_type?: string | null
          status?: Database["public"]["Enums"]["room_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          full_name: string
          id: string
          id_card_number: string | null
          id_card_url: string | null
          phone_number: string
          property_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          full_name: string
          id?: string
          id_card_number?: string | null
          id_card_url?: string | null
          phone_number: string
          property_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          full_name?: string
          id?: string
          id_card_number?: string | null
          id_card_url?: string | null
          phone_number?: string
          property_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          is_active: boolean | null
          phone_number: string | null
          property_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id: string
          is_active?: boolean | null
          phone_number?: string | null
          property_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone_number?: string | null
          property_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      complaint_category:
        | "ac_facility"
        | "plumbing"
        | "electricity"
        | "cleanliness"
        | "security"
        | "general"
      complaint_priority: "low" | "medium" | "high" | "urgent"
      complaint_status: "pending" | "in_progress" | "resolved"
      invoice_status: "unpaid" | "paid" | "overdue"
      lease_status: "active" | "completed" | "cancelled"
      room_status: "available" | "occupied" | "maintenance"
      token_payment_status:
        | "paid_cash"
        | "paid_transfer"
        | "invoiced"
        | "unpaid"
      user_role: "owner" | "admin" | "cleaning_staff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
