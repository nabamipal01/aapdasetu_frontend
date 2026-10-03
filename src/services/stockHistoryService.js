import { get } from "./api";

export const listStockHistory = (params = {}) =>
	get("/api/inventory/history/list.php", params);

export const getStockHistory = (id) =>
	get("/api/inventory/history/get.php", { id });

export const getInventoryHistory = (inventoryId) =>
	get("/api/inventory/history/inventory.php", {
		inventory_id: inventoryId,
	});
