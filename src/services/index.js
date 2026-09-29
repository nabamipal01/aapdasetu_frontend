/**
 * Services barrel — import everything from here:
 *
 *   import { login, logout } from "../services";
 *   import { listIncidents, createIncident } from "../services";
 *   import { listAlerts, createAlert } from "../services";
 *   import { getInventoryOverview, listInventoryItems } from "../services";
 *   import { listEquipmentTypes, createEquipmentType } from "../services";
 *   import { createStockIssue, listStockIssues } from "../services";
 *   import { listStockHistory, getInventoryHistory } from "../services";
 */

export * from "./authService";
export * from "./userService";
// export * from "./regionService";
export * from "./districtService";
export * from "./subDivisionService";
export * from "./authService";
export * from "./incidentService";
export * from "./taskService";
export * from "./resourceService";
export * from "./agencyService";
export * from "./volunteerService";
export * from "./activityLogService";
export * from "./inventoryService";
export * from "./alertService";
export * from "./equipmentService";
export * from "./stockIssueService";
export * from "./stockHistoryService";
