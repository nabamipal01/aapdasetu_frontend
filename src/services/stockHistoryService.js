import { get } from "./api";

/**
 * Stock History Service
 * Endpoints: /api/inventory/history/
 *
 * Read-only audit trail of all stock movements (adds, issues, adjustments).
 */

/**
 * List all stock history entries.
 * @param {{ page?: number, limit?: number }} params
 */
export const listStockHistory = (params = {}) =>
  get("/api/inventory/history/list.php", params);

/**
 * Get a single stock history entry by ID.
 * @param {number|string} id
 */
export const getStockHistory = (id) =>
  get("/api/inventory/history/get.php", { id });

/**
 * Get all history entries for a specific inventory item.
 * @param {number|string} inventoryId
 */
export const getInventoryHistory = (inventoryId) =>
  get("/api/inventory/history/inventory.php", { inventory_id: inventoryId });
