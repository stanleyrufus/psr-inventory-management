import React from "react";
import DashboardCards from "../sections/DashboardCards";

export default function DashboardPage() {
  return (
    <div className="max-w-full">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-psr-primary">Dashboard</h1>
        <p className="text-sm text-gray-500">Overview of inventory and orders</p>
      </header>

      <DashboardCards />
    </div>
  );
}
