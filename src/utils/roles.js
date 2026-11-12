
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
    if (!user) return null;

    const rawRole = user.role ?? user.user_role;

    if (rawRole == null) return null;

    const role = normalizeRoleValue(rawRole);

    const roleAliases = {
        superadmin: "super_admin",
        district_user: "district",
        subdivision_user: "subdivision",
        block_user: "block",
        admin_user: "admin",
    };

    const normalizedRole = roleAliases[role] ?? role;

    return STAFF_ROLES.includes(normalizedRole)
        ? normalizedRole
        : null;
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

export const canCreateAlerts = (user) => {
    if (!user) return false;

    const identities = [user.role, user.user_role, user.user_type]
        .filter((value) => value != null)
        .map(normalizeRoleValue);

    return canManageAlerts(user)
        || identities.some((identity) => identity === "district" || identity === "district_user");
};

export const getUserDistrictId = (user) =>
    user?.district_id ??
    user?.districtId ??
    user?.linked_id ??
    user?.linkedId ??
    user?.district?.id ??
    null;

export const getAlertDistrictId = (alert) =>
    alert?.district_id ??
    alert?.districtId ??
    alert?.district?.id ??
    null;

export const isAlertVisibleToUser = (alert, user) => {
    if (canManageAlerts(user)) return true;

    const alertDistrictId = getAlertDistrictId(alert);
    if (alertDistrictId == null || alertDistrictId === "") return true;

    const userDistrictId = getUserDistrictId(user);
    return userDistrictId != null
        && String(alertDistrictId) === String(userDistrictId);
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
