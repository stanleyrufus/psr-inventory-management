import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function PurchaseOrderList() {
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  // ✅ Fetch all POs (with optional query)
  const fetchPOs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE}/api/purchase_orders`, {
        params: q ? { q } : {},
      });
      setPos(res.data || []);
    } catch (err) {
      console.error("❌ Failed to load purchase orders:", err);
      setPos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPOs();
  }, []);

  // ✅ Enter key triggers search
  const handleKeyDown = (e) => {
    if (e.key === "Enter") fetchPOs();
  };

  // ✅ Guaranteed navigation handler (fixes “nothing happens” issue)
  const handleNewPO = () => {
    navigate("/purchase-orders/new");
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-blue-700">Purchase Orders</h1>

        <div className="flex gap-2">
          <input
            className="border rounded px-3 py-2 text-sm"
            placeholder="Search (PO # / remarks)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={fetchPOs}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Search
          </button>

          {/* ✅ Clear / Show All button */}
          <button
            onClick={() => {
              setQ("");
              fetchPOs();
            }}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"
          >
            Clear / Show All
          </button>

          {/* ✅ Use onClick navigate for reliability */}
          <button
            onClick={handleNewPO}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow"
          >
            + New PO
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left">PO Number</th>
              <th className="px-3 py-2 text-left">Supplier</th>
              <th className="px-3 py-2 text-left">Created By</th>
              <th className="px-3 py-2 text-left">Created Date</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Grand Total</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Loading */}
            {loading && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center">
                  Loading…
                </td>
              </tr>
            )}

            {/* Empty State */}
            {!loading && pos.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-gray-500">
                  No purchase orders found.
                </td>
              </tr>
            )}

            {/* Data Rows */}
            {pos.map((row) => (
              <tr key={row.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">{row.psr_po_number || "-"}</td>
                <td className="px-3 py-2">{row.supplier_name || "-"}</td>
                <td className="px-3 py-2">{row.created_by || "-"}</td>
                <td className="px-3 py-2">
                  {row.created_at
                    ? new Date(row.created_at).toLocaleDateString()
                    : "-"}
                </td>
                <td className="px-3 py-2">{row.status || "-"}</td>
                <td className="px-3 py-2">
                  {row.grand_total
                    ? `$${Number(row.grand_total).toFixed(2)}`
                    : "-"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-3">
                    <Link
                      to={`/purchase-orders/${row.id}`}
                      className="text-blue-700 hover:underline"
                    >
                      View
                    </Link>
                    <Link
                      to={`/purchase-orders/edit/${row.id}`}
                      className="text-green-700 hover:underline"
                    >
                      Edit
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
