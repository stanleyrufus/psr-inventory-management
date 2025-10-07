import React from "react";
import DashboardCards from "../sections/DashboardCards";
import ProductTable from "../sections/ProductTable";

export default function DashboardPage() {
  return (
    <div className="max-w-full">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-psr-primary">Dashboard</h1>
        <p className="text-sm text-psr-muted">Overview of inventory and orders</p>
      </header>

      <DashboardCards />

      <section className="mt-6">
        <div className="card p-4">
          <h2 className="font-medium text-lg mb-4">Recent Products</h2>
          <ProductTable />
        </div>
      </section>
    </div>
  );
}
