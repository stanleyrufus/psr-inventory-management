// src/pages/DashboardPage.jsx
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell
} from "recharts";
import PurchaseOrderForm from "../pages/purchaseOrders/PurchaseOrderForm";
import { useEffect, useState } from "react";
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

  const [partsMonthly, setPartsMonthly] = useState([]);
  const [poMonthly, setPoMonthly] = useState([]);
  const [topVendors, setTopVendors] = useState([]);

  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showPartModal, setShowPartModal] = useState(false);
  const [showPoModal, setShowPoModal] = useState(false);

  // Disable background scroll when PO modal is open
  useEffect(() => {
    if (showPoModal) document.body.classList.add("overflow-hidden");
    else document.body.classList.remove("overflow-hidden");
  }, [showPoModal]);

  /* ---------------------------
     Helpers
  ---------------------------- */
  const toShortMonth = (ym) => {
    // ym: "2026-02" -> "02-26"
    const [year, month] = String(ym || "").split("-");
    if (!year || !month) return ym;
    return `${month}-${year.slice(-2)}`;
  };

  const money = (n) => `$${Number(n || 0).toLocaleString()}`;

  /* ---------------------------
     Label renderers
     - Keep labels simple to avoid congestion
  ---------------------------- */
  const PoBarLabel = (props) => {
    const { x, y, width, value } = props;
    return (
      <text
        x={x + width / 2}
        y={y - 8}
        fill="#111"
        textAnchor="middle"
        fontSize="12"
        fontWeight="600"
      >
        {value}
      </text>
    );
  };

  const PartsBarLabel = (props) => {
    const { x, y, width, value } = props;
    return (
      <text
        x={x + width / 2}
        y={y - 8}
        fill="#111"
        textAnchor="middle"
        fontSize="12"
        fontWeight="600"
      >
        {value}
      </text>
    );
  };

  const VendorBarLabel = (props) => {
    const { x, y, width, value } = props;
    return (
      <text
        x={x + width + 10}
        y={y + 12}
        fill="#111"
        textAnchor="start"
        fontSize="12"
        fontWeight="600"
      >
        {money(value)}
      </text>
    );
  };

  /* ---------------------------
     Loaders
  ---------------------------- */
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
      const [partsRes, poRes, vendorsRes] = await Promise.all([
        api.get("/purchase_orders/items/monthly?months=6"),
        api.get("/purchase_orders/trend/monthly?months=6"),
        api.get("/purchase_orders/vendors/top-spend?months=12&limit=5"),
      ]);

      const partsRows = partsRes.data?.data || partsRes.data || [];
      const poRows = poRes.data?.data || poRes.data || [];
      const vendorRows = vendorsRes.data?.data || vendorsRes.data || [];

      setPartsMonthly(
        (Array.isArray(partsRows) ? partsRows : []).map((r) => ({
          month: toShortMonth(r.ym),
          qty: Number(r.qty || r.count || 0),
          total: Number(r.total_value || r.total || 0),
        }))
      );

      setPoMonthly(
        (Array.isArray(poRows) ? poRows : []).map((r) => ({
          month: toShortMonth(r.ym),
          count: Number(r.count || 0),
          total: Number(r.total_value || r.total || 0),
        }))
      );

      setTopVendors(
        (Array.isArray(vendorRows) ? vendorRows : []).map((r) => ({
          vendor: r.vendor_name || r.vendor || "Unknown",
          total: Number(r.total_spend || r.total || r.total_value || 0),
        }))
      );
    } catch (err) {
      console.error("Dashboard charts error:", err);
    }
  };

  const refreshCounts = async () => {
    await Promise.all([loadCards(), loadCharts()]);
  };

  useEffect(() => {
    refreshCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------
     Stat cards
  ---------------------------- */
  const StatCard = ({ title, value, color }) => (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="bg-white shadow-sm rounded-lg px-4 py-3 border"
    >
      <h3 className="text-xs uppercase tracking-wide text-gray-800 font-semibold">
        {title}
      </h3>
      <p className={`text-xl mt-1 font-semibold ${color}`}>{value}</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Parts" value={summary.partsCount} color="text-blue-600" />
        <StatCard title="Low Stock Items" value={summary.lowStock} color="text-red-600" />
        <StatCard title="Vendors" value={summary.vendorsCount} color="text-green-600" />
        <StatCard
          title="Purchase Orders"
          value={summary.purchaseOrders}
          color="text-purple-600"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PO Chart */}
        <div className="bg-white rounded-xl shadow p-5 border">
          <h3 className="text-lg font-semibold mb-4">POs Placed (Last 6 Months)</h3>

          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={poMonthly}
              margin={{ top: 24, right: 16, left: 0, bottom: 10 }}
            >
              <CartesianGrid stroke="#f3f4f6" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} width={40} />
              <Tooltip
                labelFormatter={() => ""} // remove month line
                content={({ payload }) => {
                  if (!payload?.length) return null;
                  const row = payload[0].payload;
                  return (
                    <div className="bg-white border shadow-md rounded px-3 py-2 text-sm">
                      <div>
                        <strong>PO Count:</strong> {row.count}
                      </div>
                      <div>
                        <strong>Total Cost:</strong> {money(row.total)}
                      </div>
                    </div>
                  );
                }}
              />
             <Bar dataKey="count">
  {poMonthly.map((entry, index) => {
    const colors = [
      "#2563EB",
      "#3B82F6",
      "#60A5FA",
      "#93C5FD",
      "#1D4ED8",
      "#0EA5E9",
    ];
    return (
      <Cell
        key={`cell-po-${index}`}
        fill={colors[index % colors.length]}
      />
    );
  })}
  <LabelList content={PoBarLabel} />
</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Parts Chart (✅ Tooltip FIXED like PO tooltip) */}
        <div className="bg-white rounded-xl shadow p-5 border">
          <h3 className="text-lg font-semibold mb-4">Parts Bought (Last 6 Months)</h3>

          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={partsMonthly}
              margin={{ top: 24, right: 16, left: 0, bottom: 10 }}
            >
              <CartesianGrid stroke="#f3f4f6" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} width={50} />
              <Tooltip
                labelFormatter={() => ""} // remove month line
                content={({ payload }) => {
                  if (!payload?.length) return null;
                  const row = payload[0].payload;
                  return (
                    <div className="bg-white border shadow-md rounded px-3 py-2 text-sm">
                      <div>
                        <strong>Qty:</strong> {row.qty}
                      </div>
                      <div>
                        <strong>Total Cost:</strong> {money(row.total)}
                      </div>
                    </div>
                  );
                }}
              />
             <Bar dataKey="qty">
  {partsMonthly.map((entry, index) => {
    const colors = [
  "#EC4899",  // pink-500
  "#DB2777",  // pink-600
  "#F472B6",  // pink-400
  "#BE185D",  // pink-700
  "#F9A8D4",  // pink-300
  "#9D174D",  // pink-800
];
    return (
      <Cell
        key={`cell-parts-${index}`}
        fill={colors[index % colors.length]}
      />
    );
  })}
  <LabelList content={PartsBarLabel} />
</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Vendors Chart (clean + same tooltip style) */}
      <div className="bg-white rounded-xl shadow p-5 border">
        <h3 className="text-lg font-semibold mb-4">
          Top 5 Vendors by Spend (Last 12 Months)
        </h3>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={topVendors}
            layout="vertical"
            margin={{ top: 10, right: 80, left: 160, bottom: 10 }}
          >
            <CartesianGrid stroke="#f3f4f6" />
            <XAxis type="number" tickFormatter={(v) => `$${Number(v).toLocaleString()}`} />
            <YAxis type="category" dataKey="vendor" width={160} />
            <Tooltip
              labelFormatter={() => ""} // remove vendor line above tooltip
              content={({ payload }) => {
                if (!payload?.length) return null;
                const row = payload[0].payload;
                return (
                  <div className="bg-white border shadow-md rounded px-3 py-2 text-sm">
                    <div>
                      <strong>Vendor:</strong> {row.vendor}
                    </div>
                    <div>
                      <strong>Total Spend:</strong> {money(row.total)}
                    </div>
                  </div>
                );
              }}
            />
           <Bar dataKey="total">
  {topVendors.map((entry, index) => {
    const colors = [
      "#F59E0B",
      "#F97316",
      "#FB923C",
      "#EA580C",
      "#D97706",
    ];
    return (
      <Cell
        key={`cell-vendor-${index}`}
        fill={colors[index % colors.length]}
      />
    );
  })}
  <LabelList content={VendorBarLabel} />
</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Vendor Modal */}
      {showVendorModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-3xl w-full relative">
            <VendorForm
              initial={{}}
              onSaved={() => {
                setShowVendorModal(false);
                refreshCounts();
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
                refreshCounts();
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
                refreshCounts();
              }}
              onCancel={() => setShowPoModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}