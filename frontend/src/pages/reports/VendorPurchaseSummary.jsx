import { useEffect, useMemo, useRef, useState } from "react";
import { apiRaw as api, fetchPurchaseOrdersReport } from "../../utils/api";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

// AG Grid
import { ModuleRegistry } from "ag-grid-community";
import { AllCommunityModule } from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

// Exports
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// Vendor modal
import VendorDetail from "../vendors/VendorDetails.jsx";

export default function VendorPurchaseSummary() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const gridRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await fetchPurchaseOrdersReport({});
      setRows(data);
    } finally {
      setLoading(false);
    }
  }

  // Filter and group
  const filtered = rows.filter((r) => {
    const orderDate = r.order_date ? new Date(r.order_date) : null;
    return (
      (!fromDate || (orderDate && orderDate >= new Date(fromDate))) &&
      (!toDate || (orderDate && orderDate <= new Date(toDate)))
    );
  });

  const summaryMap = {};
  filtered.forEach((po) => {
    const v = po.vendor_name || "Unknown Vendor";
    const id = po.vendor_id || v;
    if (!summaryMap[id]) {
      summaryMap[id] = { vendor_id: po.vendor_id, vendor_name: v, total_spend: 0, po_count: 0, last_po_date: null };
    }
    summaryMap[id].total_spend += Number(po.total_amount || 0);
    summaryMap[id].po_count += 1;
    if (!summaryMap[id].last_po_date || new Date(po.order_date) > new Date(summaryMap[id].last_po_date)) {
      summaryMap[id].last_po_date = po.order_date;
    }
  });

  const data = Object.values(summaryMap)
    .filter((r) => r.vendor_name.toLowerCase().includes(search.toLowerCase()))
    .map((r) => ({
      ...r,
      avg_order: r.po_count > 0 ? r.total_spend / r.po_count : 0,
    }))
    .sort((a, b) => b.total_spend - a.total_spend);

  // Fetch vendor details when clicked
  async function openVendorModal(vendor) {
    try {
      const id = vendor.vendor_id;
      if (!id) return setSelectedVendor(vendor);
      const res = await api.get(`/vendors/${id}`);
      const fullVendor = res.data?.data || res.data || vendor;
      setSelectedVendor(fullVendor);
    } catch (err) {
      console.error("Vendor fetch failed:", err);
      setSelectedVendor(vendor);
    }
  }

  // Grid columns
  const columns = useMemo(
    () => [
      {
        headerName: "Vendor",
        field: "vendor_name",
        flex: 1.5,
        cellRenderer: (params) => (
          <span
            className="text-blue-600 underline cursor-pointer font-medium"
            onClick={() => openVendorModal(params.data)}
            title={`View ${params.value}`}
          >
            {params.value}
          </span>
        ),
      },
      { headerName: "#POs", field: "po_count", width: 100 },
      {
        headerName: "Total Spend",
        field: "total_spend",
        width: 160,
        valueFormatter: (p) =>
          new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(p.value || 0),
      },
      {
        headerName: "Avg Order Value",
        field: "avg_order",
        width: 160,
        valueFormatter: (p) =>
          new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(p.value || 0),
      },
      {
        headerName: "Last PO Date",
        field: "last_po_date",
        width: 140,
        valueFormatter: (p) =>
          p.value ? format(new Date(p.value), "yyyy-MM-dd") : "—",
      },
    ],
    []
  );

  // Exports
  const exportCSV = () => gridRef.current?.api?.exportDataAsCsv({ fileName: "vendor_summary.csv" });

  const exportXLSX = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendor Summary");
    XLSX.writeFile(wb, "vendor_summary.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.text("Vendor Purchase Summary", 14, 10);
    autoTable(doc, {
      startY: 14,
      head: [["Vendor", "#POs", "Total Spend", "Avg Order Value", "Last PO Date"]],
      body: data.map((r) => [
        r.vendor_name,
        r.po_count,
        "$" + Number(r.total_spend).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        "$" + Number(r.avg_order).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        r.last_po_date ? format(new Date(r.last_po_date), "yyyy-MM-dd") : "—",
      ]),
      styles: { fontSize: 8 },
    });
    doc.save("vendor_summary.pdf");
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">

        <style>{`
          .ag-theme-quartz { --ag-font-size: 13px; --ag-row-height: 36px; }
          .ag-theme-quartz .ag-header-cell-text { font-weight: 700 !important; }
          .ag-theme-quartz .ag-cell { display: flex; align-items: center; padding: 0 8px; }
        `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Vendor Purchase Summary
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Summarized purchase totals by vendor
          </p>
        </div>
        <button
          onClick={() => navigate("/reports")}
          className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
        >
          ← Back to Reports
        </button>
      </div>

      {/* Filters + Export toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4 mb-5 flex flex-wrap xl:flex-nowrap items-center gap-3">
        <input
          type="text"
          placeholder="Search vendor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg bg-white shadow-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors w-full md:w-56 xl:w-60"
        />
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="border border-gray-300 rounded-lg bg-white shadow-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-sm w-full md:w-40"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="border border-gray-300 rounded-lg bg-white shadow-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-sm w-full md:w-40"
        />

        <div className="flex gap-2 shrink-0">
          <button onClick={exportCSV} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors">
            Export CSV
          </button>
          <button onClick={exportXLSX} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors">
            Export XLSX
          </button>
          <button onClick={exportPDF} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors">
            Export PDF
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="ag-theme-quartz bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-5" style={{ width: "100%" }}>
        <AgGridReact
          ref={gridRef}
          rowData={data}
          columnDefs={columns}
          defaultColDef={{ resizable: true, minWidth: 90, unSortIcon: true }}
          domLayout="autoHeight"
          animateRows
        />
      </div>

      {/* Vendor Modal */}
      {selectedVendor && (
        <VendorDetail
          vendor={selectedVendor}
          onClose={() => setSelectedVendor(null)}
        />
      )}
    </div>
  );
}
