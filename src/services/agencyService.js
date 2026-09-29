import { get, post, patch, del } from "./api";

/**
 * Agency Service
 * Endpoints: /api/agencies/
 *
 * Agencies are external NGO / partner organisations.
 * Workflow: admin creates → status "pending_approval" → super_admin approves/rejects
 *           → if approved, admin issues credentials via credentials.php
 */

/**
 * Create a new agency.
 * @param {{
 *   name: string,
 *   type?: string,
 *   contact_person?: string,
 *   phone?: string,
 *   email?: string,
 *   address?: string
 * }} agencyData
 */
export const createAgency = (agencyData) =>
  post("/api/agencies/create.php", agencyData);

/**
 * Get a single agency by ID.
 * @param {number|string} id
 */
export const getAgency = (id) =>
  get("/api/agencies/get.php", { id });

/**
 * List agencies with optional filters.
 * @param {{
 *   status?: "pending_approval"|"active"|"inactive",
 *   type?: string,
 *   page?: number,
 *   per_page?: number
 * }} params
 */
export const listAgencies = (params = {}) =>
  get("/api/agencies/list.php", params);

/**
 * Update an agency by ID.
 * @param {number|string} id
 * @param {{ name?, type?, contact_person?, phone?, email?, address? }} agencyData
 */
export const updateAgency = (id, agencyData) =>
  patch(`/api/agencies/update.php?id=${id}`, agencyData);

/**
 * Delete (deactivate) an agency by ID.
 * @param {number|string} id
 */
export const deleteAgency = (id) =>
  del(`/api/agencies/delete.php?id=${id}`);

/**
 * Approve an agency (super_admin only).
 * Sets status to "active".
 * @param {number|string} id
 */
export const approveAgency = (id) =>
  post(`/api/agencies/approve.php?id=${id}`, { action: "approve" });

/**
 * Reject an agency (super_admin only).
 * Sets status to "inactive".
 * @param {number|string} id
 * @param {string} rejectionNote  — reason for rejection
 */
export const rejectAgency = (id, rejectionNote = "") =>
  post(`/api/agencies/approve.php?id=${id}`, {
    action: "reject",
    rejection_note: rejectionNote,
  });

/**
 * Issue login credentials to the agency's contact person.
 * Creates a user account with role "ngo_contact".
 * @param {number|string} id
 * @param {{ email: string, password: string }} credentials
 */
export const generateAgencyCredentials = (id, credentials) =>
  post(`/api/agencies/credentials.php?id=${id}`, credentials);
