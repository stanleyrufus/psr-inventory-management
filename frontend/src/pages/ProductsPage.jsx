// frontend/src/pages/ProductsPage.jsx
import React, { useEffect, useState } from "react";
import api from "../utils/api";
import ProductForm from "../components/forms/ProductForm";
import ProductDetail from "../components/ProductDetail.jsx"; // ✅ fixed path and added .jsx

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ✅ Fetch products
  const loadProducts = async () => {
    try {
      const res = await api.fetchProducts();
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setProducts(list);
    } catch (e) {
      console.error("❌ Error fetching products:", e.response?.data?.message || e.message);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const openNew = () => setEditing({});
  const edit = (p) => setEditing(p);
  const view = (p) => setViewing(p);

  const onSaved = () => {
    loadProducts();
    setEditing(null);
  };

  // ✅ Filter + search
  const filtered = products.filter((p) => {
    const matchSearch =
      p.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.product_code?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter ? p.category === categoryFilter : true;
    const matchStatus = statusFilter ? p.status === statusFilter : true;
    return matchSearch && matchCategory && matchStatus;
  });

  // ✅ Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Products Dashboard</h2>
          <p className="text-sm text-gray-500">Manage PSR Machines and Components</p>
        </div>
        <button
          onClick={openNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
        >
          + Add Product
        </button>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <input
          type="text"
          placeholder="🔍 Search by name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-2 w-64"
        />

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">All Categories</option>
          {[...new Set(products.map((p) => p.category))].map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>

        <select
          value={itemsPerPage}
          onChange={(e) => {
            setItemsPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
          className="border rounded px-3 py-2"
        >
          {[10, 25, 50].map((n) => (
            <option key={n} value={n}>
              Show {n} per page
            </option>
          ))}
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-white shadow rounded-lg overflow-auto">
        <table className="min-w-full text-left text-sm border-collapse">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-semibold">
            <tr>
              <th className="py-3 px-4 border-b">ID</th>
              <th className="py-3 px-4 border-b">Product Code</th>
              <th className="py-3 px-4 border-b">Product Name</th>
              <th className="py-3 px-4 border-b">Category</th>
              <th className="py-3 px-4 border-b">Machine Type</th>
              <th className="py-3 px-4 border-b">Frame Series</th>
              <th className="py-3 px-4 border-b">Status</th>
              <th className="py-3 px-4 border-b text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td className="p-6 text-center text-gray-500" colSpan={8}>
                  No products found
                </td>
              </tr>
            ) : (
              paginated.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50 transition">
                  <td className="py-2 px-4">{p.id}</td>
                  {/* 🔧 Removed monospace font for consistency */}
                  <td className="py-2 px-4">{p.product_code}</td>
                  <td className="py-2 px-4 font-medium text-gray-800">{p.product_name}</td>
                  <td className="py-2 px-4">{p.category}</td>
                  <td className="py-2 px-4">{p.machine_type || "—"}</td>
                  <td className="py-2 px-4">{p.frame_series || "—"}</td>
                  <td className="py-2 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        p.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-center">
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => view(p)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View
                      </button>
                      <button
                        onClick={() => edit(p)}
                        className="text-gray-700 hover:underline text-sm"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-4 gap-3 text-sm">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Product Form Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6 overflow-y-auto max-h-[90vh]">
            <ProductForm
              initial={editing}
              onSaved={onSaved}
              onCancel={() => setEditing(null)}
            />
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {viewing && <ProductDetail product={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
