import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function PurchaseOrderList() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const loadOrders = async () => {
    const res = await axios.get(`${BASE}/api/purchase_orders`);
    const data = Array.isArray(res.data) ? res.data : [];
    setOrders(data);
  };

  useEffect(() => { loadOrders(); }, []);
  useEffect(() => {
    if (localStorage.getItem("refreshPOList") === "1") {
      localStorage.removeItem("refreshPOList");
      loadOrders();
    }
  }, []);

  const sortBy = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortedOrders = useMemo(() => {
    if (!sortConfig.key) return orders;
    return [...orders].sort((a, b) => {
      const x = a[sortConfig.key] ?? "";
      const y = b[sortConfig.key] ?? "";
      return sortConfig.direction === "asc"
        ? x > y ? 1 : -1
        : x < y ? 1 : -1;
    });
  }, [orders, sortConfig]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sortedOrders.filter((o) => {
      const matchSearch =
        !q ||
        o.psr_po_number?.toLowerCase().includes(q) ||
        o.vendor_name?.toLowerCase().includes(q);
      const matchSupplier = supplierFilter ? o.vendor_name === supplierFilter : true;
      const matchStatus = statusFilter ? o.status === statusFilter : true;
      return matchSearch && matchSupplier && matchStatus;
    });
  }, [sortedOrders, search, supplierFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const goToPage = (p) => p >= 1 && p <= totalPages && setCurrentPage(p);

  const SortIcon = ({ col }) => {
    if (sortConfig.key !== col) return <span className="ml-1 text-gray-400">▲</span>;
    return <span className="ml-1">{sortConfig.direction === "asc" ? "▲" : "▼"}</span>;
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
          {/* Bulk upload only */}
          <button
            onClick={() => navigate("/purchase-orders/bulk-upload")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
          >
            📤 Bulk Upload
          </button>

          <button
            onClick={() => navigate("/purchase-orders/new")}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow"
          >
            ➕ Create PO
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4 items-center">

        {/* Search */}
        <input
          placeholder="🔍 Search PO#, Vendor..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          className="border rounded px-3 py-2 w-64"
        />

        {/* Vendor Filter */}
       <select
  value={supplierFilter}
  onChange={(e) => { setSupplierFilter(e.target.value); setCurrentPage(1); }}
  className="border rounded px-2 py-2 w-40"
>
  <option value="">All Vendors</option>
  {Array.from(new Set(orders.map(o => o.vendor_name).filter(Boolean))).map((s) => (
    <option key={s}>{s}</option>
  ))}
</select>


       <select
  value={statusFilter}
  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
  className="border rounded px-2 py-2 w-32"
>
  <option value="">All Status</option>
  {Array.from(new Set(orders.map(o => o.status).filter(Boolean))).map((s) => (
    <option key={s}>{s}</option>
  ))}
</select>


        {/* Show per page */}
        <div>
  <select
    value={itemsPerPage}
    onChange={(e) => setItemsPerPage(Number(e.target.value))}
    className="border rounded px-2 py-2"
  >
    {[10, 20, 50, 100].map((n) => (
      <option key={n} value={n}>
        Show {n} per page
      </option>
    ))}
  </select>
</div>



      </div>

      {/* Table */}
      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead className="bg-gray-100 text-gray-700 uppercase text-xs font-semibold">
            <tr>
              <th className="py-3 px-4 border-b cursor-pointer" onClick={() => sortBy("psr_po_number")}>
                PO # <SortIcon col="psr_po_number" />
              </th>
              <th className="py-3 px-4 border-b cursor-pointer" onClick={() => sortBy("vendor_name")}>
                Vendor <SortIcon col="vendor_name" />
              </th>
              <th className="py-3 px-4 border-b text-right cursor-pointer" onClick={() => sortBy("grand_total")}>
                Grand Total <SortIcon col="grand_total" />
              </th>
              <th className="py-3 px-4 border-b cursor-pointer" onClick={() => sortBy("order_date")}>
                Order Date <SortIcon col="order_date" />
              </th>
              <th className="py-3 px-4 border-b text-center">Status</th>
              <th className="py-3 px-4 border-b text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-6 text-gray-500">No purchase orders found</td></tr>
            ) : paginated.map((o) => (
              <tr key={o.id} className="border-t hover:bg-gray-50">
                <td className="py-2 px-4 cursor-pointer text-blue-600" onClick={() => navigate(`/purchase-orders/${o.id}`)}>
                  {o.psr_po_number}
                </td>
                <td className="py-2 px-4">{o.vendor_name || "-"}</td>
                <td className="py-2 px-4 text-left font-semibold">{o.grand_total ? `$${o.grand_total}` : "-"}</td>
                <td className="py-2 px-4">{o.order_date ? new Date(o.order_date).toLocaleDateString() : "-"}</td>
                <td className="py-2 px-4 text-center">{o.status}</td>
                <td className="py-2 px-4 text-center">
                  <button className="text-blue-600 mr-2" onClick={() => navigate(`/purchase-orders/${o.id}`)}>View</button>
                  <button className="text-gray-700 mr-2" onClick={() => navigate(`/purchase-orders/edit/${o.id}`)}>Edit</button>
                  <button
  className="text-red-600"
  onClick={async () => {
    if (!window.confirm(`Are you sure you want to delete PO "${o.psr_po_number}"?`)) return;
    try {
      await axios.delete(`${BASE}/api/purchase_orders/${o.id}`);
      alert("✅ Purchase Order deleted successfully!");
      loadOrders();
    } catch (err) {
      console.error("❌ Delete failed:", err);
      alert("Error deleting PO. Check console for details.");
    }
  }}
>
  Delete
</button>

                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-center items-center gap-3 mt-4 text-sm">
        <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Prev</button>

        <span>Page {currentPage} of {totalPages}</span>

        <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}
