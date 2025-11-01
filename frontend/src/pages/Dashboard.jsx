// frontend/src/pages/DashboardPage.jsx
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const [summary, setSummary] = useState({
    partsCount: 0,
    vendorsCount: 0,
    pendingOrders: 0,
    completedOrders: 0,
  });

  useEffect(() => {
    // Example API call (replace with your actual endpoint)
    fetch(`${import.meta.env.VITE_API_URL}/api/summary`)
      .then((res) => res.json())
      .then((data) => setSummary(data))
      .catch(() => {
        // fallback demo data
        setSummary({
          partsCount: 1245,
          vendorsCount: 32,
          pendingOrders: 12,
          completedOrders: 85,
        });
      });
  }, []);

  const inventoryTrend = [
    { month: "Jan", count: 450 },
    { month: "Feb", count: 510 },
    { month: "Mar", count: 610 },
    { month: "Apr", count: 720 },
  ];

  const ordersData = [
    { month: "Jan", pending: 10, completed: 25 },
    { month: "Feb", pending: 5, completed: 40 },
    { month: "Mar", pending: 8, completed: 35 },
    { month: "Apr", pending: 12, completed: 45 },
  ];

  const activities = [
    { action: "New Purchase Order created - PO#1045", time: "2h ago" },
    { action: "Vendor 'Global Parts Co.' added", time: "5h ago" },
    { action: "Parts inventory updated - 15 new items", time: "1d ago" },
  ];

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 text-sm">
            Overview of your parts, vendors, and orders
          </p>
        </div>
        <button className="mt-3 md:mt-0 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
          Generate Report
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: "Total Parts", value: summary.partsCount, color: "text-blue-600" },
          { title: "Active Vendors", value: summary.vendorsCount, color: "text-green-600" },
          { title: "Pending Orders", value: summary.pendingOrders, color: "text-orange-500" },
          { title: "Completed Orders", value: summary.completedOrders, color: "text-purple-600" },
        ].map((card, idx) => (
          <motion.div
            key={idx}
            whileHover={{ scale: 1.02 }}
            className="bg-white shadow rounded-2xl p-5 border border-gray-100 transition"
          >
            <h3 className="text-sm font-medium text-gray-500">{card.title}</h3>
            <p className={`text-2xl font-semibold mt-2 ${card.color}`}>{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Parts Trend */}
        <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Parts Inventory Trend
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={inventoryTrend}>
              <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={3} />
              <CartesianGrid stroke="#f3f4f6" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Purchase Orders */}
        <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Purchase Orders Summary
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={ordersData}>
              <CartesianGrid stroke="#f3f4f6" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="pending" fill="#f97316" name="Pending" />
              <Bar dataKey="completed" fill="#8b5cf6" name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity / Reports */}
      <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">
          Recent Activities
        </h3>
        <ul className="divide-y divide-gray-200">
          {activities.map((item, i) => (
            <li key={i} className="py-3 flex justify-between text-sm">
              <span className="text-gray-700">{item.action}</span>
              <span className="text-gray-500">{item.time}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
