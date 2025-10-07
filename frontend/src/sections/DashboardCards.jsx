import React from "react";

const StatCard = ({ title, value, small }) => (
  <div className="card p-4">
    <div className="text-sm text-psr-muted">{title}</div>
    <div className={`text-2xl font-semibold ${small ? "text-lg" : ""}`}>{value}</div>
  </div>
);

export default function DashboardCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard title="Total Products" value="128" />
      <StatCard title="Stock Value" value="$42,400" />
      <StatCard title="Pending Sales Orders" value="6" />
      <StatCard title="Pending POs" value="3" />
    </div>
  );
}
