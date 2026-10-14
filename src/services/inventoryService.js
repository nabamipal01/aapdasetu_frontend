import { get, post, patch, del } from "./api";

/**
 * Inventory Service
 * Endpoints: /api/inventory/
 *
 * An inventory item tracks a physical piece of rescue/response equipment
 * stored at a location, linked to an equipment type via equipment_id.
 *
 * Item fields:
 *   equipment_id   — FK to equipment type
 *   product_name   — e.g. "FWR Helmet"
 *   brand_name     — e.g. "Viking"
 *   oem            — original equipment manufacturer
 *   location       — physical storage location string
 *   quantity       — integer count
 *   purchase_date  — "YYYY-MM-DD"
 *   expiry_date    — "YYYY-MM-DD" | null
 *   image          — URL string | null
 */

/**
 * Add a new inventory item.
 * @param {{
 *   equipment_id: number,
 *   product_name: string,
 *   brand_name?: string,
 *   oem?: string,
 *   location?: string,
 *   quantity: number,
 *   purchase_date?: string,
 *   expiry_date?: string,
 *   image?: string
 * }} itemData
 */
export const createInventoryItem = (itemData) =>
  post("/api/inventory/create.php", itemData);

/**
 * Get a single inventory item by inventory_id.
 * @param {number|string} inventoryId
 */
export const getInventoryItem = (inventoryId) =>
  get("/api/inventory/get.php", { inventory_id: inventoryId });

/**
 * List inventory items with optional filters.
 * @param {{
 *   equipment_id?: number,
 *   location?: string,
 *   page?: number,
 *   limit?: number
 * }} params
 */
export const listInventoryItems = (params = {}) =>
  get("/api/inventory/list.php", params);

/**
 * Get the inventory overview summary:
 * total products, total quantity, equipment types breakdown, expired items.
 */
export const getInventoryOverview = () =>
  get("/api/inventory/overview.php");

/**
 * Update an inventory item by ID.
 * @param {number|string} id
 * @param {{
 *   equipment_id?: number,
 *   product_name?: string,
 *   brand_name?: string,
 *   oem?: string,
 *   location?: string,
 *   quantity?: number,
 *   purchase_date?: string,
 *   expiry_date?: string,
 *   image?: string
 * }} itemData
 */
export const updateInventoryItem = (id, itemData) =>
  patch(`/api/inventory/update.php?id=${id}`, itemData);

/**
 * Soft-delete an inventory item by ID.
 * @param {number|string} id
 */
export const deleteInventoryItem = (id) =>
  del(`/api/inventory/delete.php?id=${id}`);

/**

* Get district-wise inventory data for the dashboard chart.
* Endpoint: /api/inventory/chart.php
  */
  export const getInventoryChartData = () =>
  get("/api/inventory/chart.php");