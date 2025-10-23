import React, { useState } from "react";
import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function PurchaseOrderBulkUpload() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleUpload = async () => {
    if (!file) {
      setMessage("❌ Please select an Excel file first.");
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(`${BASE}/api/purchase_orders/bulk`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessage(res.data.message || "✅ Upload successful!");
      setFile(null);
    } catch (err) {
      console.error("❌ Upload failed:", err);
      setMessage("❌ Upload failed. See console for details.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 bg-white shadow rounded max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">
        📦 Bulk Upload Purchase Orders
      </h2>

      <p className="text-sm text-gray-600 mb-3">
        Upload an Excel file (.xlsx or .csv) with the following columns:
      </p>

      <ul className="list-disc ml-6 text-sm text-gray-700 mb-4">
        <li>PO Number</li>
        <li>Supplier</li>
        <li>Order Date (YYYY-MM-DD)</li>
        <li>Part Number</li>
        <li>Quantity</li>
        <li>Unit Price</li>
        <li>Shipping</li>
        <li>Tax %</li>
        <li>Remarks</li>
      </ul>

      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        className="border p-2 rounded w-full mb-3"
      />

      <button
        onClick={handleUpload}
        disabled={uploading}
        className={`px-4 py-2 rounded text-white ${
          uploading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {uploading ? "Uploading..." : "Upload File"}
      </button>

      {message && (
        <div className="mt-4 text-sm font-medium text-gray-700">{message}</div>
      )}
    </div>
  );
}
