// frontend/src/utils/api.js
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// fetchParts returns array (or empty array) regardless of backend wrapping
export const fetchParts = async () => {
  const res = await apiClient.get("/api/parts");
  // backend may return: []  OR { success:1, data: [...] } OR { data: [...] }
  if (Array.isArray(res.data)) return res.data;
  if (res.data && Array.isArray(res.data.data)) return res.data.data;
  return [];
};

export const createPart = async (data) => {
  const res = await apiClient.post("/api/parts", data);
  // backend may return { success:1, data: newItem } or inserted item directly
  return res.data;
};

export const updatePart = async (id, data) => {
  const res = await apiClient.put(`/api/parts/${id}`, data);
  return res.data;
};

export const deletePart = async (id) => {
  const res = await apiClient.delete(`/api/parts/${id}`);
  return res.data;
};

export const bulkUploadParts = async (partsArray) => {
  const res = await apiClient.post("/api/parts/bulk-upload", { parts: partsArray });
  return res.data;
};

export default {
  fetchParts,
  createPart,
  updatePart,
  deletePart,
  bulkUploadParts,
};
