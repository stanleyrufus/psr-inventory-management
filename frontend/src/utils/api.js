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

// 🔒 Auto-handle invalid / expired auth tokens
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;

    const shouldLogout =
      status === 401 &&
      ["TOKEN_MISSING", "TOKEN_EXPIRED", "TOKEN_INVALID", "AUTH_FAILED"].includes(code);

    if (shouldLogout) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // avoid redirect loop if already on login
      if (!window.location.pathname.includes("/login")) {
window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

/* --------------------------
   🧩 PARTS API
--------------------------- */
export const fetchParts = async () => {
  const res = await apiClient.get("/parts");
  return Array.isArray(res.data) ? res.data : res.data.data || [];
};

export const createPart = async (data) => (await apiClient.post("/parts", data)).data;
export const updatePart = async (id, data) => (await apiClient.put(`/parts/${id}`, data)).data;
export const deletePart = async (id) => {
  return (await apiClient.delete(`/parts/${id}`)).data;
};
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
    if (err.response?.status === 409) {
      return {
        success: false,
        field: "product_code",
        message: "Product code already exists",
      };
    }
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

export const fetchVendorPartsLatestReport = async (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const res = await apiClient.get(
    `/purchase_orders_report/vendor-parts-latest${qs ? `?${qs}` : ""}`
  );
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

export const fetchVendorPurchaseOrders = async (vendorId) =>
  (await apiClient.get(`/vendors/${vendorId}/purchase-orders`)).data;

const api = apiClient;

// attach helper methods to the same default export
api.fetchParts = fetchParts;
api.createPart = createPart;
api.updatePart = updatePart;
api.deletePart = deletePart;
api.bulkUploadParts = bulkUploadParts;

api.fetchProducts = fetchProducts;
api.createProduct = createProduct;
api.updateProduct = updateProduct;
api.deleteProduct = deleteProduct;

api.fetchPurchaseOrders = fetchPurchaseOrders;
api.fetchPurchaseOrderById = fetchPurchaseOrderById;
api.createPurchaseOrder = createPurchaseOrder;
api.updatePurchaseOrder = updatePurchaseOrder;
api.updatePurchaseOrderStatus = updatePurchaseOrderStatus;
api.uploadPurchaseOrderFiles = uploadPurchaseOrderFiles;
api.fetchPurchaseOrdersReport = fetchPurchaseOrdersReport;

api.fetchVendors = fetchVendors;
api.createVendor = createVendor;
api.updateVendor = updateVendor;
api.deleteVendor = deleteVendor;
api.bulkUploadVendors = bulkUploadVendors;
api.fetchVendorPurchaseOrders = fetchVendorPurchaseOrders;
api.fetchVendorPartsLatestReport = fetchVendorPartsLatestReport;

export const apiRaw = apiClient;
export default api;