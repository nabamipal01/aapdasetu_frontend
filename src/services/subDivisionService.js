import { get, post } from "./api";

export const listSubdivisions = (params = {}) =>
  get("/api/subdivisions/list.php", params);

export const createSubdivision = (params = {}) =>
  post("/api/subdivisions/create.php", params);