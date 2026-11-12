import { get, post, postFormData, patch, put, del } from "./api";

export const createVolunteer = (volunteerData) =>
  postFormData("/api/volunteers/create.php", volunteerData);

export const getVolunteer = (id) =>
  get("/api/volunteers/get.php", { id });

/**
 * List volunteers with optional status, credential, Aadhaar search, and
 * pagination filters.
 *
 * Status: pending_approval | approved | active | deployed | inactive
 */
export const listVolunteers = (params = {}) =>
  get("/api/volunteers/list.php", params);

export const updateVolunteer = (id, volunteerData) =>
  patch(`/api/volunteers/update.php?id=${id}`, volunteerData);

export const deleteVolunteer = (id) =>
  del(`/api/volunteers/delete.php?id=${id}`);

export const approveVolunteer = (id) =>
  post(`/api/volunteers/approve.php?id=${id}`, {
    action: "approve",
  });

export const generateVolunteerCredentials = (id, credentials, isReset = false) => {
  const endpoint = `/api/volunteers/credentials.php?id=${id}`;
  return isReset ? put(endpoint, credentials) : post(endpoint, credentials);
};