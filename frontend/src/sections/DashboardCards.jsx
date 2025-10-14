import React from "react";

const StatCard = ({ title, value }) => (
  <div className="card p-4">
    <div className="text-sm text-gray-500">{title}</div>
    <div className="text-2xl font-semibold">{value}</div>
  </div>
);

export default function DashboardCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard title="Total Products" value="—" />
      <StatCard title="Total Parts" value="—" />
      <StatCard title="Pending Sales Orders" value="—" />
      <StatCard title="Pending POs" value="—" />
    </div>
  );
}
