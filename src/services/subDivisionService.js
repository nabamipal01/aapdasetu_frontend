import { get, post, patch, del } from "./api";

export const listSubdivisions = (params = {}) =>
  get("/api/subdivisions/list.php", params);

export const createSubdivision = (params = {}) =>
  post("/api/subdivisions/create.php", params);

export const getSubdivision = (params = {}) =>
  get("/api/subdivisions/get.php", params);

export const updateSubdivision = (id, data = {}) =>
  patch(`/api/subdivisions/update.php?id=${encodeURIComponent(id)}`, data);

export const deleteSubdivision = (id) =>
  del(`/api/subdivisions/delete.php?id=${encodeURIComponent(id)}`);