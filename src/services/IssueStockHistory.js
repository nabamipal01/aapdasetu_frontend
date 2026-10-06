import { get } from "./api";

export const getIssueStockHistory = () =>
  get("/api/inventory/history/list.php");

export const getIssueStockEquipmentTypes = () =>
  get("/api/equipment/list.php");