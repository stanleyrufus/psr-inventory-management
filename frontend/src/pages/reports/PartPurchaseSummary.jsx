import { useEffect, useMemo, useRef, useState } from "react";
import { apiRaw as api, fetchPurchaseOrdersReport } from "../../utils/api";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

import { ModuleRegistry } from "ag-grid-community";
import { AllCommunityModule } from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// Part Detail Modal
import PartDetail from "../../components/PartDetail";

export default function PartPurchaseSummary() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rows, setRows] = useState([]);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const gridRef = useRef(null);

  /* ---------------------- Load data once on mount ---------------------- */
  useEffect(() => {
    loadPurchaseOrders();
    preloadParts();
  }, []);

  async function loadPurchaseOrders() {
    setLoading(true);
    try {
      const data = await fetchPurchaseOrdersReport({});
      setRows(data);
    } finally {
      setLoading(false);
    }
  }

  async function preloadParts() {
    try {
      const res = await api.get("/parts");
      setParts(res.data?.data || []);
    } catch (err) {
      console.error("Error preloading parts:", err);
    }
  }

  /* ---------------------- Filter & summarize ---------------------- */
  const filtered = rows.filter((r) => {
    const orderDate = r.order_date ? new Date(r.order_date) : null;
    return (
      (!fromDate || (orderDate && orderDate >= new Date(fromDate))) &&
      (!toDate || (orderDate && orderDate <= new Date(toDate)))
    );
  });

  const partMap = {};
  filtered.forEach((po) => {
    (po.items || []).forEach((item) => {
      const key = item.part_number || item.part_name || "Unknown";
      if (!partMap[key]) {
        partMap[key] = {
          part_id: item.part_id,
          part_number: item.part_number,
          part_name: item.part_name,
          total_qty: 0,
          total_spend: 0,
          po_count: 0,
          last_purchase: null,
        };
      }
      partMap[key].total_qty += Number(item.quantity || 0);
      partMap[key].total_spend += Number(item.line_total || 0);
      partMap[key].po_count += 1;
      if (
        !partMap[key].last_purchase ||
        new Date(po.order_date) > new Date(partMap[key].last_purchase)
      ) {
        partMap[key].last_purchase = po.order_date;
      }
    });
  });

  const data = Object.values(partMap)
    .filter(
      (r) =>
        (r.part_number || "").toLowerCase().includes(search.toLowerCase()) ||
        (r.part_name || "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => b.total_spend - a.total_spend);

  /* ---------------------- Modal: open instantly with cache ---------------------- */
  function openPartModal(part) {
  const normalize = (v) => (v ? v.toString().trim().toLowerCase() : "");
  const match = parts.find(
    (p) => normalize(p.part_number) === normalize(part.part_number)
  );
  setSelectedPart(match || part);
}


  /* ---------------------- AG Grid ---------------------- */
  const columns = useMemo(
    () => [
      {
        headerName: "Part #",
        field: "part_number",
        width: 160,
        cellRenderer: (params) => (
          <span
            className="text-blue-600 underline cursor-pointer font-medium"
            onClick={() => openPartModal(params.data)}
            title={`View ${params.value}`}
          >
            {params.value}
          </span>
        ),
      },
      { headerName: "Part Name", field: "part_name", flex: 1.2 },
      { headerName: "#POs", field: "po_count", width: 100 },
      { headerName: "Total Qty", field: "total_qty", width: 120 },
      {
        headerName: "Total Spend",
        field: "total_spend",
        width: 160,
        valueFormatter: (p) =>
          new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(p.value || 0),
      },
      {
        headerName: "Last Purchase Date",
        field: "last_purchase",
        width: 160,
        valueFormatter: (p) =>
          p.value ? format(new Date(p.value), "yyyy-MM-dd") : "—",
      },
    ],
    []
  );

  /* ---------------------- Exports ---------------------- */
  const exportCSV = () =>
    gridRef.current?.api?.exportDataAsCsv({ fileName: "part_summary.csv" });

  const exportXLSX = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Part Summary");
    XLSX.writeFile(wb, "part_summary.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.text("Part Purchase Summary", 14, 10);
    autoTable(doc, {
      startY: 14,
      head: [
        [
          "Part #",
          "Part Name",
          "#POs",
          "Total Qty",
          "Total Spend",
          "Last Purchase Date",
        ],
      ],
      body: data.map((r) => [
        r.part_number,
        r.part_name,
        r.po_count,
        r.total_qty,
        "$" + Number(r.total_spend).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        r.last_purchase ? format(new Date(r.last_purchase), "yyyy-MM-dd") : "—",
      ]),
      styles: { fontSize: 8 },
    });
    doc.save("part_summary.pdf");
  };

  /* ---------------------- Render ---------------------- */
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
            Part Purchase Summary
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Summarized purchase totals by part
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4 mb-5 flex flex-wrap gap-3 md:gap-4 items-center">
        <input
          type="text"
          placeholder="Search part # / name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg bg-white shadow-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors w-full md:w-56"
        />
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="border border-gray-300 rounded-lg bg-white shadow-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-sm"
        />
        <span className="text-gray-500 text-sm">to</span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="border border-gray-300 rounded-lg bg-white shadow-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-sm"
        />

        <div className="flex items-center gap-2 ml-auto">
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
          pagination={true}
          paginationPageSize={100}
          rowBuffer={50}
        />
      </div>

      {/* Part Detail Modal */}
      {selectedPart && (
        <PartDetail part={selectedPart} onClose={() => setSelectedPart(null)} />
      )}
    </div>
  );
}
