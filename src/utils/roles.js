
const STAFF_ROLES = [
    "super_admin",
    "admin",
    "district",
    "subdivision",
    "block",
];

const OPERATIONAL_USER_TYPES = {
    volunteers: "volunteers",
    volunteer: "volunteers",
    ngo: "ngo_contact_person",
    ngo_contact: "ngo_contact_person",
    ngo_contact_person: "ngo_contact_person",
};

const normalizeRoleValue = (value) =>
    String(value)
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .trim()
        .replace(/[\s-]+/g, "_")
        .toLowerCase();

export const getUserRole = (user) => {
    if (!user || user.role == null) return null;

    const role = normalizeRoleValue(user.role);
    return STAFF_ROLES.includes(role) ? role : null;
};

export const getUserType = (user) => {
    if (!user) return null;

    const rawUserType = user.user_type ?? user.role;
    if (rawUserType == null) return null;

    const userType = normalizeRoleValue(rawUserType);
    return OPERATIONAL_USER_TYPES[userType] ?? userType;
};

export const canManageAlerts = (user) => {
    if (!user) return false;

    const identityValues = [user.role, user.user_role, user.user_type]
        .filter((value) => value != null)
        .map(normalizeRoleValue);

    const readOnlyRoles = new Set([
        "district",
        "district_user",
        "subdivision",
        "subdivision_user",
        "block",
        "block_user",
        "volunteer",
        "volunteers",
        "volunteer_user",
        "ngo",
        "ngo_user",
        "ngo_contact",
        "ngo_contact_person",
    ]);

    if (identityValues.some((identity) => readOnlyRoles.has(identity))) {
        return false;
    }

    return [user.role, user.user_role]
        .filter((value) => value != null)
        .map(normalizeRoleValue)
        .some((role) => role === "admin" || role === "super_admin");
};

export const hasFullAccess = (user) => {
    return STAFF_ROLES.includes(getUserRole(user));
};

export const isOperationalUser = (user) => {
    return Object.values(OPERATIONAL_USER_TYPES).includes(getUserType(user));
};

export const isVolunteer = (user) => {
    return getUserType(user) === "volunteers";
};

export const isNgoContact = (user) => {
    return getUserType(user) === "ngo_contact_person";
};

export const isTaskOnlyRole = () => {
    // Retained for compatibility with existing imports.
    // Operational users need access to more than the Task page.
    return false;
};

//Alert page

export const canViewAlerts = (user) => {
    if (!user) return false;

    const identities = [user.role, user.user_role, user.user_type]
        .filter((value) => value != null)
        .map(normalizeRoleValue);

    const allowedRoles = new Set([
        "super_admin",
        "admin",
        "district",
        "district_user",
        "subdivision",
        "subdivision_user",
        "block",
        "block_user",
        "volunteer",
        "volunteers",
        "volunteer_user",
        "ngo",
        "ngo_user",
        "ngo_contact",
        "ngo_contact_person",
    ]);

    return identities.some((identity) => allowedRoles.has(identity))
        || isOperationalUser(user);
};

// incident page
export const canViewIncidents = (user) => {
    return canViewAlerts(user);
};

export const canManageIncidents = (user) => {
    return canManageAlerts(user);
};

