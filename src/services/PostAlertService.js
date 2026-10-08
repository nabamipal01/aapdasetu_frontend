import { del, get, postFormData } from "./api";

export const getPostAlerts = (page = 1, limit = 10) =>
  get("/api/post_alert/list.php", { page, limit });

export const getPostAlertById = (id) =>
  get("/api/post_alert/get.php", { id });

export const createPostAlert = (formData) =>
  postFormData("/api/post_alert/create.php", formData);

export const deletePostAlert = (id) =>
  del(`/api/post_alert/delete.php?id=${encodeURIComponent(id)}`);
