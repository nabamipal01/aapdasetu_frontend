import { get, post, patch, del } from "./api";

/**
 * Equipment Service
 * Endpoints: /api/equipment/
 *
 * Equipment types are master categories used to classify inventory items.
 * Each inventory item links to one equipment type via equipment_id.
 *
 * Response shape:
 *   { equipment_id, equipment_type, added_by, created_at, updated_at, deleted_at }
 *
 * list() returns data as a plain array (no pagination wrapper).
 */

/**
 * Create a new equipment type.
 * @param {{ equipment_type: string }} data
 */
export const createEquipmentType = (data) =>
  post("/api/equipment/create.php", data);

/**
 * Get a single equipment type by ID.
 * @param {number|string} id
 */
export const getEquipmentType = (id) =>
  get("/api/equipment/get.php", { id });

/**
 * List all equipment types.
 * Returns: { success, message, data: EquipmentType[] }  (data is a plain array)
 */
export const listEquipmentTypes = () =>
  get("/api/equipment/list.php");

/**
 * Update an equipment type name by ID.
 * @param {number|string} id
 * @param {{ equipment_type: string }} data
 */
export const updateEquipmentType = (id, data) =>
  patch(`/api/equipment/update.php?id=${id}`, data);

/**
 * Soft-delete an equipment type by ID.
 * @param {number|string} id
 */
export const deleteEquipmentType = (id) =>
  del(`/api/equipment/delete.php?id=${id}`);
