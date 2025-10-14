// src/pages/inventory/InventoryPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function InventoryPage() {
  const [inventoryData, setInventoryData] = useState([]);
  const navigate = useNavigate();

  // ✅ Fixed column order
  const allColumns = [
    "productId",
    "quantity",
    "itemId",
    "description",
    "width",
    "length",
    "weight",
    "price",
    "um",
    "extension",
    "tax",
  ];

  // ✅ Load inventory
  const loadInventory = () => {
    const raw = localStorage.getItem("psr_inventory");
    const data = raw ? JSON.parse(raw) : [];
    setInventoryData(data);
  };

  useEffect(() => {
    loadInventory();

    const handleStorage = (e) => {
      if (e.key === "psr_inventory") {
        loadInventory();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-6">Inventory Management</h2>

      <div className="flex flex-wrap gap-4 mb-8">
        <button
          onClick={() => navigate("/inventory/upload")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md shadow-md transition"
        >
          Bulk Upload
        </button>
        <button
          onClick={() => navigate("/inventory/manual")}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-md shadow-md transition"
        >
          Manual Entry
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 overflow-auto">
        {inventoryData.length === 0 ? (
          <p className="text-gray-600 italic">
            No inventory records found. Please upload a file or add manually.
          </p>
        ) : (
          <table className="min-w-full border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-100">
                {allColumns.map((col) => (
                  <th
                    key={col}
                    className="border px-3 py-2 text-left font-semibold text-gray-700"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inventoryData.map((row, idx) => (
                <tr
                  key={idx}
                  className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  {allColumns.map((col, cIdx) => (
                    <td
                      key={cIdx}
                      className="border px-3 py-2 text-gray-800 whitespace-nowrap"
                    >
                      {row[col] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
