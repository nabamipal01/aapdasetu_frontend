import { get, post } from "./api";

export const listBlocks = (params = {}) =>
  get("/api/blocks/list.php", params);

export const createBlock = (params = {}) =>
  post("/api/blocks/create.php", params);