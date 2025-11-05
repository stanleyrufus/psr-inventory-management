import { useEffect, useMemo, useRef, useState } from "react";
import { Title, Card, Button, TextInput, Badge } from "@tremor/react";
import { apiRaw as api, fetchPurchaseOrdersReport } from "../../utils/api";
import { format } from "date-fns";
import { DateRangePicker } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

// ✅ AG-Grid imports & module registration
import { ModuleRegistry } from "ag-grid-community";
import { AllCommunityModule } from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);

import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const STATUS_OPTIONS = ["Open", "Partially Received", "Completed", "Cancelled"];

export default function PurchaseOrderReport() {
  // Filters
  const [search, setSearch] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [status, setStatus] = useState("");
  const [dateOpen, setDateOpen] = useState(false);
  const [range, setRange] = useState([
    { startDate: null, endDate: null, key: "selection" },
  ]);

  // Data
  const [vendors, setVendors] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // AG Grid
  const gridRef = useRef(null);

  useEffect(() => {
    // Vendors drop-down
    (async () => {
      const r = await api.get("/vendors");
      const data = Array.isArray(r.data) ? r.data : r.data?.data || [];
      setVendors(data);
    })();
    // Initial fetch
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSearch() {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (vendorId) params.vendor_id = vendorId;
      if (status) params.status = status;
      if (range[0].startDate) params.from = format(range[0].startDate, "yyyy-MM-dd");
      if (range[0].endDate) params.to = format(range[0].endDate, "yyyy-MM-dd");

      const data = await fetchPurchaseOrdersReport(params);
      setRows(data);
    } finally {
      setLoading(false);
    }
  }

  function resetFilters() {
    setSearch("");
    setVendorId("");
    setStatus("");
    setRange([{ startDate: null, endDate: null, key: "selection" }]);
    setDateOpen(false);
    handleSearch();
  }

  const currency = (v) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(Number(v || 0));

  // Drawer state
  const [drawer, setDrawer] = useState({ open: false, po: null });

  // Helper: identify master rows
  const isRowMaster = (d) => Array.isArray(d.items) && d.items.length > 0;

  // Columns (expand button lives inside PO # cell)
  const columnDefs = useMemo(
    () => [
      {
        headerName: "PO #",
        field: "po_number",
        sortable: true,
        filter: true,
        width: 180,
        cellRenderer: (p) => (
          <div className="flex items-center gap-2">
            {isRowMaster(p.data) && (
              <Button
                size="xs"
                onClick={(e) => {
                  e.preventDefault();
                  p.node.setExpanded(!p.node.expanded);
                }}
              >
                {p.node.expanded ? "−" : "+"}
              </Button>
            )}
            <a
              className="text-blue-600 hover:underline"
              href={`/purchase-orders/${p.data.po_id}`}
              onClick={(e) => {
                e.preventDefault();
                setDrawer({ open: true, po: p.data });
              }}
            >
              {p.value}
            </a>
          </div>
        ),
      },
      { headerName: "Vendor", field: "vendor_name", sortable: true, filter: true, width: 220 },
      {
        headerName: "Order Date",
        field: "order_date",
        sortable: true,
        width: 130,
        valueFormatter: (p) => (p.value ? format(new Date(p.value), "yyyy-MM-dd") : "—"),
      },
      {
        headerName: "Expected",
        field: "expected_date",
        sortable: true,
        width: 130,
        valueFormatter: (p) => (p.value ? format(new Date(p.value), "yyyy-MM-dd") : "—"),
      },
      {
        headerName: "Status",
        field: "status",
        sortable: true,
        width: 160,
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
        sortable: true,
        width: 130,
        type: "rightAligned",
        valueFormatter: (p) => currency(p.value),
      },
      // Keep main grid tidy: no wrap/autoHeight. Full text in drawer/detail.
      { headerName: "Notes", field: "notes", flex: 1, cellClass: "truncate" },
    ],
    []
  );

  // Master/Detail config — show items grid
  const detailCellRendererParams = useMemo(
    () => ({
      detailGridOptions: {
        columnDefs: [
          { headerName: "Part #", field: "part_number", width: 160 },
          { headerName: "Part Name", field: "part_name", width: 220 },
          { headerName: "Description", field: "description", flex: 1, wrapText: true, autoHeight: true },
          { headerName: "Qty", field: "quantity", width: 100, type: "rightAligned" },
          {
            headerName: "Unit Price",
            field: "unit_price",
            width: 120,
            type: "rightAligned",
            valueFormatter: (p) => currency(p.value),
          },
          {
            headerName: "Line Total",
            field: "line_total",
            width: 130,
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

  // Exports
  const exportCSV = () => {
    gridRef.current?.api?.exportDataAsCsv({
      fileName: "po_report.csv",
      processCellCallback: (p) => {
        if (p.column.getColId() === "total_amount") return Number(p.value || 0).toFixed(2);
        return p.value ?? "";
      },
    });
  };

  const exportXLSX = () => {
    const api = gridRef.current?.api;
    if (!api) return;
    const rowsForExcel = [];
    api.forEachNodeAfterFilterAndSort((n) => {
      rowsForExcel.push({
        "PO #": n.data.po_number,
        Vendor: n.data.vendor_name,
        "Order Date": n.data.order_date ? format(new Date(n.data.order_date), "yyyy-MM-dd") : "",
        Expected: n.data.expected_date ? format(new Date(n.data.expected_date), "yyyy-MM-dd") : "",
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
        n.data.order_date ? format(new Date(n.data.order_date), "yyyy-MM-dd") : "",
        n.data.expected_date ? format(new Date(n.data.expected_date), "yyyy-MM-dd") : "",
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
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 60 },
        2: { cellWidth: 28 },
        3: { cellWidth: 28 },
        4: { cellWidth: 35 },
        5: { cellWidth: 28 },
      },
    });
    doc.save("po_report.pdf");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Title className="text-2xl font-bold">Purchase Order Report</Title>
          <p className="text-gray-600 text-sm">Analyze purchase history, filter, and export.</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <TextInput
            placeholder="Search PO # / vendor / notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-80"
          />

          {/* Vendor */}
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

          {/* Status */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border rounded-md text-sm px-2 py-2 bg-white"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Date range */}
          <div className="relative">
            <Button variant="secondary" onClick={() => setDateOpen((x) => !x)}>
              {range[0].startDate && range[0].endDate
                ? `${format(range[0].startDate, "yyyy-MM-dd")} → ${format(range[0].endDate, "yyyy-MM-dd")}`
                : "Date Range"}
            </Button>
            {dateOpen && (
              <div className="absolute z-50 mt-2 bg-white border rounded shadow">
                <DateRangePicker
                  onChange={(item) => setRange([item.selection])}
                  showSelectionPreview
                  moveRangeOnFirstSelection={false}
                  months={2}
                  ranges={range}
                  direction="horizontal"
                />
                <div className="flex justify-end gap-2 p-2">
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => {
                      setRange([{ startDate: null, endDate: null, key: "selection" }]);
                      setDateOpen(false);
                    }}
                  >
                    Clear
                  </Button>
                  <Button size="xs" onClick={() => setDateOpen(false)}>Apply</Button>
                </div>
              </div>
            )}
          </div>

          <Button onClick={handleSearch}>Apply Filters</Button>
          <Button variant="secondary" onClick={resetFilters}>Reset</Button>

          {/* Exports */}
          <div className="grow" />
          <Button variant="secondary" onClick={exportCSV}>Export CSV</Button>
          <Button variant="secondary" onClick={exportXLSX}>Export XLSX</Button>
          <Button variant="secondary" onClick={exportPDF}>Export PDF</Button>
        </div>
      </Card>

      {/* AG-Grid Table */}
      <Card className="p-0">
        <div className="ag-theme-quartz" style={{ height: "70vh", width: "100%" }}>
          <AgGridReact
            ref={gridRef}
            rowData={rows}
            columnDefs={columnDefs}
            defaultColDef={{ resizable: true, wrapText: false, autoHeight: false }}  // uniform rows
            animateRows
            suppressDragLeaveHidesColumns
            masterDetail={true}
            suppressMasterDetailAutoColumn={true}   // no extra expand column
            rowHeight={40}                           // force consistent row height
            detailRowHeight={260}
            isRowMaster={isRowMaster}
            detailCellRendererParams={detailCellRendererParams}
            onRowDoubleClicked={(e) => setDrawer({ open: true, po: e.data })}
            overlayLoadingTemplate={'<span class="ag-overlay-loading-center">Loading…</span>'}
            loadingOverlayComponentParams={{ loadingMessage: "Loading…" }}
            loading={loading ? 1 : 0}
          />
        </div>
      </Card>

      {/* Right Drawer */}
      {drawer.open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setDrawer({ open: false, po: null })}
          />
          <div className="absolute right-0 top-0 h-full w-[520px] bg-white shadow-2xl p-5 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold">PO #{drawer.po.po_number}</h2>
                <p className="text-sm text-gray-600">{drawer.po.vendor_name}</p>
              </div>
              <Button variant="secondary" onClick={() => setDrawer({ open: false, po: null })}>
                Close
              </Button>
            </div>

            <div className="space-y-2 text-sm">
              <div><strong>Status:</strong> {drawer.po.status}</div>
              <div><strong>Order Date:</strong> {drawer.po.order_date ? format(new Date(drawer.po.order_date), "yyyy-MM-dd") : "—"}</div>
              <div><strong>Expected:</strong> {drawer.po.expected_date ? format(new Date(drawer.po.expected_date), "yyyy-MM-dd") : "—"}</div>
              <div><strong>Total:</strong> {currency(drawer.po.total_amount)}</div>
              {drawer.po.notes ? <div><strong>Notes:</strong> {drawer.po.notes}</div> : null}
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
                      <td className="p-2 text-right">{currency(it.unit_price)}</td>
                      <td className="p-2 text-right">{currency(it.line_total)}</td>
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
