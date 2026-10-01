import { get, post, patch, del } from "./api";

export const listBlocks = (params = {}) =>
  get("/api/blocks/list.php", params);

export const createBlock = (params = {}) =>
  post("/api/blocks/create.php", params);

export const getBlock = (params = {}) =>
  get("/api/blocks/get.php", params);

export const updateBlock = (id, data = {}) =>
  patch(`/api/blocks/update.php?id=${encodeURIComponent(id)}`, data);

export const deleteBlock = (id) =>
  del(`/api/blocks/delete.php?id=${encodeURIComponent(id)}`);