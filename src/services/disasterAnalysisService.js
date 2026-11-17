/**
 * Disaster Analysis Service
 *
 * Rewritten to use the project's existing api.js helpers instead of axios,
 * so no extra dependency is needed and auth headers are handled automatically.
 */

import { get, post, postFormData, del } from "./api";
import API_BASE_URL from "../config/Config";

const BASE = "/disaster-analysis";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract a user-readable error message from any thrown error.
 * Handles both axios-style and fetch-style error shapes.
 */
export const getApiError = (error) => {
  const detail = error?.response?.data?.detail ?? error?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((x) => x.msg || "Invalid request").join(", ");
  return error?.message || "Request failed.";
};

// ─── Endpoints ───────────────────────────────────────────────────────────────

/** List all assessments, with optional query params. */
export const getAssessments = (params = {}) =>
  get(BASE, params);

/** Get a single assessment by ID. */
export const getAssessment = (id) =>
  get(`${BASE}/${encodeURIComponent(id)}`);

/** Get images attached to an assessment. */
export const getAssessmentImages = (id) =>
  get(`${BASE}/${encodeURIComponent(id)}/images`);

/**
 * Resolve the view URL for an assessment image.
 * Returns an object-URL blob string for same-origin images,
 * or the raw URL for cross-origin ones.
 */
export const getAssessmentImageUrl = async (image) => {
  const source =
    image?.view_url ?? image?.view_endpoint ?? image?.url ?? null;
  if (!source) return null;
  if (/^(data|blob):/i.test(source)) return source;

  // Build a full URL relative to the API base
  const base = API_BASE_URL.replace(/\/$/, "");
  const fullUrl = /^https?:\/\//i.test(source)
    ? source
    : `${base}/${String(source).replace(/^\/+/, "")}`;

  // Fetch as blob so the image can be displayed regardless of CORS headers
  const token = localStorage.getItem("token");
  const response = await fetch(fullUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

/**
 * Create a new assessment.
 * Accepts a plain object — values are serialised into FormData automatically.
 */
export const createAssessment = (values = {}) => {
  const body = new FormData();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      body.append(key, value);
    }
  });
  return postFormData(BASE, body);
};

/** Re-run the AI analysis for an existing assessment. */
export const rerunAssessment = (id) =>
  post(`${BASE}/${encodeURIComponent(id)}/analyze`, {});

/** Delete an assessment by ID. */
export const deleteAssessment = (id) =>
  del(`${BASE}/${encodeURIComponent(id)}`);

/**
 * Download the PDF report for an assessment.
 * Returns a Blob directly so the caller can trigger a browser download.
 */
export const downloadReport = async (id) => {
  const token = localStorage.getItem("token");
  const url = `${API_BASE_URL.replace(/\/$/, "")}${BASE}/${encodeURIComponent(id)}/report`;
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error(`Failed to download report (${response.status})`);
  }
  return response.blob();
};
