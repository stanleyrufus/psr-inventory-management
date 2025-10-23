import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import PurchaseOrderForm from "./PurchaseOrderForm";
import PurchaseOrderDetails from "./PurchaseOrderDetails";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function PurchaseOrderList() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [editingOrder, setEditingOrder] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // 🔍 filters + pagination state
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ✅ Load purchase orders
  const loadOrders = async () => {
    try {
      const res = await axios.get(`${BASE}/api/purchase_orders`);
      const data = Array.isArray(res.data) ? res.data : [];

      // Sort newest first
      const sorted = [...data].sort((a, b) => {
        const ida = a.id ?? 0;
        const idb = b.id ?? 0;
        if (ida !== 0 || idb !== 0) return idb - ida;
        return new Date(b.created_at) - new Date(a.created_at);
      });

      setOrders(sorted);
    } catch (e) {
      console.error("❌ Error loading purchase orders:", e);
      setOrders([]);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Unique supplier & status options
  const supplierOptions = useMemo(
    () => Array.from(new Set(orders.map((o) => o.supplier_name).filter(Boolean))),
    [orders]
  );
  const statusOptions = useMemo(
    () => Array.from(new Set(orders.map((o) => o.status).filter(Boolean))),
    [orders]
  );

  // ✅ Apply search + filters
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      const matchSearch =
        !q ||
        o.psr_po_number?.toLowerCase().includes(q) ||
        o.supplier_name?.toLowerCase().includes(q) ||
        o.remarks?.toLowerCase().includes(q);

      const matchSupplier = supplierFilter ? o.supplier_name === supplierFilter : true;
      const matchStatus = statusFilter ? o.status === statusFilter : true;

      return matchSearch && matchSupplier && matchStatus;
    });
  }, [orders, search, supplierFilter, statusFilter]);

  // ✅ Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // ✅ View → fetch full PO details
  const handleView = async (row) => {
    try {
      const res = await axios.get(`${BASE}/api/purchase_orders/${row.id}`);
      const full = res.data || row;
      setViewingOrder(full);
    } catch {
      setViewingOrder(row);
    }
  };

  // ✅ After Save/Update
  const handleSavedClose = () => {
    setShowForm(false);
    setEditingOrder(null);
    loadOrders();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Purchase Orders</h2>
          <p className="text-gray-500 text-sm">Create, track and manage purchase orders</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => navigate("/purchaseOrders/bulk-upload")}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded shadow"
          >
            📤 Bulk Upload
          </button>

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
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <input
          type="text"
          placeholder="🔍 Search PO #, Supplier, Remarks..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="border rounded px-3 py-2 w-64"
        />

        <select
          value={supplierFilter}
          onChange={(e) => {
            setSupplierFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="border rounded px-3 py-2"
        >
          <option value="">All Suppliers</option>
          {supplierOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="border rounded px-3 py-2"
        >
          <option value="">All Status</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
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
              <th className="py-3 px-4 border-b text-right">Subtotal</th>
              <th className="py-3 px-4 border-b text-right">Tax</th>
              <th className="py-3 px-4 border-b text-right">Shipping</th>
              <th className="py-3 px-4 border-b text-right">Grand Total</th>
              <th className="py-3 px-4 border-b">Order Date</th>
              <th className="py-3 px-4 border-b text-center">Status</th>
              <th className="py-3 px-4 border-b text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-6 text-gray-500 font-medium">
                  No purchase orders found
                </td>
              </tr>
            ) : (
              paginated.map((o) => (
                <tr key={o.id} className="border-t hover:bg-gray-50 transition">
                  <td className="py-2 px-4 font-mono">{o.psr_po_number}</td>
                  <td className="py-2 px-4">{o.supplier_name || "-"}</td>
                  <td className="py-2 px-4 text-right">
                    {o.subtotal != null ? `$${Number(o.subtotal).toFixed(2)}` : "-"}
                  </td>
                  <td className="py-2 px-4 text-right">
                    {o.tax_amount != null ? `$${Number(o.tax_amount).toFixed(2)}` : "-"}
                  </td>
                  <td className="py-2 px-4 text-right">
                    {o.shipping_charges != null
                      ? `$${Number(o.shipping_charges).toFixed(2)}`
                      : "-"}
                  </td>
                  <td className="py-2 px-4 text-right font-semibold">
                    {o.grand_total != null ? `$${Number(o.grand_total).toFixed(2)}` : "-"}
                  </td>
                  <td className="py-2 px-4">
                    {o.order_date ? new Date(o.order_date).toLocaleDateString() : "-"}
                  </td>
                  <td className="py-2 px-4 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        o.status === "Delivered"
                          ? "bg-green-100 text-green-700"
                          : o.status === "Pending" || o.status === "Draft"
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
                        onClick={() => handleView(o)}
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
          <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl p-6 overflow-y-auto max-h-[95vh]">
            <PurchaseOrderForm
              initialPo={editingOrder ?? null}
              onSaved={() => {
                setShowForm(false);
                setEditingOrder(null);
                loadOrders();
              }}
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
