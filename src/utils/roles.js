
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

export const getUserRole = (user) => {
    if (!user || user.role == null) return null;

    const role = String(user.role).trim().toLowerCase();
    return STAFF_ROLES.includes(role) ? role : null;
};

export const getUserType = (user) => {
    if (!user) return null;

    const rawUserType = user.user_type ?? user.role;
    if (rawUserType == null) return null;

    const userType = String(rawUserType).trim().toLowerCase();
    return OPERATIONAL_USER_TYPES[userType] ?? userType;
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