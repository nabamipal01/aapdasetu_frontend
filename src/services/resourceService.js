import { get, post, patch, del } from "./api";

/**
 * Resource Service
 * Endpoints: /api/resources/
 */

/**
 * Create / allocate a resource to an incident.
 * @param {{
 *   incident_id: number,
 *   resource_type: string,
 *   name: string,
 *   quantity?: number,
 *   unit?: string,
 *   region_id?: number,
 *   notes?: string
 * }} resourceData
 */
export const createResource = (resourceData) =>
  post("/api/resources/create.php", resourceData);

/**
 * Get a single resource by ID.
 * @param {number|string} id
 */
export const getResource = (id) =>
  get("/api/resources/get.php", { id });

/**
 * List resources with optional filters.
 * @param {{
 *   incident_id?: number,
 *   resource_type?: string,
 *   region_id?: number,
 *   page?: number,
 *   per_page?: number
 * }} params
 */
export const listResources = (params = {}) =>
  get("/api/resources/list.php", params);

/**
 * Update a resource by ID.
 * @param {number|string} id
 * @param {object} resourceData
 */
export const updateResource = (id, resourceData) =>
  patch(`/api/resources/update.php?id=${id}`, resourceData);

/**
 * Delete a resource by ID.
 * @param {number|string} id
 */
export const deleteResource = (id) =>
  del(`/api/resources/delete.php?id=${id}`);
