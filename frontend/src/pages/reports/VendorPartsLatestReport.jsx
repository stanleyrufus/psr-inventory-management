import React, { useEffect, useState } from "react";
import { fetchVendors, fetchVendorPartsLatestReport } from "../../utils/api";
import { useNavigate } from "react-router-dom";

export default function VendorPartsLatestReport() {
  const [vendors, setVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadVendors = async () => {
      try {
        const data = await fetchVendors();
        setVendors(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("❌ Failed to load vendors:", err);
        setVendors([]);
      }
    };

    loadVendors();
  }, []);

  const runReport = async () => {
    try {
      setLoading(true);
      const data = await fetchVendorPartsLatestReport(
        selectedVendorId ? { vendor_id: selectedVendorId } : {}
      );
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Failed to load vendor parts latest report:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runReport();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/reports")}
          className="px-3 py-1.5 text-sm rounded bg-gray-200 hover:bg-gray-300"
        >
          ← Back to Reports
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-800">Vendor Parts Latest Report</h1>
        <p className="text-gray-600">
          Shows the latest purchased part details for each vendor.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vendor
          </label>
          <select
            value={selectedVendorId}
            onChange={(e) => setSelectedVendorId(e.target.value)}
            className="border rounded px-3 py-2 min-w-[260px]"
          >
            <option value="">All Vendors</option>
            {vendors.map((v) => (
              <option key={v.vendor_id} value={v.vendor_id}>
                {v.vendor_name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={runReport}
          disabled={loading}
          className={`px-4 py-2 rounded text-white ${
            loading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Loading..." : "Run Report"}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">No report data found.</p>
        ) : (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Vendor</th>
                <th className="p-2 text-left">Part #</th>
                <th className="p-2 text-left">Part Name</th>
                <th className="p-2 text-left">Latest PO #</th>
                <th className="p-2 text-left">Order Date</th>
                <th className="p-2 text-left">Qty</th>
                <th className="p-2 text-left">Unit Price</th>
                <th className="p-2 text-left">Total</th>
                <th className="p-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={`${row.vendor_id}-${row.part_id}-${idx}`} className="border-t">
                  <td className="p-2">{row.vendor_name || "—"}</td>
                  <td className="p-2">{row.part_number || "—"}</td>
                  <td className="p-2">{row.part_name || "—"}</td>
                  <td className="p-2">{row.psr_po_number || "—"}</td>
                  <td className="p-2">
                    {row.order_date ? new Date(row.order_date).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-2">{row.quantity || "—"}</td>
                  <td className="p-2">{row.unit_price || "—"}</td>
                  <td className="p-2">{row.total_price || "—"}</td>
                  <td className="p-2">{row.status || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}