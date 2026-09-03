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
 * Jika customPermissions disediakan dari database profil, gunakan customPermissions tersebut.
 */
export function getPermissionsForRole(
  role: UserRole | string,
  customPermissions?: string[]
): string[] {
  if (customPermissions && Array.isArray(customPermissions) && customPermissions.length > 0) {
    return customPermissions;
  }

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
export function hasPermission(
  role: UserRole | string,
  permission: string,
  customPermissions?: string[]
): boolean {
  return getPermissionsForRole(role, customPermissions).includes(permission);
}
