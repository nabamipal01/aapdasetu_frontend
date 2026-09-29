import { post } from "./api";

/**
 * Auth Service
 * Endpoints: /api/auth/login.php, /api/auth/register.php, /api/auth/logout.php
 */

/**
 * Login a user.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ token: string, user: object }>}
 */
export const login = (email, password) =>
  post("/api/auth/login.php", { email, password });

/**
 * Register a new user. (Super Admin only)
 * @param {{ name, email, phone, password, role, region_id }} userData
 */
export const register = (userData) =>
  post("/api/auth/register.php", userData);

/**
 * Logout the currently authenticated user.
 * Token is read automatically by the api.js fetch wrapper.
 */
export const logout = () =>
  post("/api/auth/logout.php", {});
