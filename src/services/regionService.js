import { get, post, patch, del } from "./api";

/**
 * Region Service
 * Endpoints: /api/regions/
 *
 * Region types: "district" | "subdivision" | "block"
 */

/**
 * Create a new region.
 * @param {{ name: string, type: "district"|"subdivision"|"block", parent_id?: number|null }} regionData
 */
export const createRegion = (regionData) =>
  post("/api/regions/create.php", regionData);

/**
 * Get a single region by ID (includes parent + children).
 * @param {number|string} id
 */
export const getRegion = (id) =>
  get("/api/regions/get.php", { id });

/**
 * List regions with optional filters.
 * @param {{ type?: "district"|"subdivision"|"block", parent_id?: number, page?: number, per_page?: number }} params
 */
export const listRegions = (params = {}) =>
  get("/api/regions/list.php", params);

/**
 * Update a region by ID.
 * @param {number|string} id
 * @param {{ name?: string, type?: string, status?: string }} regionData
 */
export const updateRegion = (id, regionData) =>
  patch(`/api/regions/update.php?id=${id}`, regionData);

/**
 * Delete (deactivate) a region by ID.
 * @param {number|string} id
 */
export const deleteRegion = (id) =>
  del(`/api/regions/delete.php?id=${id}`);

// ─── Typed helpers ────────────────────────────────────────────────────────────

/** List all districts */
export const listDistricts = (params = {}) =>
  listRegions({ ...params, type: "district" });

/** List all subdivisions, optionally under a specific district */
export const listSubdivisions = (params = {}) =>
  listRegions({ ...params, type: "subdivision" });

/** List all blocks, optionally under a specific subdivision via parent_id */
export const listBlocks = (params = {}) =>
  listRegions({ ...params, type: "block" });
