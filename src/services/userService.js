import { get, post, patch, del } from "./api";

/**
 * User Service
 * Endpoints: /api/users/
 */

/**
 * Create a new user.
 *
 * @param {{
 *   name: string,
 *   email: string,
 *   phone?: string,
 *   password: string,
 *   role: "super_admin"|"admin"|"district"|"subdivision"|"block",
 *   status?: string
 * }} userData
 */
export const createUser = (userData) =>
  post("/api/users/create.php", userData);

/**
 * Get a single user by ID.
 *
 * @param {number|string} id
 */
export const getUser = (id) =>
  get("/api/users/get.php", { id });

/**
 * List users.
 *
 * @param {{
 *   role?: "super_admin"|"admin"|"district"|"subdivision"|"block",
 *   status?: string,
 *   page?: number,
 *   per_page?: number
 * }} params
 */
export const listUsers = (params = {}) =>
  get("/api/users/list.php", params);

/**
 * Update a user by ID.
 *
 * @param {number|string} id
 * @param {{
 *   name?: string,
 *   email?: string,
 *   phone?: string,
 *   password?: string,
 *   role?: "super_admin"|"admin"|"district"|"subdivision"|"block",
 *   status?: string
 * }} userData
 */
export const updateUser = (id, userData) =>
  patch(`/api/users/update.php?id=${id}`, userData);

/**
 * Delete (deactivate) a user by ID.
 *
 * @param {number|string} id
 */
export const deleteUser = (id) =>
  del(`/api/users/delete.php?id=${id}`);

// ─── Typed helpers ────────────────────────────────────────────────────────────

/** List all super admins */
export const listSuperAdmins = (params = {}) =>
  listUsers({ ...params, role: "super_admin" });

/** List all admins */
export const listAdmins = (params = {}) =>
  listUsers({ ...params, role: "admin" });

/** List all district users */
export const listDistrictUsers = (params = {}) =>
  listUsers({ ...params, role: "district" });

/** List all subdivision users */
export const listSubdivisionUsers = (params = {}) =>
  listUsers({ ...params, role: "subdivision" });

/** List all block users */
export const listBlockUsers = (params = {}) =>
  listUsers({ ...params, role: "block" });
