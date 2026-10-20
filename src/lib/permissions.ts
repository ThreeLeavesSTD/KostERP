import { UserRole } from "@/types";
import { FINANCE_ROUTES } from "@/types/finance";

export function financeLanding(role: UserRole | string, permissions?: string[]) {
  return FINANCE_ROUTES.find(id => hasPermission(role, id, permissions));
}

export const ALL_PERMISSIONS = [
  "owner-dashboard",
  "ai-assistant",
  "cashflow",
  "finance",
  "expenses",
  "pnl",
  "unit-ekonomi",
  "budget",
  "reports",
  "staff-management",
  "rooms",
  "room-types",
  "tenants",
  "electricity",
  "billing",
  "owner-audit",
  "property-settings",
  "profile",
  "leads",
];

/**
 * Mendapatkan daftar hak akses tab/modul berdasarkan role user
 * Jika customPermissions disediakan dari database profil, gunakan customPermissions tersebut.
 */
export function getPermissionsForRole(
  role: UserRole | string,
  customPermissions?: string[]
): string[] {
  // 1. Role 'owner' adalah pemilik utama dan selalu memiliki hak akses penuh ke seluruh fitur sistem
  if (role === "owner") {
    return [...ALL_PERMISSIONS];
  }

  // 2. Jika ada customPermissions (misal dari database profile / role staff)
  if (customPermissions && Array.isArray(customPermissions) && customPermissions.length > 0) {
    const perms = new Set(customPermissions);
    // Sub-modul kamar: jika user memiliki akses 'rooms', maka otomatis berhak akses 'room-types'
    if (perms.has("rooms")) {
      perms.add("room-types");
    }
    return Array.from(perms);
  }

  switch (role) {
    case "admin":
      return ALL_PERMISSIONS.filter(
        (perm) => !["owner-audit", "staff-management", "property-settings"].includes(perm)
      );
    case "cleaning_staff":
      return ["rooms", "room-types", "profile"];
    default:
      return ["rooms", "room-types", "profile"];
  }
}

/**
 * Memeriksa apakah role memiliki hak akses ke permission/tab tertentu
 */
export function hasPermission(
  role: UserRole | string,
  permission: string,
  customPermissions?: string[]
): boolean {
  return getPermissionsForRole(role, customPermissions).includes(permission);
}
