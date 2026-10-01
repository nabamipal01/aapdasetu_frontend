import { get, post, patch, del } from "./api";

export const listDistricts = (params = {}) =>
  get("/api/districts/list.php", params);

export const createDistrict = (params = {}) =>
  post("/api/districts/create.php", params);

export const getDistrict = (params = {}) =>
  get("/api/districts/get.php", params);

export const updateDistrict = (id, data = {}) =>
  patch(`/api/districts/update.php?id=${encodeURIComponent(id)}`, data);

export const deleteDistrict = (id) =>
  del(`/api/districts/delete.php?id=${encodeURIComponent(id)}`);