import React from "react";

export default function Reports() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Reports</h1>
      <p className="text-gray-700">
        Here you can view all system reports, including inventory, sales, and purchase analytics.
      </p>

      {/* Example cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="p-4 bg-white rounded shadow">
          <h2 className="font-semibold text-lg">Inventory Report</h2>
          <p>Total parts, stock levels, and minimum thresholds.</p>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <h2 className="font-semibold text-lg">Sales Report</h2>
          <p>Summary of all sales orders and revenue analytics.</p>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <h2 className="font-semibold text-lg">Purchase Report</h2>
          <p>Summary of purchase orders and supplier performance.</p>
        </div>
      </div>
    </div>
  );
}
