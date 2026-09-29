const TASK_ONLY_ROLES = new Set([
  "volunteer",
  "ngo",
  "ngo_contact",
]);

/**
 * Normalize role values coming from the API/localStorage.
 *
 * Examples:
 * "Volunteer"    -> "volunteer"
 * " VOLUNTEER "  -> "volunteer"
 * "NGO Contact"  -> "ngo_contact"
 * "ngo-contact"  -> "ngo_contact"
 * "NGO_CONTACT"  -> "ngo_contact"
 */
export function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

/**
 * Get the normalized role from the logged-in user.
 */
export function getUserRole(user) {
  return normalizeRole(
    user?.role || user?.user_role || user?.userRole
  );
}

/**
 * Check whether the user should only have access
 * to Dashboard and Task.
 */
export function isTaskOnlyRole(user) {
  const role = getUserRole(user);

  return TASK_ONLY_ROLES.has(role);
}