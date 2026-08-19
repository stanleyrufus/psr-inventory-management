import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRaw as api } from "../../utils/api";

// View Part Modal
import PartDetail from "../../components/PartDetail";

// AG Grid
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

// PDF Export libs
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function LowStockReport() {
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(50);

  const [editId, setEditId] = useState(null);
  const [editValue, setEditValue] = useState("");

  const [viewPart, setViewPart] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = async () => {
    try {
      const res = await api.get("/parts/low-stock");
      setData(res.data?.data || []);
    } catch (err) {
      console.error("Low stock fetch error:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveMinLevel = async (id) => {
    try {
      await api.put(`/parts/min-level/${id}`, {
        minimum_stock_level: Number(editValue),
      });
      setEditId(null);
      setEditValue("");
      fetchData();
    } catch (err) {
      console.error("Error saving min level:", err);
    }
  };

  // Search Filter
  const filteredData = data.filter((r) =>
    (r.part_number || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.part_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.description || "").toLowerCase().includes(search.toLowerCase())
  );

  // Manual pagination
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;

  const paginatedRows = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const goToPage = (p) =>
    p >= 1 && p <= totalPages && setCurrentPage(p);

  // Export CSV
  const exportCSV = () => {
    const headers = [
      "Part Number",
      "Part Name",
      "Description",
      "Qty",
      "Min Level",
      "Vendor",
    ];
    const rows = filteredData.map((r) => [
      r.part_number,
      r.part_name,
      r.description,
      r.quantity_on_hand,
      r.minimum_stock_level,
      r.last_vendor_name,
    ]);

    let csv =
      headers.join(",") + "\n" + rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "low_stock_report.csv";
    link.click();
  };

  // Export PDF
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.text("Low Stock Report", 14, 10);

    autoTable(doc, {
      startY: 14,
      head: [
        ["Part Number", "Part Name", "Description", "Qty", "Min Level", "Vendor"],
      ],
      body: filteredData.map((r) => [
        r.part_number,
        r.part_name,
        r.description,
        r.quantity_on_hand,
        r.minimum_stock_level,
        r.last_vendor_name,
      ]),
      styles: { fontSize: 8 },
    });

    doc.save("low_stock_report.pdf");
  };

  // AG Grid Columns
  const columns = [
    {
      headerName: "Part #",
      field: "part_number",
      width: 150,
      cellRenderer: (params) => {
        const pn = params.value || "—";
        return (
          <span
            style={{ color: "#2563eb", cursor: "pointer", fontWeight: 600 }}
            onClick={() => setViewPart(params.data)}
            title={`View ${pn}`}
          >
            {pn}
          </span>
        );
      },
    },

    {
      headerName: "Part Name",
      field: "part_name",
      width: 210,
      cellRenderer: (params) => (
        <span title={params.value}>{params.value || "—"}</span>
      ),
    },

    {
      headerName: "Description",
      field: "description",
      minWidth: 260,
      flex: 1.5,
      cellRenderer: (params) => {
        const text = params.value || "—";
        return (
          <span
            title={text}
            style={{
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              overflow: "hidden",
              display: "inline-block",
              maxWidth: "100%",
            }}
          >
            {text}
          </span>
        );
      },
    },

    {
      headerName: "Qty",
      field: "quantity_on_hand",
      width: 90,
      cellClass: "text-red-600 font-bold text-center",
    },

    {
      headerName: "Min Level",
      field: "minimum_stock_level",
      width: 120,
      cellRenderer: (params) => {
        if (editId === params.data.part_id) {
          return (
            <div className="flex gap-1 items-center">
              <input
                className="border rounded w-16 px-1"
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
              />
              <button
                className="text-blue-600"
                onClick={() => saveMinLevel(params.data.part_id)}
              >
                Save
              </button>
              <button
                className="text-red-600"
                onClick={() => setEditId(null)}
              >
                X
              </button>
            </div>
          );
        }
        return (
          <div className="flex gap-2 items-center">
            {params.value}
            <button
              className="text-blue-600 text-sm underline"
              onClick={() => {
                setEditId(params.data.part_id);
                setEditValue(params.value);
              }}
            >
              Set
            </button>
          </div>
        );
      },
    },

    {
      headerName: "Vendor",
      field: "last_vendor_name",
      width: 160,
      cellRenderer: (params) => (
        <span title={params.value}>{params.value || "—"}</span>
      ),
    },
  ];

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
            Low Stock Report
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Parts below minimum stock level
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
        <input
          type="text"
          placeholder="Search part # / name / description…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="border border-gray-300 rounded-lg bg-white shadow-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors w-full md:w-64 lg:w-72"
        />

        <button onClick={exportCSV} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors">
          Export CSV
        </button>
        <button onClick={exportPDF} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors">
          Export PDF
        </button>

        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setCurrentPage(1);
          }}
          className="border border-gray-300 rounded-lg bg-white shadow-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
        >
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              Show {n} per page
            </option>
          ))}
        </select>
      </div>

      {/* AG Grid */}
      <div className="ag-theme-quartz bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-5" style={{ width: "100%" }}>
        <AgGridReact
          rowData={paginatedRows}
          columnDefs={columns}
          defaultColDef={{ resizable: true, minWidth: 90, unSortIcon: true }}
          domLayout="autoHeight"
          animateRows={true}
        />
      </div>

      {/* Manual Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-4 text-sm">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Prev
          </button>

          <span>
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Part Detail Modal */}
      {viewPart && (
        <PartDetail part={viewPart} onClose={() => setViewPart(null)} />
      )}
    </div>
  );
}
