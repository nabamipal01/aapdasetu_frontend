import { get, post, patch, del } from "./api";

/**
 * Stock Issue Service
 * Endpoints: /api/inventory/issues/
 *
 * A "stock issue" records the transfer of inventory items to a district user
 * for deployment in the field.
 *
 * Create body:
 *   district_user_id  — user ID of the district official receiving the stock
 *   storage_location  — destination location string
 *   remarks           — optional notes about the issue
 *   items             — array of { inventory_id, quantity }
 */

/**
 * Issue stock to a district user.
 * @param {{
 *   district_user_id: number,
 *   storage_location: string,
 *   remarks?: string,
 *   items: Array<{ inventory_id: number, quantity: number }>
 * }} issueData
 */
export const createStockIssue = (issueData) =>
  post("/api/inventory/issues/create.php", issueData);

/**
 * List all stock issues.
 * @param {{ page?: number, limit?: number }} params
 */
export const listStockIssues = (params = {}) =>
  get("/api/inventory/issues/list.php", params);

/**
 * Get a single stock issue by ID.
 * @param {number|string} id
 */
export const getStockIssue = (id) =>
  get("/api/inventory/issues/get.php", { id });

/**
 * Update a stock issue (e.g. change storage_location or remarks).
 * @param {number|string} id
 * @param {{ storage_location?: string, remarks?: string }} data
 */
export const updateStockIssue = (id, data) =>
  patch(`/api/inventory/issues/update.php?id=${id}`, data);

/**
 * Delete a stock issue by ID.
 * @param {number|string} id
 */
export const deleteStockIssue = (id) =>
  del(`/api/inventory/issues/delete.php?id=${id}`);
