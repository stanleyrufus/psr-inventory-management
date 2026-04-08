// frontend/src/utils/api.js
import axios from "axios";

// ✅ For Ubuntu/prod/pre-prod use VITE_API_URL=/api
// ✅ For local dev you can still override via .env.local if needed
const BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

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
  const res = await apiClient.get("/parts");
  return Array.isArray(res.data) ? res.data : res.data.data || [];
};

export const createPart = async (data) => (await apiClient.post("/parts", data)).data;
export const updatePart = async (id, data) => (await apiClient.put(`/parts/${id}`, data)).data;
export const deletePart = async (id) => (await apiClient.delete(`/parts/${id}`)).data;
export const bulkUploadParts = async (partsArray) =>
  (await apiClient.post("/parts/bulk-upload", { parts: partsArray })).data;

/* --------------------------
   🧩 PRODUCTS API
--------------------------- */
export const fetchProducts = async () => {
  const res = await apiClient.get("/products");
  return res.data?.data ? res.data : { success: false, data: [] };
};

export const createProduct = async (data) => {
  try {
    return (await apiClient.post("/products", data)).data;
  } catch (err) {
    if (err.response?.status === 409)
      return { success: false, field: "product_code", message: "Product code already exists" };
    throw err;
  }
};

export const updateProduct = async (id, data) => (await apiClient.put(`/products/${id}`, data)).data;
export const deleteProduct = async (id) => (await apiClient.delete(`/products/${id}`)).data;

/* --------------------------
   🧩 PURCHASE ORDERS API
--------------------------- */
export const fetchPurchaseOrders = async () => {
  const res = await apiClient.get("/purchase_orders");
  return Array.isArray(res.data) ? res.data : res.data.data || [];
};

export const fetchPurchaseOrderById = async (id) =>
  (await apiClient.get(`/purchase_orders/${id}`)).data;

export const createPurchaseOrder = async (data) =>
  (await apiClient.post("/purchase_orders", data)).data;

export const updatePurchaseOrder = async (id, data) =>
  (await apiClient.put(`/purchase_orders/${id}`, data)).data;

export const updatePurchaseOrderStatus = async (id, status) =>
  (await apiClient.post(`/purchase_orders/${id}/status`, { status })).data;

export const uploadPurchaseOrderFiles = async (id, files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  return (
    await apiClient.post(`/purchase_orders/${id}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  ).data;
};

export const fetchPurchaseOrdersReport = async (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const res = await apiClient.get(`/purchase_orders_report${qs ? `?${qs}` : ""}`);
  return res.data?.data || [];
};


/* --------------------------
   🧩 VENDORS API
--------------------------- */
export const fetchVendors = async () => {
  const res = await apiClient.get("/vendors");
  return Array.isArray(res.data) ? res.data : res.data.data || [];
};

export const createVendor = async (data) => (await apiClient.post("/vendors", data)).data;
export const updateVendor = async (id, data) => (await apiClient.put(`/vendors/${id}`, data)).data;
export const deleteVendor = async (id) => (await apiClient.delete(`/vendors/${id}`)).data;
export const bulkUploadVendors = async (vendorsArray) =>
  (await apiClient.post("/vendors/bulk-upload", { vendors: vendorsArray })).data;

export const apiRaw = apiClient;
export default apiClient;

