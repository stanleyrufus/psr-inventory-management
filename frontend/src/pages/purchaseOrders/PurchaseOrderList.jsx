// src/pages/purchaseOrders/PurchaseOrderList.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";   // ✅ FIXED
import axios from "axios";

// AG Grid
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);

import "ag-grid-community/styles/ag-grid.css";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function PurchaseOrderList() {
  const navigate = useNavigate();
  const location = useLocation();          // ✅ FIXED
  const gridRef = useRef();

  const [orders, setOrders] = useState([]);
  const [rfqStatusMap, setRfqStatusMap] = useState({});
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc",
  });

  // -------------------------------------------------------------
  // MAIN FETCH FUNCTION (kept original, not touched)
  // -------------------------------------------------------------
  const loadOrders = async () => {
    try {
      const res = await axios.get(`${BASE}/api/purchase_orders`);
      const data = Array.isArray(res.data) ? res.data : [];
      setOrders(data);

      // Load RFQ status map
      if (data.length > 0) {
        const ids = data.map((o) => o.id);
        try {
          const resp = await axios.get(
            `${BASE}/api/purchase_orders/rfq/status`,
            { params: { po_ids: ids.join(",") } }
          );
          setRfqStatusMap(resp.data?.data || {});
        } catch (e) {
          console.error("RFQ status load failed:", e);
          setRfqStatusMap({});
        }
      } else {
        setRfqStatusMap({});
      }
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
  // (Your previous loadPOs() was undefined → FIXED)
  // -------------------------------------------------------------
  useEffect(() => {
    loadOrders();               // ✅ FIXED
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

      const matchSupplier = supplierFilter
        ? o.vendor_name === supplierFilter
        : true;

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

  // -------------------------------------------------------------
  // Column Definitions
  // -------------------------------------------------------------
  const columns = [
    {
      headerName: "PO #",
      field: "psr_po_number",
      width: 140,
      cellRenderer: (params) => (
        <span
          className="text-blue-600 underline cursor-pointer"
          onClick={() => navigate(`/purchase-orders/${params.data.id}`)}
        >
          {params.value}
        </span>
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
      valueFormatter: (p) =>
        p.value != null ? `$${p.value.toLocaleString()}` : "-",
    },
    {
      headerName: "Order Date",
      field: "order_date",
      width: 160,
      valueFormatter: (p) =>
        p.value ? new Date(p.value).toLocaleDateString() : "-",
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
          <h2 className="text-2xl font-semibold text-gray-800">
            Purchase Orders
          </h2>
          <p className="text-gray-500 text-sm">
            Create, track and manage purchase orders
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => navigate("/purchase-orders/bulk-upload")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
          >
            📤 Bulk Upload
          </button>

          <button
            onClick={() => navigate("/purchase-orders/new")}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow"
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
          {Array.from(
            new Set(orders.map((o) => o.vendor_name).filter(Boolean))
          ).map((s) => (
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
          {Array.from(new Set(orders.map((o) => o.status).filter(Boolean))).map(
            (s) => (
              <option key={s}>{s}</option>
            )
          )}
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
    </div>
  );
}
