import { NextResponse } from "next/server";
import { sendWebhookToN8n } from "@/lib/n8n/webhook-client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { event, target_url, payload, formatted_message } = body;

    if (!target_url) {
      return NextResponse.json(
        { success: false, message: "Target Webhook URL is required" },
        { status: 400 }
      );
    }

    const result = await sendWebhookToN8n(target_url, {
      event,
      payload,
      formatted_message,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
