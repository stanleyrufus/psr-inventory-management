import React from "react";
import { useNavigate } from "react-router-dom";

export default function SalesOrderPage() {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Sales Orders
          </h1>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            Coming Soon
          </span>
        </div>

        <p className="text-gray-500 mt-2">
          This module is currently under construction.
        </p>

        <p className="text-gray-500 mt-2">
          Sales Order functionality has not been enabled yet. Please use the
          available Inventory, Vendors, or Purchase Order modules for now.
        </p>

        <div className="flex flex-wrap gap-3 mt-6">
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 rounded-lg text-sm font-medium shadow-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>

          <button
            onClick={() => navigate("/parts")}
            className="px-4 py-2 rounded-lg text-sm font-medium shadow-sm bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Go to Inventory
          </button>
        </div>
      </div>
    </div>
  );
}
