const API_BASE_URL =
  "http://192.168.0.8/AapdaSetu/backend/api/training";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

// ========================================
// CREATE
// POST /create.php
// ========================================

export const createTraining = async (trainingData) => {
  const response = await fetch(
    `${API_BASE_URL}/create.php`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(trainingData),
    }
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || "Failed to create training"
    );
  }

  return data;
};

// ========================================
// LIST
// GET /list.php
// ========================================

export const getTrainings = async (
  page = 1,
  limit = 10,
  search = ""
) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search.trim()) {
    params.append(
      "search",
      search.trim()
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/list.php?${params.toString()}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || "Failed to fetch trainings"
    );
  }

  return data;
};

// ========================================
// GET BY ID
// GET /get.php?id=1
// ========================================

export const getTrainingById = async (id) => {
  const response = await fetch(
    `${API_BASE_URL}/get.php?id=${id}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || "Failed to fetch training"
    );
  }

  return data;
};

// ========================================
// UPDATE
// PATCH /update.php?id=1
// ========================================

export const updateTraining = async (
  id,
  trainingData
) => {
  const response = await fetch(
    `${API_BASE_URL}/update.php?id=${id}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(trainingData),
    }
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || "Failed to update training"
    );
  }

  return data;
};

// ========================================
// DELETE
// DELETE /delete.php?id=1
// ========================================

export const deleteTraining = async (id) => {
  const response = await fetch(
    `${API_BASE_URL}/delete.php?id=${id}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || "Failed to delete training"
    );
  }

  return data;
};