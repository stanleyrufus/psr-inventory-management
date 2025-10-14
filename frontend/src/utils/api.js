// api.js
const API_BASE = "http://localhost:5000"; // Point to your real backend

// safeFetch must be defined before export
async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(API_BASE + url, options);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  } catch (err) {
    console.warn("API request failed, falling back to localStorage:", err.message);
    const method = (options.method || "GET").toUpperCase();
    if (url.startsWith("/products")) return localCrud("products", url, method, options);
    if (url.startsWith("/parts")) return localCrud("inventory", url, method, options);
    if (url.startsWith("/sales_orders")) return localCrud("sales_orders", url, method, options);
    if (url.startsWith("/purchase_orders")) return localCrud("purchase_orders", url, method, options);
    throw err;
  }
}

function localCrud(key, url, method, options) {
  const storageKey = `psr_${key}`;
  const raw = localStorage.getItem(storageKey);
  const list = raw ? JSON.parse(raw) : [];

  if (method === "GET") return Promise.resolve(list);

  const body = JSON.parse(options.body || "{}");

  let idKey;
  switch (key) {
    case "products": idKey = "product_id"; break;
    case "inventory": idKey = "part_id"; break;
    case "sales_orders": idKey = "sales_order_id"; break;
    case "purchase_orders": idKey = "purchase_order_id"; break;
    default: idKey = "id";
  }

  if (method === "POST") {
    const nextId = list.length ? Math.max(...list.map((r) => r[idKey] || 0)) + 1 : 1;
    const record = { ...body, [idKey]: nextId, created_at: new Date().toISOString() };
    list.unshift(record);
    localStorage.setItem(storageKey, JSON.stringify(list));
    return Promise.resolve(record);
  }

  if (method === "PUT") {
    const parts = url.split("/");
    const id = parts[2];
    const idx = list.findIndex((r) => String(r[idKey]) === String(id));
    if (idx === -1) return Promise.reject(new Error("Not found"));
    list[idx] = { ...list[idx], ...body, updated_at: new Date().toISOString() };
    localStorage.setItem(storageKey, JSON.stringify(list));
    return Promise.resolve(list[idx]);
  }

  if (method === "DELETE") {
    const parts = url.split("/");
    const id = parts[2];
    const newList = list.filter((r) => String(r[idKey]) !== String(id));
    localStorage.setItem(storageKey, JSON.stringify(newList));
    return Promise.resolve({ success: true });
  }

  return Promise.reject(new Error("Unsupported method"));
}

// --- Export API functions ---
export default {
  // Products
  fetchProducts: () => safeFetch("/products"),
  createProduct: (payload) =>
    safeFetch("/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  updateProduct: (id, payload) =>
    safeFetch(`/products/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),

  // Parts / Inventory
  fetchParts: () => safeFetch("/parts"),
  createPart: (payload) =>
    safeFetch("/parts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  updatePart: (id, payload) =>
    safeFetch(`/parts/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),

  // Sales Orders
  fetchSalesOrders: () => safeFetch("/sales_orders"),
  createSalesOrder: (payload) =>
    safeFetch("/sales_orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  updateSalesOrder: (id, payload) =>
    safeFetch(`/sales_orders/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),

  // Purchase Orders
  fetchPurchaseOrders: () => safeFetch("/purchase_orders"),
  createPurchaseOrder: (payload) =>
    safeFetch("/purchase_orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  updatePurchaseOrder: (id, payload) =>
    safeFetch(`/purchase_orders/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
};
