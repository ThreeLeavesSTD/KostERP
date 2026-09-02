import { UserRole } from "@/types";

export const ALL_PERMISSIONS = [
  "owner-dashboard",
  "ai-assistant",
  "cashflow",
  "staff-management",
  "rooms",
  "tenants",
  "electricity",
  "billing",
  "owner-audit",
  "billing-settings",
  "profile",
];

/**
 * Mendapatkan daftar hak akses tab/modul berdasarkan role user
 * - owner: semua tab
 * - admin: semua kecuali owner-audit, staff-management, billing-settings
 * - cleaning_staff: rooms + profile saja
 */
export function getPermissionsForRole(role: UserRole | string): string[] {
  switch (role) {
    case "owner":
      return [...ALL_PERMISSIONS];
    case "admin":
      return ALL_PERMISSIONS.filter(
        (perm) => !["owner-audit", "staff-management", "billing-settings"].includes(perm)
      );
    case "cleaning_staff":
      return ["rooms", "profile"];
    default:
      return ["rooms", "profile"];
  }
}

/**
 * Memeriksa apakah role memiliki hak akses ke permission/tab tertentu
 */
export function hasPermission(role: UserRole | string, permission: string): boolean {
  return getPermissionsForRole(role).includes(permission);
}
