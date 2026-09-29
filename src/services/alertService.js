import { get, post, patch, del } from "./api";

/**
 * Alert Service
 * Endpoints: /api/alert/
 *
 * Alerts are broadcast notices issued by admins to all operational
 * users about an impending or ongoing emergency situation.
 *
 * Alert fields:
 *   title       — short alert headline, e.g. "Flood"
 *   description — detailed alert body
 *   instruction — action instructions for field teams
 */

/**
 * Create a new alert.
 * @param {{
 *   title: string,
 *   description: string,
 *   instruction?: string
 * }} alertData
 */
export const createAlert = (alertData) =>
  post("/api/alert/create.php", alertData);

/**
 * Update an alert by ID.
 * @param {number|string} id
 * @param {{ title?: string, description?: string, instruction?: string }} alertData
 */
export const updateAlert = (id, alertData) =>
  patch(`/api/alert/update.php?id=${id}`, alertData);

/**
 * Get a single alert by ID.
 * @param {number|string} id
 */
export const getAlert = (id) =>
  get("/api/alert/get.php", { id });

/**
 * List all active alerts.
 * @param {{ page?: number, per_page?: number }} params
 */
export const listAlerts = (params = {}) =>
  get("/api/alert/list.php", params);

/**
 * Delete (soft-delete) an alert by ID.
 * @param {number|string} id
 */
export const deleteAlert = (id) =>
  del(`/api/alert/delete.php?id=${id}`);
