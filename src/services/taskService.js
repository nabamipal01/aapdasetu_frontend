import {
  get,
  post,
  postFormData,
  patch,
  patchFormData,
  del,
} from "./api";
import API_BASE_URL from "../config/Config";

/**
 * Task Service
 * Endpoints: /api/tasks/
 *
 * Create: POST /api/tasks/create.php
 * List:   GET  /api/tasks/list.php?page=&per_page=&assigned_to=&incident_id=
 * Get:    GET  /api/tasks/get.php?id=
 *
 * Status: "assigned" | "in_progress" | "completion_requested" | "completed" | "cancelled"
 */

/**
 * Create a new task linked to an incident.
 * Body: { incident_id, title, description?, task_type?, assigned_to, priority?, due_at? }
 * due_at format: "YYYY-MM-DD HH:MM:SS"
 * HTTP 201 on success
 */
export const createTask = (taskData) =>
  post("/api/tasks/create.php", taskData);

/**
 * Get a single task by ID.
 * GET /api/tasks/get.php?id=
 */
export const getTask = (id) =>
  get("/api/tasks/get.php", { id });

/**
 * List tasks with optional filters.
 * GET /api/tasks/list.php?page=1&per_page=10
 * Volunteer: add assigned_to=<userId>
 * Response data: { items: [...], pagination: { page, per_page, total, total_pages } }
 */
export const listTasks = (params = {}) => {
  const { limit, per_page, ...rest } = params;
  const pageSize = per_page ?? limit;

  return get("/api/tasks/list.php", {
    ...rest,
    ...(pageSize != null
      ? { per_page: pageSize, limit: pageSize }
      : {}),
  });
};

/**
 * Update a task by ID.
 */
export const updateTask = (id, taskData) =>
  patch(`/api/tasks/update.php?id=${id}`, taskData);

/**
 * Update a task with multipart form data, including completion media.
 */
export const updateTaskWithMedia = (id, formData) =>
  patchFormData(`/api/tasks/update.php?id=${encodeURIComponent(id)}`, formData);

/**
 * Submit a volunteer's completion report and optional evidence.
 */
export const submitCompletion = (taskId, report, files = []) => {
  const formData = new FormData();
  formData.append("task_id", taskId);
  formData.append("report", report);
  files.forEach((file) => formData.append("media[]", file));

  return postFormData("/api/tasks/submit-completion.php", formData);
};

/**
 * List completion submissions, optionally filtered by status or task.
 */
export const listCompletionSubmissions = (params = {}) =>
  get("/api/tasks/completion-list.php", params);

/**
 * Get a completion submission and its attached media metadata.
 */
export const getCompletionSubmission = (id) =>
  get("/api/tasks/completion-get.php", { id });

/**
 * Download one media file attached to a completion submission.
 */
export const getCompletionMedia = async (id) => {
  const storedToken = localStorage.getItem("token");
  const token =
    storedToken && storedToken !== "null" && storedToken !== "undefined"
      ? storedToken.trim()
      : "";
  const response = await fetch(
    `${API_BASE_URL}/api/tasks/completion-media.php?id=${encodeURIComponent(id)}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );

  if (!response.ok) {
    const body = await response.text();
    let message = body;
    try {
      message = JSON.parse(body)?.message || body;
    } catch {
      // Keep the response text when the server does not return JSON.
    }
    throw new Error(message || `Failed to download completion media (${response.status}).`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await response.json();
    throw new Error(data?.message || "The completion media could not be downloaded.");
  }
  return response.blob();
};

/**
 * Approve or reject a completion submission.
 */
export const reviewCompletion = (submissionId, action, rejectionReason) =>
  patch("/api/tasks/review-completion.php", {
    submission_id: submissionId,
    action,
    ...(rejectionReason ? { rejection_reason: rejectionReason } : {}),
  });

/**
 * Delete a task by ID.
 */
export const deleteTask = (id) =>
  del(`/api/tasks/delete.php?id=${encodeURIComponent(id)}`);
