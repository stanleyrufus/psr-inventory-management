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
        console.error("Failed to load vendors:", err);
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
      console.error("Failed to load vendor parts latest report:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runReport();
  }, []);

  return (
    <div className="p-4 md:p-6 lg:p-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Vendor Parts Latest Report
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Shows the latest purchased part details for each vendor.
          </p>
        </div>
        <button
          onClick={() => navigate("/reports")}
          className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
        >
          ← Back to Reports
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4 mb-5 flex flex-wrap gap-3 md:gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vendor
          </label>
          <select
            value={selectedVendorId}
            onChange={(e) => setSelectedVendorId(e.target.value)}
            className="border border-gray-300 rounded-lg bg-white shadow-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors min-w-[260px]"
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
          className={`px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors ${
            loading
              ? "bg-blue-400 text-white cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {loading ? "Loading..." : "Run Report"}
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-5">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No report data found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-[13px] border-collapse border border-gray-300">
              <colgroup>
                <col style={{ width: "12%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "21%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "12%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="h-9 px-3 py-0 text-left text-[13px] font-bold text-gray-900 align-middle leading-none whitespace-nowrap border-b border-gray-300 border-r border-gray-200 last:border-r-0">Vendor</th>
                  <th className="h-9 px-3 py-0 text-left text-[13px] font-bold text-gray-900 align-middle leading-none whitespace-nowrap border-b border-gray-300 border-r border-gray-200 last:border-r-0">Part #</th>
                  <th className="h-9 px-3 py-0 text-left text-[13px] font-bold text-gray-900 align-middle leading-none whitespace-nowrap border-b border-gray-300 border-r border-gray-200 last:border-r-0">Part Name</th>
                  <th className="h-9 px-3 py-0 text-left text-[13px] font-bold text-gray-900 align-middle leading-none whitespace-nowrap border-b border-gray-300 border-r border-gray-200 last:border-r-0">Latest PO #</th>
                  <th className="h-9 px-3 py-0 text-left text-[13px] font-bold text-gray-900 align-middle leading-none whitespace-nowrap border-b border-gray-300 border-r border-gray-200 last:border-r-0">Order Date</th>
                  <th className="h-9 px-3 py-0 text-right text-[13px] font-bold text-gray-900 align-middle leading-none whitespace-nowrap border-b border-gray-300 border-r border-gray-200 last:border-r-0">Qty</th>
                  <th className="h-9 px-3 py-0 text-right text-[13px] font-bold text-gray-900 align-middle leading-none whitespace-nowrap border-b border-gray-300 border-r border-gray-200 last:border-r-0">Unit Price</th>
                  <th className="h-9 px-3 py-0 text-right text-[13px] font-bold text-gray-900 align-middle leading-none whitespace-nowrap border-b border-gray-300 border-r border-gray-200 last:border-r-0">Total</th>
                  <th className="h-9 px-3 py-0 text-left text-[13px] font-bold text-gray-900 align-middle leading-none whitespace-nowrap border-b border-gray-300 border-r border-gray-200 last:border-r-0">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={`${row.vendor_id}-${row.part_id}-${idx}`}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="h-9 px-3 py-0 text-[13px] text-gray-800 align-middle leading-none border-b border-gray-200 border-r border-gray-100 last:border-r-0 truncate" title={row.vendor_name || undefined}>{row.vendor_name || "—"}</td>
                    <td className="h-9 px-3 py-0 text-[13px] text-gray-800 align-middle leading-none border-b border-gray-200 border-r border-gray-100 last:border-r-0 truncate" title={row.part_number || undefined}>{row.part_number || "—"}</td>
                    <td className="h-9 px-3 py-0 text-[13px] text-gray-800 align-middle leading-none border-b border-gray-200 border-r border-gray-100 last:border-r-0 truncate" title={row.part_name || undefined}>{row.part_name || "—"}</td>
                    <td className="h-9 px-3 py-0 text-[13px] text-gray-800 align-middle leading-none border-b border-gray-200 border-r border-gray-100 last:border-r-0 truncate" title={row.psr_po_number || undefined}>{row.psr_po_number || "—"}</td>
                    <td className="h-9 px-3 py-0 text-[13px] text-gray-800 align-middle leading-none border-b border-gray-200 border-r border-gray-100 last:border-r-0 whitespace-nowrap">
                      {row.order_date ? new Date(row.order_date).toLocaleDateString() : "—"}
                    </td>
                    <td className="h-9 px-3 py-0 text-[13px] text-gray-800 align-middle leading-none border-b border-gray-200 border-r border-gray-100 last:border-r-0 text-right whitespace-nowrap">{row.quantity ?? "—"}</td>
                    <td className="h-9 px-3 py-0 text-[13px] text-gray-800 align-middle leading-none border-b border-gray-200 border-r border-gray-100 last:border-r-0 text-right whitespace-nowrap">{row.unit_price ? `$${Number(row.unit_price).toFixed(2)}` : "—"}</td>
                    <td className="h-9 px-3 py-0 text-[13px] text-gray-800 align-middle leading-none border-b border-gray-200 border-r border-gray-100 last:border-r-0 text-right font-medium whitespace-nowrap">{row.total_price ? `$${Number(row.total_price).toFixed(2)}` : "—"}</td>
                    <td className="h-9 px-3 py-0 text-[13px] text-gray-800 align-middle leading-none border-b border-gray-200 border-r border-gray-100 last:border-r-0 text-center whitespace-nowrap">
                      {row.status ? (
                        <span
                          className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium leading-tight whitespace-nowrap ${
                            row.status.toLowerCase().includes("received") ? "bg-green-50 text-green-700" :
                            row.status.toLowerCase().includes("pending") ? "bg-yellow-50 text-yellow-700" :
                            row.status.toLowerCase().includes("cancelled") ? "bg-red-50 text-red-700" :
                            "bg-gray-50 text-gray-700"
                          }`}
                          title={row.status}
                        >{row.status}</span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
