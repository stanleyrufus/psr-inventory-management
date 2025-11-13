import { useEffect, useMemo, useRef, useState } from "react";
import { Title, Card, Button, TextInput } from "@tremor/react";
import { apiRaw as api, fetchPurchaseOrdersReport } from "../../utils/api";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

// ✅ AG Grid
import { ModuleRegistry } from "ag-grid-community";
import { AllCommunityModule } from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

// ✅ Exports
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// ✅ Vendor modal
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

  // ✅ Filter and group
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

  // ✅ Fetch vendor details when clicked
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

  // ✅ Grid columns
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

  const gridStyle = {
    width: "100%",
    "--ag-font-size": "13px",
    "--ag-row-height": "34px",
  };

  // ✅ Exports
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
        `$${r.total_spend.toFixed(2)}`,
        `$${r.avg_order.toFixed(2)}`,
        r.last_po_date ? format(new Date(r.last_po_date), "yyyy-MM-dd") : "—",
      ]),
      styles: { fontSize: 8 },
    });
    doc.save("vendor_summary.pdf");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Title className="text-2xl font-bold">Vendor Purchase Summary</Title>
          <p className="text-gray-600 text-sm">Summarized purchase totals by vendor</p>
        </div>
        <Button variant="secondary" onClick={() => navigate("/reports")}>← Back to Reports</Button>
      </div>

      {/* Filters + Export toolbar (compact, single line) */}
<Card className="p-4">
  <div className="flex items-center justify-between gap-3 w-full">
    {/* Left side: filters */}
    <div className="flex items-center gap-2">
      <TextInput
        placeholder="Search vendor..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-56 text-sm"
      />
      <input
        type="date"
        value={fromDate}
        onChange={(e) => setFromDate(e.target.value)}
        className="border rounded px-2 py-1 text-sm w-36"
      />
      <span className="text-gray-600 text-sm">to</span>
      <input
        type="date"
        value={toDate}
        onChange={(e) => setToDate(e.target.value)}
        className="border rounded px-2 py-1 text-sm w-36"
      />
    </div>

    {/* Right side: export buttons */}
    <div className="flex items-center gap-2">
      <Button variant="secondary" onClick={exportCSV}>Export CSV</Button>
      <Button variant="secondary" onClick={exportXLSX}>Export XLSX</Button>
      <Button variant="secondary" onClick={exportPDF}>Export PDF</Button>
    </div>
  </div>
</Card>


      {/* Grid */}
      <Card className="p-0">
        <div className="ag-theme-alpine" style={gridStyle}>
          <AgGridReact
theme="legacy"

            ref={gridRef}
            rowData={data}
            columnDefs={columns}
            defaultColDef={{ resizable: true }}
            domLayout="autoHeight"
            animateRows
          />
        </div>
      </Card>

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
