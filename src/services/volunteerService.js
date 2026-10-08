import { get, post, postFormData, patch, del } from "./api";

export const createVolunteer = (volunteerData) =>
  postFormData("/api/volunteers/create.php", volunteerData);

export const getVolunteer = (id) =>
  get("/api/volunteers/get.php", { id });

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

export const rejectVolunteer = (id, rejectionNote = "") =>
  post(`/api/volunteers/approve.php?id=${id}`, {
    action: "reject",
    rejection_note: rejectionNote,
  });

export const generateVolunteerCredentials = (id, credentials) =>
  post(`/api/volunteers/credentials.php?id=${id}`, credentials);