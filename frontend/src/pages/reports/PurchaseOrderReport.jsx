import { useEffect, useMemo, useRef, useState } from "react";
import { Title, Card, Button, TextInput, Badge } from "@tremor/react";
import { apiRaw as api, fetchPurchaseOrdersReport } from "../../utils/api";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

// ✅ AG Grid (Alpine theme like Low Stock)
import { ModuleRegistry } from "ag-grid-community";
import { AllCommunityModule } from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);

import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const STATUS_OPTIONS = ["Open", "Partially Received", "Completed", "Cancelled"];

export default function PurchaseOrderReport() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [status, setStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [vendors, setVendors] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const gridRef = useRef(null);

  useEffect(() => {
    (async () => {
      const r = await api.get("/vendors");
      const data = Array.isArray(r.data) ? r.data : r.data?.data || [];
      setVendors(data);
    })();
    loadInitialData();
  }, []);

  async function loadInitialData() {
    setLoading(true);
    try {
      const data = await fetchPurchaseOrdersReport({});
      setRows(data);
    } finally {
      setLoading(false);
    }
  }

  const currency = (v) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(Number(v || 0));

  const [drawer, setDrawer] = useState({ open: false, po: null });
  const isRowMaster = (d) => Array.isArray(d.items) && d.items.length > 0;

  // ✅ Columns
  const columnDefs = useMemo(
    () => [
      {
        headerName: "PO #",
        field: "po_number",
        width: 180,
        cellRenderer: (p) => (
          <div className="flex items-center gap-2">
            {isRowMaster(p.data) && (
              <button
                className="text-blue-600 font-bold"
                onClick={(e) => {
                  e.preventDefault();
                  p.node.setExpanded(!p.node.expanded);
                }}
                title={p.node.expanded ? "Collapse" : "Expand"}
              >
                {p.node.expanded ? "−" : "+"}
              </button>
            )}
            <span
              style={{ color: "#2563eb", cursor: "pointer", fontWeight: 600 }}
              onClick={() => setDrawer({ open: true, po: p.data })}
              title={`View PO ${p.value}`}
            >
              {p.value}
            </span>
          </div>
        ),
      },
      { headerName: "Vendor", field: "vendor_name", width: 200 },
      {
        headerName: "Order Date",
        field: "order_date",
        width: 120,
        valueFormatter: (p) =>
          p.value ? format(new Date(p.value), "yyyy-MM-dd") : "—",
      },
      {
        headerName: "Expected",
        field: "expected_date",
        width: 120,
        valueFormatter: (p) =>
          p.value ? format(new Date(p.value), "yyyy-MM-dd") : "—",
      },
      {
        headerName: "Status",
        field: "status",
        width: 130,
        cellRenderer: (p) => {
          const color =
            p.value === "Completed"
              ? "green"
              : p.value === "Open"
              ? "blue"
              : p.value === "Partially Received"
              ? "orange"
              : "rose";
          return <Badge color={color}>{p.value}</Badge>;
        },
      },
      {
        headerName: "Total",
        field: "total_amount",
        width: 120,
        type: "rightAligned",
        valueFormatter: (p) => currency(p.value),
      },
      {
        headerName: "Notes",
        field: "notes",
        flex: 1.4,
        tooltipField: "notes",
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
    ],
    []
  );

  // ✅ Master/Detail config
  const detailCellRendererParams = useMemo(
    () => ({
      detailGridOptions: {
        columnDefs: [
          { headerName: "Part #", field: "part_number", width: 140 },
          { headerName: "Part Name", field: "part_name", width: 200 },
          {
            headerName: "Description",
            field: "description",
            flex: 1.5,
            tooltipField: "description",
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
          { headerName: "Qty", field: "quantity", width: 80, type: "rightAligned" },
          {
            headerName: "Unit Price",
            field: "unit_price",
            width: 100,
            type: "rightAligned",
            valueFormatter: (p) => currency(p.value),
          },
          {
            headerName: "Line Total",
            field: "line_total",
            width: 120,
            type: "rightAligned",
            valueFormatter: (p) => currency(p.value),
          },
        ],
        defaultColDef: { resizable: true },
      },
      getDetailRowData: (params) => {
        params.successCallback(params.data.items || []);
      },
    }),
    []
  );

  // ✅ Combined client-side filters
  const filteredRows = rows.filter((r) => {
    const orderDate = r.order_date ? new Date(r.order_date) : null;
    const matchesSearch =
      (r.po_number || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.vendor_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.notes || "").toLowerCase().includes(search.toLowerCase());

    const matchesVendor = !vendorId || r.vendor_id === Number(vendorId);
    const matchesStatus = !status || r.status === status;

    const matchesDate =
      (!fromDate || (orderDate && orderDate >= new Date(fromDate))) &&
      (!toDate || (orderDate && orderDate <= new Date(toDate)));

    return matchesSearch && matchesVendor && matchesStatus && matchesDate;
  });

  // ✅ Compact grid styling
  const gridStyle = {
    width: "100%",
    "--ag-font-size": "13px",
    "--ag-row-height": "30px",
    "--ag-line-height": "28px",
  };

  // ✅ Export CSV / XLSX / PDF
  const exportCSV = () => {
    gridRef.current?.api?.exportDataAsCsv({ fileName: "po_report.csv" });
  };

  const exportXLSX = () => {
    const api = gridRef.current?.api;
    if (!api) return;
    const rowsForExcel = [];
    api.forEachNodeAfterFilterAndSort((n) => {
      rowsForExcel.push({
        "PO #": n.data.po_number,
        Vendor: n.data.vendor_name,
        "Order Date": n.data.order_date
          ? format(new Date(n.data.order_date), "yyyy-MM-dd")
          : "",
        Expected: n.data.expected_date
          ? format(new Date(n.data.expected_date), "yyyy-MM-dd")
          : "",
        Status: n.data.status,
        Total: Number(n.data.total_amount || 0),
        Notes: n.data.notes || "",
      });
    });
    const ws = XLSX.utils.json_to_sheet(rowsForExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PO Report");
    XLSX.writeFile(wb, "po_report.xlsx");
  };

  const exportPDF = () => {
    const api = gridRef.current?.api;
    if (!api) return;
    const rowsForPdf = [];
    api.forEachNodeAfterFilterAndSort((n) => {
      rowsForPdf.push([
        n.data.po_number,
        n.data.vendor_name,
        n.data.order_date
          ? format(new Date(n.data.order_date), "yyyy-MM-dd")
          : "",
        n.data.expected_date
          ? format(new Date(n.data.expected_date), "yyyy-MM-dd")
          : "",
        n.data.status,
        currency(n.data.total_amount || 0),
      ]);
    });

    const doc = new jsPDF({ orientation: "landscape" });
    doc.text("Purchase Order Report", 14, 10);
    autoTable(doc, {
      startY: 14,
      head: [["PO #", "Vendor", "Order Date", "Expected", "Status", "Total"]],
      body: rowsForPdf,
      styles: { fontSize: 8 },
    });
    doc.save("po_report.pdf");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Title className="text-2xl font-bold">Purchase Order Report</Title>
          <p className="text-gray-600 text-sm">
            Analyze purchase history, filter, and export
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate("/reports")}>
          ← Back to Reports
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <TextInput
            placeholder="Search PO # / vendor / notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-72"
          />
          <select
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
            className="border rounded-md text-sm px-2 py-2 bg-white"
          >
            <option value="">All Vendors</option>
            {vendors.map((v) => (
              <option key={v.vendor_id} value={v.vendor_id}>
                {v.vendor_name}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border rounded-md text-sm px-2 py-2 bg-white"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border rounded px-2 py-2 text-sm"
          />
          <span className="text-gray-600 text-sm">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border rounded px-2 py-2 text-sm"
          />

          <div className="grow" />
          <Button variant="secondary" onClick={exportCSV}>
            Export CSV
          </Button>
          <Button variant="secondary" onClick={exportXLSX}>
            Export XLSX
          </Button>
          <Button variant="secondary" onClick={exportPDF}>
            Export PDF
          </Button>
        </div>
      </Card>

      {/* AG Grid */}
      <Card className="p-0">
        <div className="ag-theme-alpine" style={gridStyle}>
          <AgGridReact
theme="legacy"

            ref={gridRef}
            rowData={filteredRows}
            columnDefs={columnDefs}
            defaultColDef={{
              resizable: true,
              wrapText: false,
              autoHeight: false,
            }}
            animateRows
            masterDetail
            suppressMasterDetailAutoColumn={true}
            isRowMaster={isRowMaster}
            detailCellRendererParams={detailCellRendererParams}
            domLayout="autoHeight"
          />
        </div>
      </Card>

      {/* Drawer */}
      {drawer.open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setDrawer({ open: false, po: null })}
          />
          <div className="absolute right-0 top-0 h-full w-[520px] bg-white shadow-2xl p-5 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold">
                  PO #{drawer.po.po_number}
                </h2>
                <p className="text-sm text-gray-600">
                  {drawer.po.vendor_name}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => setDrawer({ open: false, po: null })}
              >
                Close
              </Button>
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <strong>Status:</strong> {drawer.po.status}
              </div>
              <div>
                <strong>Order Date:</strong>{" "}
                {drawer.po.order_date
                  ? format(new Date(drawer.po.order_date), "yyyy-MM-dd")
                  : "—"}
              </div>
              <div>
                <strong>Expected:</strong>{" "}
                {drawer.po.expected_date
                  ? format(new Date(drawer.po.expected_date), "yyyy-MM-dd")
                  : "—"}
              </div>
              <div>
                <strong>Total:</strong> {currency(drawer.po.total_amount)}
              </div>
              {drawer.po.notes && (
                <div>
                  <strong>Notes:</strong> {drawer.po.notes}
                </div>
              )}
            </div>

            <hr className="my-4" />

            <h3 className="font-semibold mb-2">Items</h3>
            <div className="border rounded">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Part #</th>
                    <th className="p-2 text-left">Part Name</th>
                    <th className="p-2 text-left">Description</th>
                    <th className="p-2 text-right">Qty</th>
                    <th className="p-2 text-right">Unit Price</th>
                    <th className="p-2 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(drawer.po.items || []).map((it) => (
                    <tr key={it.item_id} className="border-t">
                      <td className="p-2">{it.part_number || "—"}</td>
                      <td className="p-2">{it.part_name || "—"}</td>
                      <td className="p-2">{it.description || "—"}</td>
                      <td className="p-2 text-right">{it.quantity}</td>
                      <td className="p-2 text-right">
                        {currency(it.unit_price)}
                      </td>
                      <td className="p-2 text-right">
                        {currency(it.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
