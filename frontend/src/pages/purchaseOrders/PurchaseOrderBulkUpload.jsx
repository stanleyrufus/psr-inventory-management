import React, { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { CloudArrowUpIcon } from "@heroicons/react/24/solid";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function PurchaseOrderBulkUpload() {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const onUpload = async () => {
    if (!file) return setError("Choose File");
    setBusy(true);
    setResult(null);
    setError("");

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await axios.post(`${BASE}/api/po_import/import`, fd);
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    }
    setBusy(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Bulk Upload Purchase Orders</h2>
        <Link to="/purchase-orders" className="text-blue-600 hover:underline">
          ← Back
        </Link>
      </div>

      <div className="border border-gray-200 bg-white rounded-lg p-5 space-y-4 shadow-sm">
        <label className="block text-sm font-medium text-gray-700">
          Upload CSV File
        </label>

        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          className="block w-full border border-gray-300 rounded-lg p-2"
        />

        <button
          onClick={onUpload}
          disabled={busy}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <CloudArrowUpIcon className="h-5 w-5" />
          {busy ? "Uploading..." : "Start Upload"}
        </button>

        {error && (
          <div className="text-red-600 text-sm font-medium">{error}</div>
        )}
      </div>

      {result && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {[
            ["Total Rows", result.summary?.totalRows],
            ["Inserted", result.summary?.insertedPOs],
            ["Overwritten", result.summary?.overwrittenPOs],
            ["Skipped", result.summary?.skippedPOs],
            ["Existing POs", result.summary?.existingPOs],
            ["Vendors Added", result.summary?.vendorAutoCreated?.count],
            ["Parts Added", result.summary?.partAutoCreated?.count],
          ].map(([label, value], i) => (
            <div key={i} className="bg-gray-50 border border-gray-200 p-3 rounded-lg text-center">
              <div className="font-semibold text-gray-900">{value ?? 0}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
