import { useState } from "react";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeaderCell, TableRow,
  TextInput, DateRangePicker
} from "@tremor/react";
import { useNavigate } from "react-router-dom";

export default function StockMovementReport() {
  const navigate = useNavigate();

  // Placeholder data
  const [data] = useState([
    { id: 1, part: "Motor Assembly", change: -3, type: "Usage", date: "2025-01-14", ref: "WO-221" },
    { id: 2, part: "Label Sensor", change: +10, type: "Purchase", date: "2025-01-10", ref: "PO-102" },
  ]);

  const [search, setSearch] = useState("");

  const filteredData = data.filter((row) =>
    row.part.toLowerCase().includes(search.toLowerCase()) ||
    row.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 lg:p-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Stock Movement Log
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Track incoming & outgoing inventory transactions
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4 mb-5 flex flex-wrap gap-3 md:gap-4 items-center">
        <TextInput
          placeholder="Search part or movement type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-64"
        />

        <DateRangePicker className="w-full md:w-72" />

        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors">
          Export CSV
        </button>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors">
          Export PDF
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4">
        <style>{`
          .tremor-Table-table { width: 100%; font-size: 13px; }
          .tremor-Table-root th, .tremor-Table-root .tremor-TableHeaderCell-root { height: 36px !important; padding: 0 12px !important; font-size: 13px !important; font-weight: 700 !important; line-height: 36px !important; color: #111827 !important; background-color: #f9fafb !important; border-bottom: 1px solid #d1d5db !important; border-right: 1px solid #e5e7eb !important; vertical-align: middle !important; }
          .tremor-Table-root th:last-child, .tremor-Table-root .tremor-TableHeaderCell-root:last-child { border-right: 0 !important; }
          .tremor-Table-root td, .tremor-Table-root .tremor-TableCell-root { height: 36px !important; padding: 0 12px !important; font-size: 13px !important; line-height: 36px !important; border-bottom: 1px solid #e5e7eb !important; border-right: 1px solid #f3f4f6 !important; vertical-align: middle !important; }
          .tremor-Table-root td:last-child, .tremor-Table-root .tremor-TableCell-root:last-child { border-right: 0 !important; }
          .tremor-Table-root tr { height: 36px; }
        `}</style>
        <Table className="w-full text-sm">
          <TableHead>
            <TableRow>
              <TableHeaderCell className="text-left font-bold text-gray-700 align-middle">Part</TableHeaderCell>
              <TableHeaderCell className="text-right font-bold text-gray-700 align-middle">Change</TableHeaderCell>
              <TableHeaderCell className="text-left font-bold text-gray-700 align-middle">Type</TableHeaderCell>
              <TableHeaderCell className="text-center font-bold text-gray-700 align-middle">Date</TableHeaderCell>
              <TableHeaderCell className="text-left font-bold text-gray-700 align-middle">Reference</TableHeaderCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredData.map((row) => (
              <TableRow key={row.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                <TableCell className="text-gray-700 align-middle">{row.part}</TableCell>
                <TableCell className={`${row.change < 0 ? "text-red-600 font-bold" : "text-green-600 font-bold"} text-right align-middle`}>
                  {row.change}
                </TableCell>
                <TableCell className="text-gray-700 align-middle">{row.type}</TableCell>
                <TableCell className="text-gray-700 align-middle text-center">{row.date}</TableCell>
                <TableCell className="font-medium text-gray-700 align-middle">{row.ref}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
