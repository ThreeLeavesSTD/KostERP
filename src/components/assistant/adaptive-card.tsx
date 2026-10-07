"use client";

import React, { useState } from "react";
import {
  Building2,
  Receipt,
  Zap,
  TrendingUp,
  AlertCircle,
  Copy,
  Check,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  BedDouble,
  FileText,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";

export interface AdaptiveCardData {
  type?: "room" | "invoice" | "token" | "cashflow" | "complaint" | "generic";
  title?: string;
  subtitle?: string;
  badge?: {
    text: string;
    variant?: "lime" | "emerald" | "amber" | "rose" | "neutral";
  };
  highlight?: {
    label: string;
    value: string;
    color?: "lime" | "emerald" | "rose" | "neutral";
  };
  facts?: Array<{ label: string; value: string }>;
  tags?: string[];
  description?: string;
  actions?: Array<{
    title: string;
    style?: "lime" | "default" | "outline" | "ghost";
    icon?: string;
    targetTab?: string;
    copyText?: string;
  }>;
  rawItem?: any;
}

interface AdaptiveCardProps {
  card: AdaptiveCardData;
  onNavigateTab?: (tab: string) => void;
}

export function AdaptiveCard({ card, onNavigateTab }: AdaptiveCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    notify.success("Disalin", "Teks berhasil disalin ke clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  const getBadgeStyle = (variant?: string) => {
    switch (variant) {
      case "lime":
        return "border-lime-500/40 bg-[#D9FF43]/20 text-neutral-900 dark:text-[#D9FF43]";
      case "emerald":
        return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
      case "amber":
        return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400";
      case "rose":
        return "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400";
      default:
        return "border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300";
    }
  };

  const getHighlightStyle = (color?: string) => {
    switch (color) {
      case "lime":
        return "text-[#0A0A0A] dark:text-[#D9FF43]";
      case "emerald":
        return "text-emerald-600 dark:text-emerald-400";
      case "rose":
        return "text-rose-600 dark:text-rose-400";
      default:
        return "text-neutral-900 dark:text-white";
    }
  };

  const getCardIcon = () => {
    switch (card.type) {
      case "room":
        return <Building2 className="h-4 w-4" />;
      case "invoice":
        return <Receipt className="h-4 w-4" />;
      case "token":
        return <Zap className="h-4 w-4" />;
      case "cashflow":
        return <TrendingUp className="h-4 w-4" />;
      case "complaint":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  return (
    <div className="w-full rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-[#121215] p-4 shadow-sm hover:border-[#D9FF43]/80 hover:shadow-lime-glow transition-all duration-200 my-2">
      {/* 1. Header: Icon, Title, Subtitle, & Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0A0A0A] text-[#D9FF43] dark:bg-[#D9FF43] dark:text-[#0A0A0A] shadow-xs shrink-0">
            {getCardIcon()}
          </div>
          <div>
            <h4 className="text-sm font-black text-neutral-900 dark:text-white tracking-tight leading-tight">
              {card.title || "Detail Informasi"}
            </h4>
            {card.subtitle && (
              <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
                {card.subtitle}
              </p>
            )}
          </div>
        </div>

        {card.badge && (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border shrink-0 ${getBadgeStyle(
              card.badge.variant
            )}`}
          >
            {card.badge.text}
          </span>
        )}
      </div>

      {/* 2. Highlight Box (e.g. Price, Token Code, Total Amount) */}
      {card.highlight && (
        <div className="mt-3 rounded-xl bg-neutral-50 dark:bg-[#18181C] border border-neutral-200/70 dark:border-neutral-800/80 p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              {card.highlight.label}
            </span>
            <div className={`text-base sm:text-lg font-black tracking-tight ${getHighlightStyle(card.highlight.color)}`}>
              {card.highlight.value}
            </div>
          </div>

          {card.type === "token" && card.rawItem?.token_code && (
            <button
              onClick={() => handleCopy(card.rawItem.token_code)}
              className="flex items-center gap-1 text-xs font-bold text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-[#D9FF43] bg-white dark:bg-[#202025] px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 transition-colors shadow-xs"
              title="Salin Kode Token"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Tersalin" : "Salin"}</span>
            </button>
          )}
        </div>
      )}

      {/* 3. Facts Grid (Key-Value Pairs) */}
      {card.facts && card.facts.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          {card.facts.map((fact, idx) => (
            <div
              key={idx}
              className="rounded-lg bg-neutral-50/70 dark:bg-[#161619] p-2 border border-neutral-100 dark:border-neutral-800/60"
            >
              <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 block">
                {fact.label}
              </span>
              <span className="font-extrabold text-neutral-800 dark:text-neutral-200 text-xs">
                {fact.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 4. Tags / Facilities (Pills) */}
      {card.tags && card.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {card.tags.map((tag, idx) => (
            <span
              key={idx}
              className="rounded-md bg-neutral-100 dark:bg-[#1A1A1E] border border-neutral-200/80 dark:border-neutral-800 px-2 py-0.5 text-[10px] font-bold text-neutral-600 dark:text-neutral-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* 5. Description / Notes */}
      {card.description && (
        <p className="mt-2.5 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400 bg-neutral-50/50 dark:bg-[#151518] p-2 rounded-lg border border-neutral-100 dark:border-neutral-800/60">
          {card.description}
        </p>
      )}

      {/* 6. Action Buttons */}
      {card.actions && card.actions.length > 0 && (
        <div className="mt-3.5 pt-2.5 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-end gap-2">
          {card.actions.map((action, idx) => {
            if (action.copyText) {
              return (
                <button
                  key={idx}
                  onClick={() => handleCopy(action.copyText!)}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#1A1A1E] px-3 py-1.5 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{action.title}</span>
                </button>
              );
            }

            return (
              <Button
                key={idx}
                size="sm"
                variant={action.style === "lime" ? "lime" : "default"}
                onClick={() => {
                  if (action.targetTab && onNavigateTab) {
                    onNavigateTab(action.targetTab);
                  }
                }}
                className={`h-8 text-[11px] font-black gap-1 cursor-pointer ${
                  action.style === "lime" ? "shadow-lime-glow" : ""
                }`}
              >
                <span>{action.title}</span>
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Intelligent Markdown & Adaptive Card Parser
 * Parses incoming AI responses (either markdown or structured Adaptive Card) into rich interactive UI
 */
export function AdaptiveMessageContent({
  content,
  onNavigateTab,
}: {
  content: string;
  onNavigateTab?: (tab: string) => void;
}) {
  // 1. Try parsing JSON if response is a direct JSON string or codeblock
  const parsedCards = tryExtractJsonCards(content);
  if (parsedCards && parsedCards.cards.length > 0) {
    return (
      <div className="space-y-3">
        {parsedCards.introText && (
          <FormattedMarkdown text={parsedCards.introText} />
        )}
        <div className="space-y-2.5">
          {parsedCards.cards.map((card, idx) => (
            <AdaptiveCard key={idx} card={card} onNavigateTab={onNavigateTab} />
          ))}
        </div>
        {parsedCards.outroText && (
          <FormattedMarkdown text={parsedCards.outroText} />
        )}
      </div>
    );
  }

  // 2. Parse natural markdown from n8n into Adaptive Cards for detected entities (Rooms, Invoices, Tokens)
  const entityCards = tryParseMarkdownEntities(content);
  if (entityCards && entityCards.cards.length > 0) {
    return (
      <div className="space-y-3">
        {entityCards.introText && (
          <FormattedMarkdown text={entityCards.introText} />
        )}
        <div className="space-y-2.5">
          {entityCards.cards.map((card, idx) => (
            <AdaptiveCard key={idx} card={card} onNavigateTab={onNavigateTab} />
          ))}
        </div>
        {entityCards.outroText && (
          <FormattedMarkdown text={entityCards.outroText} />
        )}
      </div>
    );
  }

  // 3. Fallback: Clean formatted markdown
  return <FormattedMarkdown text={content} />;
}

/**
 * Helper to render formatted markdown with proper bold, lists, and typography
 */
export function FormattedMarkdown({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split("\n");

  return (
    <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed font-medium">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Bullet list item
        if (trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
          const bulletContent = trimmed.replace(/^[*•-]\s+/, "");
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0A0A0A] dark:bg-[#D9FF43] mt-2 shrink-0" />
              <div className="flex-1">
                <InlineMarkdownSpan text={bulletContent} />
              </div>
            </div>
          );
        }

        // Sub-bullet (indented list)
        if (line.startsWith("  * ") || line.startsWith("    * ") || line.startsWith("  - ")) {
          const bulletContent = line.replace(/^\s+[*•-]\s+/, "");
          return (
            <div key={idx} className="flex items-start gap-2 pl-6">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500 mt-2 shrink-0" />
              <div className="flex-1">
                <InlineMarkdownSpan text={bulletContent} />
              </div>
            </div>
          );
        }

        // Headers
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={idx} className="font-black text-sm text-neutral-900 dark:text-white pt-1">
              <InlineMarkdownSpan text={trimmed.replace(/^###\s+/, "")} />
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={idx} className="font-black text-base text-neutral-900 dark:text-white pt-1.5">
              <InlineMarkdownSpan text={trimmed.replace(/^##\s+/, "")} />
            </h3>
          );
        }

        // Regular paragraph
        return (
          <p key={idx}>
            <InlineMarkdownSpan text={line} />
          </p>
        );
      })}
    </div>
  );
}

/**
 * Parses bold (**text**), italic (*text*), and inline code (`code`) into React elements
 */
function InlineMarkdownSpan({ text }: { text: string }) {
  // Regex to split by bold (**...**) or code (`...`)
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-black text-neutral-900 dark:text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={i}
              className="rounded-md bg-neutral-100 dark:bg-[#1C1C20] px-1.5 py-0.5 font-mono text-[11px] font-bold text-neutral-800 dark:text-[#D9FF43] border border-neutral-200/80 dark:border-neutral-700"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
          return (
            <em key={i} className="italic text-neutral-700 dark:text-neutral-300">
              {part.slice(1, -1)}
            </em>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

/**
 * Tries extracting Adaptive Cards from raw JSON blocks
 */
function tryExtractJsonCards(
  text: string
): { introText: string; cards: AdaptiveCardData[]; outroText: string } | null {
  try {
    let jsonStr = text.trim();
    // Strip markdown code fences if any
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/```$/, "").trim();
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```\s*/, "").replace(/```$/, "").trim();
    }

    if (!jsonStr.startsWith("{") && !jsonStr.startsWith("[")) {
      return null;
    }

    const parsed = JSON.parse(jsonStr);

    // Adaptive Card format
    if (parsed.type === "AdaptiveCard" || parsed.cards || Array.isArray(parsed)) {
      const cardList: AdaptiveCardData[] = [];
      const items = Array.isArray(parsed) ? parsed : parsed.cards || [parsed];

      for (const it of items) {
        if (it.type === "AdaptiveCard" || it.title || it.highlight) {
          cardList.push({
            type: it.cardType || "generic",
            title: it.title,
            subtitle: it.subtitle,
            badge: it.badge,
            highlight: it.highlight,
            facts: it.facts,
            tags: it.tags,
            description: it.description || it.text,
            actions: it.actions,
            rawItem: it,
          });
        }
      }

      if (cardList.length > 0) {
        return { introText: "", cards: cardList, outroText: "" };
      }
    }
  } catch {
    // Not raw JSON
  }

  return null;
}

/**
 * Parses markdown text containing Room, Invoice, or Token listings into Adaptive Cards
 */
function tryParseMarkdownEntities(
  text: string
): { introText: string; cards: AdaptiveCardData[]; outroText: string } | null {
  // Check if text contains room pattern, e.g. "Kamar 202" or "* Kamar 202" or "**Kamar 202**"
  const roomPattern = /(?:^|\n)[ \t]*[*•-][ \t]*(?:\*\*)?Kamar\s+([A-Za-z0-9-]+)(?:\*\*)?(?:[^\n]*)/gi;
  const matches = [...text.matchAll(roomPattern)];

  if (matches.length > 0) {
    const cards: AdaptiveCardData[] = [];
    const firstMatchIndex = matches[0].index || 0;
    const introText = text.substring(0, firstMatchIndex).trim();

    // Split text into chunks around the matches
    for (let i = 0; i < matches.length; i++) {
      const curMatch = matches[i];
      const nextMatch = matches[i + 1];
      const startIndex = curMatch.index || 0;
      const endIndex = nextMatch ? (nextMatch.index || text.length) : text.length;
      const block = text.substring(startIndex, endIndex);

      const roomNum = curMatch[1];
      
      // Extract Type
      const typeMatch = block.match(/(?:Tipe|Type)[*_\s]*:[*_\s]*([^\n*,)]+)/i);
      const roomType = typeMatch ? typeMatch[1].trim().replace(/[*_]/g, "") : "Standard";

      // Extract Floor
      const floorMatch =
        block.match(/(?:Lantai|Floor)[*_\s]*:[*_\s]*([^\n*,)]+)/i) ||
        curMatch[0].match(/Lantai\s*([0-9]+)/i);
      const floor = floorMatch ? (floorMatch[1] || floorMatch[0]).trim().replace(/[*_]/g, "") : undefined;

      // Extract Price
      const priceMatch = block.match(/(?:Harga|Tarif|Biaya|Price)[*_\s]*:[*_\s]*([^\n*,]+)/i);
      const price = priceMatch ? priceMatch[1].trim().replace(/[*_]/g, "") : undefined;

      // Extract Facilities
      const facMatch = block.match(/(?:Fasilitas|Catatan|Notes)[*_\s]*:[*_\s]*([^\n*]+)/i);
      const facRaw = facMatch ? facMatch[1].trim() : "";
      const tags = facRaw
        ? facRaw
            .split(/[,;•]/)
            .map((s) => s.trim().replace(/[*_]/g, ""))
            .filter((s) => s.length > 1 && s.length < 35)
        : [];

      // Extract Description / Catatan
      const notesMatch = block.match(/(?:Catatan|Deskripsi)[*_\s]*:[*_\s]*([^\n]+)/i);
      const notes = notesMatch ? notesMatch[1].trim().replace(/[*_]/g, "") : undefined;

      const facts: Array<{ label: string; value: string }> = [];
      if (floor) facts.push({ label: "Lantai", value: `Lantai ${floor}` });
      if (roomType) facts.push({ label: "Kategori Tipe", value: roomType });

      cards.push({
        type: "room",
        title: `Kamar ${roomNum}`,
        subtitle: `Tipe ${roomType}${floor ? ` · Lantai ${floor}` : ""}`,
        badge: {
          text: "Tersedia",
          variant: "emerald",
        },
        highlight: price
          ? {
              label: "Tarif Sewa",
              value: price.toLowerCase().includes("rp") ? price : `Rp ${price}`,
              color: "lime",
            }
          : undefined,
        facts,
        tags: tags.length > 0 ? tags : ["Siap Huni", "Kamar Mandi Dalam"],
        description: notes,
        actions: [
          {
            title: "Check-in Kamar ↗",
            style: "lime",
            targetTab: "rooms",
          },
        ],
        rawItem: { room_number: roomNum, room_type: roomType, price },
      });
    }

    // Outro text after last room block if it doesn't belong to room details
    const lastMatch = matches[matches.length - 1];
    const lastIndex = (lastMatch.index || 0) + lastMatch[0].length;
    const remainingText = text.substring(lastIndex);
    
    // Check if remaining text has a trailing outro paragraph (e.g. "Ada lagi yang bisa saya bantu?")
    let outroText = "";
    const outroMatch = remainingText.match(/\n\n([^\n*•][\s\S]*)$/);
    if (outroMatch) {
      outroText = outroMatch[1].trim();
    }

    return { introText, cards, outroText };
  }

  // Check for Invoice pattern (Tagihan Sewa, Invoice #, etc.)
  const invoicePattern = /(?:Tagihan|Invoice)\s*(?:No\.?|Kamar)?\s*([A-Za-z0-9-#]+)/i;
  if (invoicePattern.test(text) && (text.includes("Jatuh tempo") || text.includes("Rp") || text.includes("Belum dibayar"))) {
    const invMatch = text.match(invoicePattern);
    const amountMatch = text.match(/(?:Rp\.?|Sebesar)\s*([\d.,]+)/i);
    const tenantMatch = text.match(/(?:Kak|Sdr|a\.n|penghuni)\s*([A-Za-z\s]+)/i);
    const roomMatch = text.match(/Kamar\s*([A-Za-z0-9]+)/i);
    const dueMatch = text.match(/Jatuh\s*tempo\s*[:\s]*([^\n*,)]+)/i);

    if (amountMatch) {
      const tenant = tenantMatch ? tenantMatch[1].trim() : "Penghuni Kost";
      const room = roomMatch ? roomMatch[1].trim() : undefined;
      const amount = amountMatch[1].trim();
      const due = dueMatch ? dueMatch[1].trim().replace(/[*_]/g, "") : "Bulan Ini";

      const card: AdaptiveCardData = {
        type: "invoice",
        title: room ? `Tagihan Sewa Kamar ${room}` : "Tagihan Sewa Kost",
        subtitle: `${tenant}${room ? ` (Kamar ${room})` : ""}`,
        badge: {
          text: "Belum Lunas",
          variant: "rose",
        },
        highlight: {
          label: "Total Tagihan",
          value: amount.toLowerCase().includes("rp") ? amount : `Rp ${amount}`,
          color: "rose",
        },
        facts: [
          { label: "Penyewa", value: tenant },
          { label: "Jatuh Tempo", value: due },
        ],
        actions: [
          {
            title: "Salin Pesan WA",
            style: "default",
            copyText: `Halo Kak ${tenant}, pengingat tagihan sewa kost sebesar Rp ${amount} telah terbit. Mohon konfirmasi pembayaran ya. Terima kasih!`,
          },
          {
            title: "Buka Menu Billing ↗",
            style: "lime",
            targetTab: "billing",
          },
        ],
      };

      return { introText: "", cards: [card], outroText: "" };
    }
  }

  // Check for Token PLN pattern (20 digit code)
  const tokenCodeMatch = text.match(/\b(\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4})\b/);
  if (tokenCodeMatch) {
    const tokenRaw = tokenCodeMatch[1].replace(/[-\s]/g, "");
    const formattedToken = `${tokenRaw.slice(0, 4)} ${tokenRaw.slice(4, 8)} ${tokenRaw.slice(
      8,
      12
    )} ${tokenRaw.slice(12, 16)} ${tokenRaw.slice(16, 20)}`;

    const kwhMatch = text.match(/([\d.,]+)\s*kWh/i);
    const nominalMatch = text.match(/Rp\s*([\d.,]+)/i);

    const card: AdaptiveCardData = {
      type: "token",
      title: "Token Listrik PLN",
      subtitle: "20 Digit Kode Pengisian Meteran",
      badge: {
        text: "Siap Digunakan",
        variant: "lime",
      },
      highlight: {
        label: "20 Digit Kode Token",
        value: formattedToken,
        color: "lime",
      },
      facts: [
        { label: "Daya / Unit", value: kwhMatch ? `${kwhMatch[1]} kWh` : "PLN Prabayar" },
        { label: "Nominal", value: nominalMatch ? `Rp ${nominalMatch[1]}` : "Token Kost" },
      ],
      description: "Ketik 20 digit kode di atas pada keypad meteran kamar Anda, lalu tekan tombol ENTER.",
      actions: [
        {
          title: "Salin Kode Token",
          style: "default",
          copyText: formattedToken,
        },
        {
          title: "Distribusi Token ↗",
          style: "lime",
          targetTab: "electricity",
        },
      ],
      rawItem: { token_code: formattedToken },
    };

    return { introText: "", cards: [card], outroText: "" };
  }

  return null;
}
