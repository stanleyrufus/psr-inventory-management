// src/pages/purchaseOrders/PurchaseOrderList.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

// AG Grid
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);

import "ag-grid-community/styles/ag-grid.css";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function PurchaseOrderList() {
  const navigate = useNavigate();
  const location = useLocation();
  const gridRef = useRef();

  const [orders, setOrders] = useState([]);
  const [rfqStatusMap, setRfqStatusMap] = useState({}); // keeping (existing)
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // ✅ Reserve PO modal state
  const [showReserve, setShowReserve] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [reserveSubmitting, setReserveSubmitting] = useState(false);
  const [reserveErr, setReserveErr] = useState("");
  const [reserveForm, setReserveForm] = useState({
    vendor_id: "",
    created_by: "Stanley", // TODO: replace later with logged-in user
    remarks: "",
  });

  // ✅ Reserve preview (auto-generated PO number shown in modal)
  const [reserveLoading, setReserveLoading] = useState(false);
  const [reservePreview, setReservePreview] = useState({
    psr_po_number: "",
    order_date: "",
  });

  // ✅ Copy status
  const [copied, setCopied] = useState(false);

  const loadOrders = async () => {
    try {
      const res = await axios.get(`${BASE}/api/purchase_orders`);
      const data = Array.isArray(res.data) ? res.data : [];
      setOrders(data);
    } catch (err) {
      console.error("❌ Failed to load POs:", err);
    }
  };

  // -------------------------------------------------------------
  // INITIAL LOAD
  // -------------------------------------------------------------
  useEffect(() => {
    loadOrders();
  }, []);

  // -------------------------------------------------------------
  // REFRESH when navigating back from PO Form
  // -------------------------------------------------------------
  useEffect(() => {
    loadOrders();
  }, [location.pathname]);

  // -------------------------------------------------------------
  // "refreshPOList" mechanism preserved
  // -------------------------------------------------------------
  useEffect(() => {
    if (localStorage.getItem("refreshPOList") === "1") {
      localStorage.removeItem("refreshPOList");
      loadOrders();
    }
  }, []);

  // ✅ Load vendors for Reserve modal
  useEffect(() => {
    axios
      .get(`${BASE}/api/vendors`)
      .then((res) => setVendors(res.data?.data || res.data || []))
      .catch(() => setVendors([]));
  }, []);

  // ✅ Fetch preview PO number when modal opens
  useEffect(() => {
    if (!showReserve) return;

    const fetchReservePreview = async () => {
      try {
        setReserveErr("");
        setReserveLoading(true);
        setReservePreview({ psr_po_number: "", order_date: "" });

        const res = await axios.get(`${BASE}/api/purchase_orders/next-number`);
        setReservePreview({
          psr_po_number: res.data?.psr_po_number || "",
          order_date: res.data?.order_date || "",
        });
      } catch (e) {
        setReserveErr("Failed to generate PO number. Please try again.");
        setReservePreview({ psr_po_number: "", order_date: "" });
      } finally {
        setReserveLoading(false);
      }
    };

    fetchReservePreview();
    setCopied(false);
  }, [showReserve]);

  // -------------------------------------------------------------
  // Sorting Logic
  // -------------------------------------------------------------
  const sortBy = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortedOrders = useMemo(() => {
    if (!sortConfig.key) return orders;
    return [...orders].sort((a, b) => {
      const x = a[sortConfig.key] ?? "";
      const y = b[sortConfig.key] ?? "";
      return sortConfig.direction === "asc"
        ? x > y
          ? 1
          : -1
        : x < y
        ? 1
        : -1;
    });
  }, [orders, sortConfig]);

  // -------------------------------------------------------------
  // Filter Logic
  // -------------------------------------------------------------
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sortedOrders.filter((o) => {
      const matchSearch =
        !q ||
        o.psr_po_number?.toLowerCase().includes(q) ||
        o.vendor_name?.toLowerCase().includes(q);

      const matchSupplier = supplierFilter ? o.vendor_name === supplierFilter : true;
      const matchStatus = statusFilter ? o.status === statusFilter : true;

      return matchSearch && matchSupplier && matchStatus;
    });
  }, [sortedOrders, search, supplierFilter, statusFilter]);

  // -------------------------------------------------------------
  // Pagination
  // -------------------------------------------------------------
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const goToPage = (p) => {
    if (p >= 1 && p <= totalPages) setCurrentPage(p);
  };

  // ✅ Copy PO number (modal)
  const copyPoNumber = async () => {
    const text = reservePreview.psr_po_number || "";
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);

      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  // ✅ Regenerate preview
  const regeneratePreview = async () => {
    try {
      setReserveErr("");
      setCopied(false);
      setReserveLoading(true);
      setReservePreview({ psr_po_number: "", order_date: "" });

      const res = await axios.get(`${BASE}/api/purchase_orders/next-number`);
      setReservePreview({
        psr_po_number: res.data?.psr_po_number || "",
        order_date: res.data?.order_date || "",
      });
    } catch (e) {
      setReserveErr("Failed to generate PO number. Please try again.");
    } finally {
      setReserveLoading(false);
    }
  };

  // ✅ Reserve PO submit
  const submitReserve = async () => {
    setReserveErr("");

    const poNumber = reservePreview.psr_po_number || "";
    if (!poNumber) {
      setReserveErr("PO number not generated. Close and reopen the modal.");
      return;
    }

    if (!reserveForm.created_by.trim()) {
      setReserveErr("Reserved By is required.");
      return;
    }

    try {
      setReserveSubmitting(true);

      const payload = {
        psr_po_number: poNumber,
        created_by: reserveForm.created_by.trim(),
        remarks: reserveForm.remarks || "",
        ...(reserveForm.vendor_id ? { vendor_id: Number(reserveForm.vendor_id) } : {}),
      };

      const res = await axios.post(`${BASE}/api/purchase_orders/reserve`, payload);

      const newId = res.data?.data?.id;

      setShowReserve(false);
      setReserveForm((p) => ({
        vendor_id: "",
        created_by: p.created_by,
        remarks: "",
      }));

      await loadOrders();

      if (newId) navigate(`/purchase-orders/${newId}`);
    } catch (err) {
      setReserveErr(err?.response?.data?.message || "Failed to reserve PO.");
    } finally {
      setReserveSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Column Definitions
  // -------------------------------------------------------------
  const columns = [
    {
      headerName: "PO #",
      field: "psr_po_number",
      width: 220,
      minWidth: 220,
      flex: 0,
      tooltipField: "psr_po_number",
      cellClass: "whitespace-nowrap",
      cellRenderer: (params) => (
        <button
          type="button"
          className="text-blue-600 underline cursor-pointer whitespace-nowrap bg-transparent border-0 p-0"
          title={params.value || ""}
          onClick={(e) => {
            // ✅ THIS is the missing reliable part:
            e.preventDefault();
            e.stopPropagation();
            const id = params?.data?.id;
            if (id) navigate(`/purchase-orders/${id}`);
          }}
        >
          {params.value}
        </button>
      ),
    },
    {
      headerName: "Vendor",
      field: "vendor_name",
      flex: 1,
      minWidth: 180,
    },
    {
      headerName: "Grand Total",
      field: "grand_total",
      width: 140,
      valueFormatter: (p) => (p.value != null ? `$${p.value.toLocaleString()}` : "-"),
    },
    {
      headerName: "Order Date",
      field: "order_date",
      width: 160,
      valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : "-"),
    },
    {
      headerName: "Status",
      field: "status",
      width: 130,
      cellRenderer: (params) => {
        const s = params.value;

        const color =
          s === "Draft"
            ? "bg-yellow-100 text-yellow-800"
            : s === "Sent RFQ"
            ? "bg-blue-100 text-blue-800"
            : s === "Ordered"
            ? "bg-purple-100 text-purple-800"
            : s === "Received"
            ? "bg-green-100 text-green-800"
            : s === "Cancelled"
            ? "bg-red-100 text-red-800"
            : s === "Reserved"
            ? "bg-indigo-100 text-indigo-800"
            : "bg-gray-100 text-gray-800";

        return (
          <span className={`px-2 py-1 rounded text-xs font-semibold ${color}`}>
            {s || "-"}
          </span>
        );
      },
    },
  ];

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------
  return (
    <div className="p-6">
      {/* AG Grid style tuning */}
      <style>{`
        .ag-theme-quartz .ag-header-cell-text {
          font-weight: 600 !important;
        }
        .ag-theme-quartz {
          --ag-font-size: 13px !important;
          --ag-row-height: 28px !important;
        }
        .ag-theme-quartz .ag-cell, 
        .ag-theme-quartz .ag-cell-wrapper {
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          display: flex !important;
          align-items: center !important;
        }
      `}</style>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Purchase Orders</h2>
          <p className="text-gray-500 text-sm">Create, track and manage purchase orders</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowReserve(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-sm rounded shadow"
            title="Reserve a PO number (creates placeholder)"
          >
            📌 Reserve PO
          </button>

          <button
            onClick={() => navigate("/purchase-orders/bulk-upload")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-sm rounded shadow"
          >
            📤 Bulk Upload
          </button>

          <button
            onClick={() => navigate("/purchase-orders/import-from-pdf")}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-sm rounded shadow"
          >
            📄 Import PDF
          </button>

          <button
            onClick={() => navigate("/purchase-orders/new")}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-sm rounded shadow"
          >
            ➕ Create PO
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <input
          placeholder="🔍 Search PO#, Vendor..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="border rounded px-3 py-2 w-64"
        />

        <select
          value={supplierFilter}
          onChange={(e) => {
            setSupplierFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="border rounded px-2 py-2 w-40"
        >
          <option value="">All Vendors</option>
          {Array.from(new Set(orders.map((o) => o.vendor_name).filter(Boolean))).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="border rounded px-2 py-2 w-32"
        >
          <option value="">All Status</option>
          {Array.from(new Set(orders.map((o) => o.status).filter(Boolean))).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        <select
          value={itemsPerPage}
          onChange={(e) => setItemsPerPage(Number(e.target.value))}
          className="border rounded px-2 py-2"
        >
          {[10, 20, 50, 100].map((n) => (
            <option key={n} value={n}>
              Show {n}
            </option>
          ))}
        </select>
      </div>

      {/* AG Grid Table */}
      <div className="ag-theme-quartz bg-white shadow-md rounded-lg p-2">
        <AgGridReact
          ref={gridRef}
          rowData={paginated}
          columnDefs={columns}
          defaultColDef={{ resizable: true }}
          domLayout="autoHeight"
          animateRows={true}
        />
      </div>

      {/* Pagination */}
      <div className="flex justify-center items-center gap-3 mt-4 text-sm">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
        >
          Prev
        </button>

        <span>
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* ✅ Reserve PO Modal */}
      {showReserve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[560px] max-w-[95vw] rounded-lg bg-white shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-base font-semibold">Reserve PO Number</h3>
              <button
                onClick={() => setShowReserve(false)}
                className="text-xl leading-none text-gray-600 hover:text-black"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-4 space-y-3">
              {reserveErr && (
                <div className="rounded border border-red-300 bg-red-50 text-red-800 px-3 py-2 text-sm">
                  {reserveErr}
                </div>
              )}

              {/* Auto-generated PO preview + Copy */}
              <div className="rounded border bg-gray-50 px-3 py-2 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-gray-600">PO Number (auto)</div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold break-all">
                        {reserveLoading ? "Generating..." : reservePreview.psr_po_number || "—"}
                      </div>

                      <button
                        type="button"
                        onClick={copyPoNumber}
                        disabled={!reservePreview.psr_po_number || reserveLoading}
                        className="shrink-0 px-2 py-1 text-xs rounded bg-white border hover:bg-gray-50 disabled:opacity-50"
                        title="Copy PO number"
                      >
                        {copied ? "✅ Copied" : "📋 Copy"}
                      </button>
                    </div>

                    <div className="text-gray-500">
                      Order Date:{" "}
                      <span className="font-medium">{reservePreview.order_date || "—"}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={regeneratePreview}
                    className="shrink-0 px-2 py-1 text-xs rounded bg-white border hover:bg-gray-50 disabled:opacity-50"
                    disabled={reserveLoading}
                    title="Regenerate PO number"
                  >
                    🔄
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Vendor (optional)</label>
                <select
                  value={reserveForm.vendor_id}
                  onChange={(e) => setReserveForm((p) => ({ ...p, vendor_id: e.target.value }))}
                  className="border rounded px-3 py-2 w-full text-sm"
                  disabled={reserveSubmitting}
                >
                  <option value="">— None —</option>
                  {vendors.map((v) => (
                    <option key={v.vendor_id} value={v.vendor_id}>
                      {v.vendor_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Reserved By *</label>
                <input
                  value={reserveForm.created_by}
                  onChange={(e) => setReserveForm((p) => ({ ...p, created_by: e.target.value }))}
                  className="border rounded px-3 py-2 w-full text-sm"
                  disabled={reserveSubmitting}
                  placeholder="Name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Remarks (optional)</label>
                <textarea
                  value={reserveForm.remarks}
                  onChange={(e) => setReserveForm((p) => ({ ...p, remarks: e.target.value }))}
                  className="border rounded px-3 py-2 w-full text-sm"
                  rows={3}
                  disabled={reserveSubmitting}
                  placeholder="Why are you reserving this PO?"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t">
              <button
                onClick={() => setShowReserve(false)}
                className="px-3 py-1.5 text-sm rounded bg-gray-200 hover:bg-gray-300"
                disabled={reserveSubmitting}
              >
                Cancel
              </button>

              <button
                onClick={submitReserve}
                className="px-3 py-1.5 text-sm rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                disabled={reserveSubmitting || reserveLoading || !reservePreview.psr_po_number}
              >
                {reserveSubmitting ? "Reserving..." : "Reserve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
