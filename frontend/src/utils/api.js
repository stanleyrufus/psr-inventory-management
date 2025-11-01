// frontend/src/utils/api.js
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// 🔐 Auth token interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* --------------------------
   🧩 PARTS API
--------------------------- */
export const fetchParts = async () => {
  const res = await apiClient.get("/api/parts");
  if (Array.isArray(res.data)) return res.data;
  if (res.data && Array.isArray(res.data.data)) return res.data.data;
  return [];
};

export const createPart = async (data) => {
  const res = await apiClient.post("/api/parts", data);
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

/* --------------------------
   🧩 PRODUCTS API
--------------------------- */
export const fetchProducts = async () => {
  const res = await apiClient.get("/api/products");
  if (Array.isArray(res.data)) return { success: true, data: res.data };
  if (res.data?.data) return res.data;
  return { success: false, data: [] };
};

export const createProduct = async (data) => {
  try {
    const res = await apiClient.post("/api/products", data);
    return res.data;
  } catch (err) {
    if (err.response?.status === 409) {
      return { success: false, field: "product_code", message: "Product code already exists" };
    }
    throw err;
  }
};

export const updateProduct = async (id, data) => {
  const res = await apiClient.put(`/api/products/${id}`, data);
  return res.data;
};

export const deleteProduct = async (id) => {
  const res = await apiClient.delete(`/api/products/${id}`);
  return res.data;
};

/* --------------------------
   🧩 PURCHASE ORDERS API
--------------------------- */
export const fetchPurchaseOrders = async () => {
  const res = await apiClient.get("/api/purchase_orders");
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.data)) return res.data.data;
  return [];
};

export const fetchPurchaseOrderById = async (id) => {
  const res = await apiClient.get(`/api/purchase_orders/${id}`);
  return res.data;
};

export const createPurchaseOrder = async (data) => {
  const res = await apiClient.post("/api/purchase_orders", data);
  return res.data;
};

export const updatePurchaseOrder = async (id, data) => {
  const res = await apiClient.put(`/api/purchase_orders/${id}`, data);
  return res.data;
};

export const updatePurchaseOrderStatus = async (id, status) => {
  const res = await apiClient.post(`/api/purchase_orders/${id}/status`, { status });
  return res.data;
};

export const uploadPurchaseOrderFiles = async (id, files) => {
  const formData = new FormData();
  for (const file of files) formData.append("files", file);
  const res = await apiClient.post(`/api/purchase_orders/${id}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

/* --------------------------
   🧩 VENDORS API
--------------------------- */
export const fetchVendors = async () => {
  const res = await apiClient.get("/api/vendors");
  if (Array.isArray(res.data)) return res.data;
  if (res.data && Array.isArray(res.data.data)) return res.data.data;
  return [];
};

export const createVendor = async (data) => {
  const res = await apiClient.post("/api/vendors", data);
  return res.data;
};

export const updateVendor = async (id, data) => {
  const res = await apiClient.put(`/api/vendors/${id}`, data);
  return res.data;
};

export const deleteVendor = async (id) => {
  const res = await apiClient.delete(`/api/vendors/${id}`);
  return res.data;
};

export const bulkUploadVendors = async (vendorsArray) => {
  const res = await apiClient.post("/api/vendors/bulk-upload", { vendors: vendorsArray });
  return res.data;
};

export default {
  fetchParts,
  createPart,
  updatePart,
  deletePart,
  bulkUploadParts,
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  fetchPurchaseOrders,
  fetchPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
  uploadPurchaseOrderFiles,
  fetchVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  bulkUploadVendors,
};
