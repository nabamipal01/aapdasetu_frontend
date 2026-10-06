import axios from "axios";
import { del, get } from "./api";

// const API_BASE_URL =
//   "http://192.168.0.5/AapdaSetu/backend/api/post_alert";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return {
    Authorization: `Bearer ${token}`,
  };
};

const PostAlertService = {
  getPostAlerts: async (page = 1, limit = 10) => {
    return get("/api/post_alert/list.php", { page, limit });
  },

  getPostAlertById: async (id) => {
    return get("/api/post_alert/get.php", { id });
  },

  createPostAlert: async (formData) => {
    const response = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL}/api/post_alert/create.php`,
      formData,
      {
        headers: getAuthHeaders(),
      }
    );

    return response.data;
  },

  deletePostAlert: async (id) => {
    return del(`/api/post_alert/delete.php?id=${encodeURIComponent(id)}`);
  },
};

export default PostAlertService;