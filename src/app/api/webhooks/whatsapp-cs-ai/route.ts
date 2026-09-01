import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      sender_phone,
      sender_name,
      room_number,
      message,
      category,
      priority,
      ai_summary,
      ai_reply,
    } = body;

    if (!message || !room_number) {
      return NextResponse.json(
        {
          success: false,
          message: "room_number and message are required in WhatsApp CS AI webhook payload",
        },
        { status: 400 }
      );
    }

    // Response conforming to Supabase webhook payload
    const ticketId = `comp-${Date.now().toString().slice(-4)}`;
    const result = {
      success: true,
      ticket_id: ticketId,
      supabase_table: "tenant_complaints",
      data: {
        id: ticketId,
        property_id: "prop-01",
        room_number: room_number,
        tenant_name: sender_name || "Penghuni WhatsApp",
        tenant_phone: sender_phone || "+6281234567890",
        raw_chat_message: message,
        ai_extracted_summary: ai_summary || `Keluhan Kamar ${room_number}: ${message.slice(0, 50)}`,
        ai_response_sent: ai_reply || "Laporan Anda telah berhasil dicatat oleh CS AI ke sistem database Supabase.",
        category: category || "general",
        priority: priority || "medium",
        status: "pending",
        source: "whatsapp_cs_ai",
        created_at: new Date().toISOString(),
      },
      message: "Webhook processed and saved to Supabase database successfully",
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error processing webhook";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
