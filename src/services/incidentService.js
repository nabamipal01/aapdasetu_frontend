import { get, post, patch, del } from "./api";

/**
 * Incident Service
 * Endpoints: /api/incidents/
 *
 * Incident types : "flood" | "fire" | "accident" | "earthquake" | …
 * Severity       : "low" | "medium" | "high" | "critical"
 * Status         : "reported" | "acknowledged" | "in_progress" | "resolved" | "closed"
 */

/**
 * Create a new incident.
 * @param {{
 *   title: string,
 *   incident_type: string,
 *   description?: string,
 *   severity?: string,
 *   region_id?: number,
 *   latitude?: number,
 *   longitude?: number,
 *   reported_at?: string
 * }} incidentData
 */
export const createIncident = (incidentData) =>
  post("/api/incidents/create.php", incidentData);

/**
 * Get a single incident by ID (includes tasks & resources summary).
 * @param {number|string} id
 */
export const getIncident = (id) =>
  get("/api/incidents/get.php", { id });

/**
 * List incidents with optional filters.
 * @param {{
 *   severity?: string,
 *   status?: string,
 *   incident_type?: string,
 *   region_id?: number,
 *   page?: number,
 *   per_page?: number
 * }} params
 */
export const listIncidents = (params = {}) =>
  get("/api/incidents/list.php", params);

/**
 * Update an incident by ID.
 * @param {number|string} id
 * @param {Partial<import('./incidentService').IncidentData>} incidentData
 */
export const updateIncident = (id, incidentData) =>
  patch(`/api/incidents/update.php?id=${id}`, incidentData);

/**
 * Delete an incident by ID.
 * @param {number|string} id
 */
export const deleteIncident = (id) =>
  del(`/api/incidents/delete.php?id=${id}`);
