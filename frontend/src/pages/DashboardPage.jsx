// src/pages/DashboardPage.jsx
import PurchaseOrderForm from "../pages/purchaseOrders/PurchaseOrderForm";
import { useEffect, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { apiRaw as api } from "../utils/api"; // axios instance
import VendorForm from "../pages/vendors/VendorForm";
import PartForm from "../components/forms/PartForm";

export default function DashboardPage() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState({
    partsCount: 0,
    lowStock: 0,
    vendorsCount: 0,
    purchaseOrders: 0,
  });

  const [inventoryTrend, setInventoryTrend] = useState([]);
  const [poMonthly, setPoMonthly] = useState([]);
  const [recentPOs, setRecentPOs] = useState([]);
  const [lowStockList, setLowStockList] = useState([]);

  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showPartModal, setShowPartModal] = useState(false);
  const [showPoModal, setShowPoModal] = useState(false);

  // Disable background scroll when PO modal is open
  useEffect(() => {
    if (showPoModal) document.body.classList.add("overflow-hidden");
    else document.body.classList.remove("overflow-hidden");
  }, [showPoModal]);

  // --- Loaders split so we can call them again ---
  const loadCards = async () => {
    try {
      const [partsRes, lowStockRes, vendorsRes, poRes] = await Promise.all([
        api.get("/parts/count"),
        api.get("/parts/low-stock/count"),
        api.get("/vendors/count"),
        api.get("/purchase_orders/count"),
      ]);
      setSummary({
        partsCount: partsRes.data?.count ?? 0,
        lowStock: lowStockRes.data?.count ?? 0,
        vendorsCount: vendorsRes.data?.count ?? 0,
        purchaseOrders: poRes.data?.count ?? 0,
      });
    } catch (err) {
      console.error("Dashboard cards error:", err);
    }
  };

  const loadCharts = async () => {
    try {
      const [trendRes, statusRes] = await Promise.all([
        api.get("/parts/trend/monthly?months=6"),
        api.get("/purchase_orders/status/monthly?months=6"),
      ]);
      setInventoryTrend((trendRes.data?.data || []).map((r) => ({
        month: r.ym,
        count: r.count,
      })));
      setPoMonthly((statusRes.data?.data || []).map((r) => ({
        month: r.ym,
        draft: r.draft,
        pending: r.pending,
        sent: r.sent,
        completed: r.completed,
      })));
    } catch (err) {
      console.error("Dashboard charts error:", err);
    }
  };

  const loadTables = async () => {
    try {
      const [recentRes, lowRes] = await Promise.all([
        api.get("/purchase_orders/recent?limit=5"),
        api.get("/parts/low-stock?limit=10"),
      ]);
      setRecentPOs(recentRes.data?.data || []);
      setLowStockList(lowRes.data?.data || []);
    } catch (err) {
      console.error("Dashboard tables error:", err);
    }
  };

  // ✅ NEW: a single refresher you can call from anywhere
  const refreshCounts = async () => {
    await Promise.all([loadCards(), loadCharts(), loadTables()]);
  };

  useEffect(() => {
    refreshCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const StatCard = ({ title, value, color }) => (
    <motion.div whileHover={{ scale: 1.02 }} className="bg-white shadow rounded-xl p-5 border">
      <h3 className="text-sm text-gray-500">{title}</h3>
      <p className={`text-2xl mt-2 font-semibold ${color}`}>{value}</p>
    </motion.div>
  );

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 text-sm">Inventory & Operations Overview</p>
        </div>
        <div className="flex gap-3">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
            onClick={() => window.print()}
          >
            Export Report
          </button>

          <button
            className="px-4 py-2 bg-gray-800 text-white rounded-xl hover:bg-black"
            onClick={() => setShowPoModal(true)}
          >
            + Add PO
          </button>

          <button
            className="px-4 py-2 bg-gray-800 text-white rounded-xl hover:bg-black"
            onClick={() => setShowPartModal(true)}
          >
            + Add Part
          </button>
          <button
            className="px-4 py-2 bg-gray-800 text-white rounded-xl hover:bg-black"
            onClick={() => setShowVendorModal(true)}
          >
            + Add Vendor
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Parts" value={summary.partsCount} color="text-blue-600" />
        <StatCard title="Low Stock Items" value={summary.lowStock} color="text-red-600" />
        <StatCard title="Vendors" value={summary.vendorsCount} color="text-green-600" />
        <StatCard title="Purchase Orders" value={summary.purchaseOrders} color="text-purple-600" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-5 border">
          <h3 className="text-lg font-semibold mb-4">Inventory Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={inventoryTrend}>
              <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={3} />
              <CartesianGrid stroke="#f3f4f6" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow p-5 border">
          <h3 className="text-lg font-semibold mb-4">PO Status Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={poMonthly}>
              <CartesianGrid stroke="#f3f4f6" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="draft" fill="#9ca3af" />
              <Bar dataKey="pending" fill="#f97316" />
              <Bar dataKey="sent" fill="#2563eb" />
              <Bar dataKey="completed" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent POs */}
        <div className="bg-white rounded-xl shadow p-5 border">
          <h3 className="text-lg font-semibold mb-4">Recent Purchase Orders</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">PO #</th>
                  <th className="py-2 pr-4">Vendor</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentPOs.map((po) => (
                  <tr
                    key={po.id}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/purchase-orders/${po.id}`)}
                  >
                    <td className="py-2 pr-4 font-medium text-gray-800">{po.psr_po_number}</td>
                    <td className="py-2 pr-4">{po.vendor_name || "-"}</td>
                    <td className="py-2 pr-4">
                      {po.order_date ? new Date(po.order_date).toISOString().split("T")[0] : "-"}
                    </td>
                    <td className="py-2 pr-4">
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100">{po.status}</span>
                    </td>
                    <td className="py-2 pr-0 text-right">
                      {po.grand_total != null ? `$${Number(po.grand_total).toFixed(2)}` : "-"}
                    </td>
                  </tr>
                ))}
                {!recentPOs.length && (
                  <tr>
                    <td className="py-4 text-gray-500" colSpan={5}>
                      No recent purchase orders.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-white rounded-xl shadow p-5 border">
          <h3 className="text-lg font-semibold mb-4">Low Stock Preview</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Part #</th>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">On Hand</th>
                  <th className="py-2 pr-4">Min</th>
                  <th className="py-2 pr-4">Location</th>
                </tr>
              </thead>
              <tbody>
                {lowStockList.map((p) => (
                  <tr key={p.part_id} className="border-b hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium text-gray-800">{p.part_number}</td>
                    <td className="py-2 pr-4">{p.part_name}</td>
                    <td className="py-2 pr-4">{p.quantity_on_hand}</td>
                    <td className="py-2 pr-4">{p.minimum_stock_level}</td>
                    <td className="py-2 pr-4">{p.location || "-"}</td>
                  </tr>
                ))}
                {!lowStockList.length && (
                  <tr>
                    <td className="py-4 text-gray-500" colSpan={5}>
                      No low stock items.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Vendor Modal */}
      {showVendorModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-3xl w-full relative">
            <VendorForm
              initial={{}}
              onSaved={() => {
                setShowVendorModal(false);
                api.get("/vendors/count").then((res) =>
                  setSummary((prev) => ({
                    ...prev,
                    vendorsCount: res.data?.count ?? prev.vendorsCount,
                  }))
                );
              }}
              onCancel={() => setShowVendorModal(false)}
            />
          </div>
        </div>
      )}

      {/* Part Modal */}
      {showPartModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 overflow-y-auto max-h-[90vh] relative">
            <PartForm
              initial={{}}
              onSaved={() => {
                setShowPartModal(false);
                api.get("/parts/count").then((res) =>
                  setSummary((prev) => ({
                    ...prev,
                    partsCount: res.data?.count ?? prev.partsCount,
                  }))
                );
              }}
              onCancel={() => setShowPartModal(false)}
            />
          </div>
        </div>
      )}

      {/* PO Modal */}
      {showPoModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <PurchaseOrderForm
              isModal
              initialPo={null}
              onSaved={() => {
                setShowPoModal(false);
                refreshCounts(); // ✅ defined now
              }}
              onCancel={() => setShowPoModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
