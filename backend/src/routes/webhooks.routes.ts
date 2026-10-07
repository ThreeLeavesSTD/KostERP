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

function extractReply(data: any): string {
  if (typeof data === "string") return data;
  if (!data || typeof data !== "object") return "";
  if (Array.isArray(data)) return extractReply(data[0]);

  if (typeof data.output === "string") return data.output;
  if (typeof data.response === "string") return data.response;
  if (typeof data.reply === "string") return data.reply;
  if (typeof data.text === "string") return data.text;
  if (typeof data.message === "string") return data.message;
  if (typeof data.content === "string") return data.content;
  if (typeof data.result === "string") return data.result;
  if (typeof data.data === "string") return data.data;

  if (data.response && typeof data.response === "object") return extractReply(data.response);
  if (data.output && typeof data.output === "object") return extractReply(data.output);
  if (data.data && typeof data.data === "object") return extractReply(data.data);

  return "";
}

// POST /api/webhooks/chatbot
// Dipanggil oleh frontend untuk berkomunikasi dengan n8n AI Agent menggunakan webhook yang dikonfigurasi di backend env
router.post("/chatbot", async (req: Request, res: Response) => {
  try {
    const { message, context, session_id } = req.body;
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ success: false, error: "Pesan tidak boleh kosong" });
    }

    const webhookUrl =
      process.env.N8N_WEBHOOK_CHATBOT ||
      "https://n8n.noud.web.id/webhook/kostChatbotz";

    const trimmedMessage = message.trim();
    const sessionId = session_id || "kost-concierge-web-session";

    const n8nPayload = {
      message: trimmedMessage,
      chatInput: trimmedMessage,
      input: trimmedMessage,
      query: trimmedMessage,
      prompt: trimmedMessage,
      text: trimmedMessage,
      action: "sendMessage",
      sessionId: sessionId,
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      sender: "user",
      body: {
        message: trimmedMessage,
        chatInput: trimmedMessage,
        input: trimmedMessage,
        query: trimmedMessage,
        text: trimmedMessage,
      },
      context: context || {},
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let n8nRes: globalThis.Response;
    try {
      n8nRes = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/plain, */*",
        },
        body: JSON.stringify(n8nPayload),
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      const isAbort = fetchErr?.name === "AbortError";
      return res.status(504).json({
        success: false,
        error: isAbort
          ? "Permintaan ke webhook n8n timeout (lebih dari 30 detik)."
          : (fetchErr?.message || "Gagal terhubung ke host n8n"),
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (n8nRes.status === 404) {
      const errText = await n8nRes.text();
      return res.status(200).json({
        success: false,
        status: 404,
        isTestInactive: true,
        hint: "Workflow n8n belum aktif atau webhook URL tidak ditemukan.",
        rawError: errText,
      });
    }

    if (!n8nRes.ok) {
      const errText = await n8nRes.text();
      return res.status(200).json({
        success: false,
        status: n8nRes.status,
        error: errText,
        hint: `Webhook n8n mengembalikan status ${n8nRes.status}`,
      });
    }

    const contentType = n8nRes.headers.get("content-type") || "";
    let replyText = "";
    let actionType: string | undefined;
    let actionData: unknown;
    let parsedJson: any = null;

    if (contentType.includes("application/json")) {
      parsedJson = await n8nRes.json();
      replyText = extractReply(parsedJson);

      const data = Array.isArray(parsedJson) ? parsedJson[0] : parsedJson;
      if (data && typeof data === "object") {
        if (data.actionType) actionType = data.actionType;
        if (data.actionData) actionData = data.actionData;
      }
      if (!replyText) {
        replyText = typeof data === "object" ? JSON.stringify(data, null, 2) : String(data);
      }
    } else {
      replyText = await n8nRes.text();
    }

    return res.json({
      success: true,
      reply: replyText || "Pesan telah diterima oleh webhook n8n.",
      actionType,
      actionData,
      source: "n8n_webhook",
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

