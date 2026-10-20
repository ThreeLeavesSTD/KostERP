import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { RoomStatus, InvoiceStatus, TokenPaymentStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format number into Indonesian Rupiah format (e.g. Rp 1.500.000)
 */
export function formatRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format a whole-rupiah input with Indonesian thousand separators (e.g. 1.000.000). */
export function formatRupiahInput(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount) || amount === 0) return "";
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(amount);
}

/** Parse a formatted Rupiah input while keeping only its numeric digits. */
export function parseRupiahInput(value: string): number {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

/**
 * Format Date string into Indonesian localized date (e.g. 26 Agu 2026)
 */
export function formatDateIndo(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return dateStr;
  }
}

/**
 * Format 20 digit PLN Token into standard dashed chunks (XXXX-XXXX-XXXX-XXXX-XXXX)
 */
export function formatTokenPLN(token: string | null | undefined): string {
  if (!token) return "";
  const cleaned = token.replace(/\D/g, "").slice(0, 20);
  const chunks = cleaned.match(/.{1,4}/g);
  return chunks ? chunks.join("-") : cleaned;
}

/**
 * Clean token string into 20 numeric characters only
 */
export function cleanTokenPLN(token: string): string {
  return token.replace(/\D/g, "").slice(0, 20);
}

/**
 * Normalize Indonesian phone numbers to standard E.164 (+628...)
 */
export function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "+62" + cleaned.slice(1);
  } else if (cleaned.startsWith("62")) {
    cleaned = "+" + cleaned;
  } else if (!cleaned.startsWith("+62") && cleaned.length > 5) {
    cleaned = "+62" + cleaned;
  }
  return cleaned;
}

/**
 * Room Status display config
 */
export function getRoomStatusInfo(status: RoomStatus) {
  switch (status) {
    case "available":
      return {
        label: "Tersedia",
        color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
        dotColor: "bg-emerald-500",
        badgeVariant: "success",
      };
    case "occupied":
      return {
        label: "Terisi",
        color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
        dotColor: "bg-blue-500",
        badgeVariant: "info",
      };
    case "maintenance":
      return {
        label: "Perbaikan",
        color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
        dotColor: "bg-amber-500",
        badgeVariant: "warning",
      };
    default:
      return {
        label: status,
        color: "bg-gray-100 text-gray-700 border-gray-200",
        dotColor: "bg-gray-400",
        badgeVariant: "default",
      };
  }
}

/**
 * Invoice Status display config
 */
export function getInvoiceStatusInfo(status: InvoiceStatus) {
  switch (status) {
    case "paid":
      return {
        label: "Lunas",
        color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
        dotColor: "bg-emerald-500",
      };
    case "unpaid":
      return {
        label: "Belum Bayar",
        color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
        dotColor: "bg-amber-500",
      };
    case "overdue":
      return {
        label: "Jatuh Tempo",
        color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300",
        dotColor: "bg-rose-500",
      };
    default:
      return {
        label: status,
        color: "bg-gray-100 text-gray-700 border-gray-200",
        dotColor: "bg-gray-400",
      };
  }
}

/**
 * Token Payment status display config
 */
export function getTokenPaymentStatusInfo(status: TokenPaymentStatus) {
  switch (status) {
    case "paid_cash":
      return { label: "Lunas (Tunai)", color: "bg-emerald-100 text-emerald-800" };
    case "paid_transfer":
      return { label: "Lunas (Transfer)", color: "bg-blue-100 text-blue-800" };
    case "invoiced":
      return { label: "Masuk Tagihan", color: "bg-purple-100 text-purple-800" };
    case "unpaid":
      return { label: "Belum Dibayar", color: "bg-amber-100 text-amber-800" };
    default:
      return { label: status, color: "bg-gray-100 text-gray-800" };
  }
}
