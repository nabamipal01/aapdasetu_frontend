import { get } from "./api";

const BASE = "/api/reports";

/**
 * MIS Report Service
 * All endpoints are GET — no body required.
 * Every response wraps data in: { success, message, data: { meta, summary, ... } }
 */

// ─── Executive Summary ────────────────────────────────────────────────────────
// data: { meta, incidents, tasks, inventory, agencies, alerts, activity }
export const getReportSummary    = (params = {}) => get(`${BASE}/summary.php`,   params);

// ─── Incidents Report ─────────────────────────────────────────────────────────
// data: { meta, summary, trend[], incidents[], pagination }
export const getReportIncidents  = (params = {}) => get(`${BASE}/incidents.php`, params);

// ─── Tasks Report ─────────────────────────────────────────────────────────────
// data: { meta, summary, trend[], tasks[], pagination }
export const getReportTasks      = (params = {}) => get(`${BASE}/tasks.php`,     params);

// ─── Inventory Report ─────────────────────────────────────────────────────────
// data: { meta, summary, by_equipment[], items[], pagination }
export const getReportInventory  = (params = {}) => get(`${BASE}/inventory.php`, params);

// ─── Agencies / NGO Report ───────────────────────────────────────────────────
// data: { meta, summary, trend[], agencies[], pagination }
export const getReportAgencies   = (params = {}) => get(`${BASE}/agencies.php`,  params);

// ─── Activity Log Report ──────────────────────────────────────────────────────
// data: { meta, summary, trend[], logs[], pagination }
export const getReportActivity   = (params = {}) => get(`${BASE}/activity.php`,  params);

// ─── Alerts Report ───────────────────────────────────────────────────────────
// data: { meta, summary, trend[], pre_alerts[], post_alerts[], pagination }
export const getReportAlerts     = (params = {}) => get(`${BASE}/alerts.php`,    params);
