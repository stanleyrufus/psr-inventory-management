// frontend/src/pages/purchaseOrders/PurchaseOrderList.jsx
import React, { useEffect, useState } from "react";
import api from "../../utils/api";
import PurchaseOrderForm from "./PurchaseOrderForm";
import PurchaseOrderDetails from "./PurchaseOrderDetails";

export default function PurchaseOrderList() {
  const [orders, setOrders] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [editingOrder, setEditingOrder] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // 🔍 filters + pagination
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ✅ Load purchase orders
  const loadOrders = async () => {
    try {
      const res = await api.fetchPurchaseOrders?.();
      const data = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : res?.data?.data || [];
      const sorted = [...data].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      setOrders(sorted);
      setFiltered(sorted);
    } catch (e) {
      console.error("❌ Error loading purchase orders:", e);
      setOrders([]);
      setFiltered([]);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // ✅ Apply search + filters
  useEffect(() => {
    const f = orders.filter((o) => {
      const matchSearch =
        o.po_number?.toLowerCase().includes(search.toLowerCase()) ||
        o.supplier_name?.toLowerCase().includes(search.toLowerCase()) ||
        o.description?.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter
        ? o.category === categoryFilter
        : true;
      const matchStatus = statusFilter ? o.status === statusFilter : true;
      return matchSearch && matchCategory && matchStatus;
    });
    setFiltered(f);
    setCurrentPage(1);
  }, [search, categoryFilter, statusFilter, orders]);

  // ✅ Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // ✅ Callback after saving
  const handleSaved = () => {
    setShowForm(false);
    setEditingOrder(null);
    loadOrders();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">
            Purchase Orders Dashboard
          </h2>
          <p className="text-gray-500 text-sm">
            Manage purchase orders, suppliers, and fulfillment
          </p>
        </div>
        <button
          onClick={() => {
            setEditingOrder(null);
            setShowForm(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
        >
          ➕ Create PO
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <input
          type="text"
          placeholder="🔍 Search PO #, Supplier, or Description..."
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
          {[...new Set(orders.map((o) => o.category))].map(
            (cat) =>
              cat && (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              )
          )}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Shipped">Shipped</option>
          <option value="Delivered">Delivered</option>
          <option value="Cancelled">Cancelled</option>
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

      {/* Table */}
      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="min-w-full border text-sm text-left">
          <thead className="bg-gray-100 text-gray-700 uppercase text-xs font-semibold">
            <tr>
              <th className="py-3 px-4 border-b">PO #</th>
              <th className="py-3 px-4 border-b">Supplier</th>
              <th className="py-3 px-4 border-b">Category</th>
              <th className="py-3 px-4 border-b text-right">Total Amount</th>
              <th className="py-3 px-4 border-b">Order Date</th>
              <th className="py-3 px-4 border-b text-center">Status</th>
              <th className="py-3 px-4 border-b text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-6 text-gray-500 font-medium"
                >
                  No purchase orders found
                </td>
              </tr>
            ) : (
              paginated.map((o) => (
                <tr
                  key={o.po_id ?? o.id ?? o.po_number}
                  className="border-t hover:bg-gray-50 transition"
                >
                  <td className="py-2 px-4">{o.po_number}</td>
                  <td className="py-2 px-4">{o.supplier_name}</td>
                  <td className="py-2 px-4">{o.category || "-"}</td>
                  <td className="py-2 px-4 text-right">
                    {o.total_amount ? `$${o.total_amount}` : "-"}
                  </td>
                  <td className="py-2 px-4">
                    {o.order_date
                      ? new Date(o.order_date).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="py-2 px-4 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        o.status === "Delivered"
                          ? "bg-green-100 text-green-700"
                          : o.status === "Pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : o.status === "Cancelled"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {o.status || "Unknown"}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-center">
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => setViewingOrder(o)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View
                      </button>
                      <button
                        onClick={() => {
                          setEditingOrder(o);
                          setShowForm(true);
                        }}
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

      {/* Modals */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6 overflow-y-auto max-h-[90vh]">
            <PurchaseOrderForm
              initial={editingOrder ?? {}}
              onSaved={handleSaved}
              onCancel={() => {
                setShowForm(false);
                setEditingOrder(null);
              }}
            />
          </div>
        </div>
      )}

      {viewingOrder && (
        <PurchaseOrderDetails
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
        />
      )}
    </div>
  );
}
