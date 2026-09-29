import { get } from "./api";

/**
 * Activity Log Service
 * Endpoint: /api/activity_logs/list.php
 *
 * Provides a read-only audit trail of actions performed in the system.
 */

/**
 * List activity logs with optional filters.
 * @param {{
 *   user_id?: number,
 *   action?: string,
 *   entity?: string,
 *   entity_id?: number,
 *   from_date?: string,
 *   to_date?: string,
 *   page?: number,
 *   per_page?: number
 * }} params
 */
export const listActivityLogs = (params = {}) =>
  get("/api/activity/list.php", params);
