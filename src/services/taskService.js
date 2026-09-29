import { get, post, patch } from "./api";

/**
 * Task Service
 * Endpoints: /api/tasks/
 *
 * Status: "pending" | "assigned" | "in_progress" | "completed" | "cancelled"
 */

/**
 * Create a new task linked to an incident.
 * @param {{
 *   incident_id: number,
 *   title: string,
 *   description?: string,
 *   task_type?: "sop"|"field"|"logistics"|"medical"|"other",
 *   assigned_to?: number,
 *   priority?: string,
 *   due_at?: string   — ISO datetime "YYYY-MM-DD HH:MM:SS"
 * }} taskData
 */
export const createTask = (taskData) =>
  post("/api/tasks/create.php", taskData);

/**
 * Get a single task by ID.
 * @param {number|string} id
 */
export const getTask = (id) =>
  get("/api/tasks/get.php", { id });

/**
 * List tasks with optional filters.
 * @param {{
 *   incident_id?: number,
 *   assigned_to?: number,
 *   status?: string,
 *   priority?: string,
 *   page?: number,
 *   per_page?: number
 * }} params
 */
export const listTasks = (params = {}) =>
  get("/api/tasks/list.php", params);

/**
 * Update a task by ID.
 * @param {number|string} id
 * @param {{ title?, description?, task_type?, assigned_to?, status?, priority?, due_at? }} taskData
 */
export const updateTask = (id, taskData) =>
  patch(`/api/tasks/update.php?id=${id}`, taskData);
