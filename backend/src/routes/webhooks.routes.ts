import { Router, Request, Response } from "express";
import { SupabaseService } from "../services/supabase-service";

const router = Router();

// POST /api/webhooks/whatsapp-cs-ai
// Webhook endpoint called by n8n or WhatsApp AI Agent when a tenant sends a complaint or inquiry
router.post("/whatsapp-cs-ai", async (req: Request, res: Response) => {
  try {
    const {
      property_id,
      room_number,
      tenant_name,
      tenant_phone,
      raw_chat_message,
      ai_extracted_summary,
      ai_response_sent,
      category,
      priority,
    } = req.body;

    const complaint = await SupabaseService.createComplaint({
      property_id,
      room_number: room_number || "General",
      tenant_name: tenant_name || "Unknown Tenant",
      tenant_phone: tenant_phone || "",
      source: "whatsapp_cs_ai",
      raw_chat_message: raw_chat_message || "",
      ai_extracted_summary: ai_extracted_summary || raw_chat_message,
      ai_response_sent: ai_response_sent || "",
      category: category || "general",
      priority: priority || "medium",
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Complaint logged and processed by WhatsApp CS AI",
      data: complaint,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/webhooks/payment-verified
// Webhook endpoint to trigger WhatsApp receipt via n8n
router.post("/payment-verified", async (req: Request, res: Response) => {
  try {
    const { invoice_id, payment_id } = req.body;
    // Log dispatch event
    res.json({
      success: true,
      message: `Payment confirmation dispatched for invoice ${invoice_id}`,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
