import { NextResponse } from "next/server";

const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000/api";
const DEFAULT_N8N_WEBHOOK =
  process.env.N8N_WEBHOOK_CHATBOT ||
  process.env.NEXT_PUBLIC_N8N_WEBHOOK_CHATBOT ||
  "https://n8n.noud.web.id/webhook/kostChatbotz";

function extractReply(data: any): string {
  if (typeof data === "string") return data;
  if (!data || typeof data !== "object") return "";
  if (Array.isArray(data)) return extractReply(data[0]);

  // Direct string properties
  if (typeof data.output === "string") return data.output;
  if (typeof data.response === "string") return data.response;
  if (typeof data.reply === "string") return data.reply;
  if (typeof data.text === "string") return data.text;
  if (typeof data.message === "string") return data.message;
  if (typeof data.content === "string") return data.content;
  if (typeof data.result === "string") return data.result;
  if (typeof data.data === "string") return data.data;

  // Nested object properties
  if (data.response && typeof data.response === "object") return extractReply(data.response);
  if (data.output && typeof data.output === "object") return extractReply(data.output);
  if (data.data && typeof data.data === "object") return extractReply(data.data);

  return "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      message,
      context,
      session_id,
    } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "Pesan tidak boleh kosong" },
        { status: 400 }
      );
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length > 4000) {
      return NextResponse.json(
        { success: false, error: "Pesan terlalu panjang. Maksimal 4.000 karakter." },
        { status: 400 }
      );
    }
    const sessionId = session_id || "kost-concierge-web-session";

    // 1. Coba delegasikan ke Backend Express (/api/webhooks/chatbot) yang membaca backend/.env
    try {
      const backendController = new AbortController();
      const backendTimeoutId = setTimeout(() => backendController.abort(), 35000);
      const backendRes = await fetch(`${BACKEND_BASE}/webhooks/chatbot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmedMessage,
          context,
          session_id: sessionId,
        }),
        signal: backendController.signal,
      });
      clearTimeout(backendTimeoutId);

      if (backendRes.ok) {
        const backendData = await backendRes.json();
        return NextResponse.json(backendData);
      }
    } catch {
      // Backend Express offline atau sedang tidak berjalan -> fallback langsung ke webhook n8n dari env
    }

    // 2. Webhook endpoint diambil dari environment variable
    const targetUrl =
      process.env.N8N_WEBHOOK_CHATBOT ||
      process.env.NEXT_PUBLIC_N8N_WEBHOOK_CHATBOT ||
      DEFAULT_N8N_WEBHOOK;


    // Payload multi-kompatibel untuk berbagai node di n8n (Webhook, LangChain, Chat Trigger, AI Agent)
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

    // Controller with 30s timeout for LLM generation inside n8n
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let n8nRes: Response;
    try {
      n8nRes = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/plain, */*",
        },
        body: JSON.stringify(n8nPayload),
        signal: controller.signal,
      });
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId);
      const isAbort = fetchErr instanceof Error && fetchErr.name === "AbortError";
      return NextResponse.json(
        {
          success: false,
          error: isAbort
            ? "Permintaan ke webhook n8n timeout (lebih dari 30 detik)."
            : (fetchErr instanceof Error ? fetchErr.message : "Gagal terhubung ke host n8n"),
          targetUrl,
        },
        { status: 504 }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle n8n 404 inactive test mode or unactivated workflow
    if (n8nRes.status === 404) {
      const errText = await n8nRes.text();
      let isTestInactive = false;
      let hintMessage = "Workflow n8n belum aktif atau webhook URL tidak ditemukan.";

      if (errText.includes("not registered") || targetUrl.includes("webhook-test")) {
        isTestInactive = true;
        hintMessage =
          "Mode uji coba n8n (webhook-test) sedang menunggu eksekusi. Silakan klik tombol 'Execute workflow' di kanvas n8n.";
      }

      return NextResponse.json(
        {
          success: false,
          status: 404,
          isTestInactive,
          hint: hintMessage,
          targetUrl,
          rawError: errText,
        },
        { status: 200 }
      );
    }

    // Handle 500 or other errors (e.g. 'No item to return was found' inside n8n)
    if (!n8nRes.ok) {
      const errText = await n8nRes.text();
      let isNoItemFound = false;
      let detailedError = errText;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.message) detailedError = parsed.message;
        else if (parsed.errorMessage) detailedError = parsed.errorMessage;
        else if (parsed.error) detailedError = typeof parsed.error === "string" ? parsed.error : JSON.stringify(parsed.error);
      } catch {
        // Raw text
      }

      let hint = `Webhook n8n mengembalikan status ${n8nRes.status}: ${detailedError.slice(0, 300)}`;

      if (errText.includes("No item to return was found")) {
        isNoItemFound = true;
        hint =
          "Webhook n8n berhasil terpanggil, namun alur n8n belum mengembalikan data balasan. Pastikan node AI Agent atau 'Respond to Webhook' terhubung ke alur n8n Anda.";
      }

      return NextResponse.json(
        {
          success: false,
          status: n8nRes.status,
          isNoItemFound,
          hint,
          error: detailedError || hint,
          targetUrl,
          rawError: errText,
        },
        { status: 200 }
      );
    }

    // Parse successful response from n8n
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

      // If no reply extracted, stringify parsedJson
      if (!replyText) {
        if (typeof data === "object") {
          replyText = JSON.stringify(data, null, 2);
        } else {
          replyText = String(data);
        }
      }
    } else {
      replyText = await n8nRes.text();
    }

    return NextResponse.json({
      success: true,
      reply: replyText || "Pesan telah diterima oleh webhook n8n.",
      actionType,
      actionData,
      source: "n8n_webhook",
      targetUrl,
      raw: parsedJson,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal server";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url") || DEFAULT_N8N_WEBHOOK;

  try {
    const isTestUrl = targetUrl.includes("webhook-test");

    return NextResponse.json({
      success: true,
      configuredWebhook: targetUrl,
      isTestUrl,
      hint: isTestUrl
        ? "URL menggunakan mode uji coba (webhook-test). Di n8n canvas, klik 'Execute workflow' untuk menerima panggilan."
        : "URL menggunakan mode produksi (/webhook). Pastikan workflow n8n telah diaktifkan (Active = ON).",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
