import { get, post, patch, del } from "./api";
 
/**
 * Incident Report Service
 * Endpoints: /api/incident-reports/
 *
 * Status        : "pending" | "verified" | "rejected" | "duplicate"
 * Review action : "linked_existing" | "created_new" | "marked_duplicate" | "rejected"
 * Severity      : "low" | "medium" | "high" | "critical"
 */
 
/**
 * Create a new incident report (volunteer / ngo_contact_person).
 * @param {{
 *   title: string,
 *   incident_type: string,
 *   description?: string,
 *   severity?: string,
 *   latitude?: number,
 *   longitude?: number,
 *   district_id?: number
 * }} reportData
 */
export const createIncidentReport = (reportData) =>
    post("/api/incident-reports/create.php", reportData);
 
/**
 * Get a single incident report by ID.
 * @param {number|string} id
 */
export const getIncidentReport = (id) =>
    get("/api/incident-reports/get.php", { id });
 
/**
 * List incident reports with optional filters.
 * @param {{
 *   status?: string,
 *   severity?: string,
 *   incident_type?: string,
 *   district_id?: number,
 *   reported_by?: number,
 *   page?: number,
 *   per_page?: number
 * }} params
 */
export const listIncidentReports = (params = {}) =>
    get("/api/incident-reports/list.php", params);
 
/**
 * Update / review an incident report by ID.
 * Used both for:
 *  - volunteer/ngo editing a pending report
 *  - admin review (status, review_action, incident_id, etc.)
 *
 * @param {number|string} id
 * @param {object} reportData
 */
export const updateIncidentReport = (id, reportData) =>
    patch(`/api/incident-reports/update.php?id=${id}`, reportData);
 
/**
 * Delete an incident report by ID (optional – only if your backend supports it).
 * @param {number|string} id
 */
export const deleteIncidentReport = (id) =>
    del(`/api/incident-reports/delete.php?id=${id}`);
 
/**
 * Admin review of an incident report.
 * POST /api/incident_reports/review.php
 *
 * Body shapes:
 *  linked_existing  → { report_id, action, incident_id, remarks? }
 *  created_new      → { report_id, action, remarks? }
 *  marked_duplicate → { report_id, action, duplicate_of_report_id, remarks? }
 *  rejected         → { report_id, action, remarks? }
 */
export const reviewIncidentReport = (data) =>
    post("/api/incident-reports/review.php", data);