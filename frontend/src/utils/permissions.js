// frontend/src/utils/permissions.js

// ----- Load current user from storage -----
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * hasPermission("edit_parts")
 * - admin → always true (superuser)
 * - other roles → check user.permissions array
 */
export function hasPermission(permissionName) {
  const user = getCurrentUser();
  if (!user) return false;

  // super admin bypass
  if (user.role && user.role.toLowerCase() === "admin") {
    return true;
  }

  // ensure permissions array exists
  const perms = Array.isArray(user.permissions) ? user.permissions : [];

  return perms.includes(permissionName);
}
