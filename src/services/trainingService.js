import { get, post, patch, del } from "./api";

const BASE = "/api/training";

// ─── Create ───────────────────────────────────────────────────────────────────

export const createTraining = (trainingData) =>
  post(`${BASE}/create.php`, trainingData);

// ─── List ─────────────────────────────────────────────────────────────────────

export const getTrainings = (page = 1, limit = 10, search = "") =>
  get(`${BASE}/list.php`, {
    page,
    limit,
    ...(search.trim() ? { search: search.trim() } : {}),
  });

// ─── Get by ID ────────────────────────────────────────────────────────────────

export const getTrainingById = (id) =>
  get(`${BASE}/get.php`, { id });

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateTraining = (id, trainingData) =>
  patch(`${BASE}/update.php?id=${encodeURIComponent(id)}`, trainingData);

// ─── Delete ───────────────────────────────────────────────────────────────────

export const deleteTraining = (id) =>
  del(`${BASE}/delete.php?id=${encodeURIComponent(id)}`);
