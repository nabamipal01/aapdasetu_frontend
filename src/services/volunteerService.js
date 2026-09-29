import { get, post, patch, del } from "./api";

/**
 * Volunteer Service
 * Endpoints: /api/volunteers/
 *
 * Workflow: admin creates → status "pending_approval" → super_admin approves/rejects
 *           → if approved, admin issues credentials via credentials.php
 *
 * Status values: "pending_approval" | "active" | "deployed" | "inactive"
 */

/**
 * Register / create a volunteer record.
 * @param {{
 *   name: string,
 *   phone: string,
 *   email?: string,
 *   aadhaar_no?: string,
 *   skills?: string,
 *   address?: string
 * }} volunteerData
 */
export const createVolunteer = (volunteerData) =>
  post("/api/volunteers/create.php", volunteerData);

/**
 * Get a single volunteer by ID.
 * @param {number|string} id
 */
export const getVolunteer = (id) =>
  get("/api/volunteers/get.php", { id });

/**
 * List volunteers with optional filters.
 * @param {{
 *   status?: "pending_approval"|"active"|"deployed"|"inactive",
 *   page?: number,
 *   per_page?: number
 * }} params
 */
export const listVolunteers = (params = {}) =>
  get("/api/volunteers/list.php", params);

/**
 * Update a volunteer by ID.
 * @param {number|string} id
 * @param {{
 *   name?, phone?, email?, aadhaar_no?,
 *   skills?, address?, region_id?, status?
 * }} volunteerData
 */
export const updateVolunteer = (id, volunteerData) =>
  patch(`/api/volunteers/update.php?id=${id}`, volunteerData);

/**
 * Delete (deactivate) a volunteer by ID.
 * @param {number|string} id
 */
export const deleteVolunteer = (id) =>
  del(`/api/volunteers/delete.php?id=${id}`);

/**
 * Approve a volunteer (super_admin only).
 * Sets status to "active".
 * @param {number|string} id
 */
export const approveVolunteer = (id) =>
  post(`/api/volunteers/approve.php?id=${id}`, { action: "approve" });

/**
 * Reject a volunteer (super_admin only).
 * Sets status to "inactive".
 * @param {number|string} id
 * @param {string} rejectionNote  — reason for rejection
 */
export const rejectVolunteer = (id, rejectionNote = "") =>
  post(`/api/volunteers/approve.php?id=${id}`, {
    action: "reject",
    rejection_note: rejectionNote,
  });

/**
 * Issue login credentials to a volunteer.
 * Creates a user account with role "volunteer".
 * @param {number|string} id
 * @param {{ email: string, password: string }} credentials
 */
export const generateVolunteerCredentials = (id, credentials) =>
  post(`/api/volunteers/credentials.php?id=${id}`, credentials);
