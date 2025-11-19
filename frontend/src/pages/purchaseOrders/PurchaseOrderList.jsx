// src/pages/purchaseOrders/PurchaseOrderList.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// ✅ AG Grid imports
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);

import "ag-grid-community/styles/ag-grid.css";
// import "ag-grid-community/styles/ag-theme-quartz.css";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function PurchaseOrderList() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [rfqStatusMap, setRfqStatusMap] = useState({});
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const gridRef = useRef();

  const loadOrders = async () => {
    const res = await axios.get(`${BASE}/api/purchase_orders`);
    const data = Array.isArray(res.data) ? res.data : [];
    setOrders(data);

    if (data.length) {
      const ids = data.map((o) => o.id);
      try {
        const resp = await axios.get(`${BASE}/api/purchase_orders/rfq/status`, {
          params: { po_ids: ids.join(",") },
        });
        setRfqStatusMap(resp.data?.data || {});
      } catch (e) {
        console.error("RFQ status load failed:", e);
        setRfqStatusMap({});
      }
    } else {
      setRfqStatusMap({});
    }
  };

  useEffect(() => { loadOrders(); }, []);
  useEffect(() => {
    if (localStorage.getItem("refreshPOList") === "1") {
      localStorage.removeItem("refreshPOList");
      loadOrders();
    }
  }, []);

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
      return sortConfig.direction === "asc" ? (x > y ? 1 : -1) : (x < y ? 1 : -1);
    });
  }, [orders, sortConfig]);

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

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const goToPage = (p) => p >= 1 && p <= totalPages && setCurrentPage(p);

  /* ✅ AG Grid Columns */
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
    minWidth: 180,   // ⭐ FIX #1
    flex: 1,         // ⭐ FIX #2
    cellClass: "flex items-center",
  },
    {
      headerName: "Grand Total",
      field: "grand_total",
      width: 140,
      valueFormatter: (p) => (p.value != null ? `$${p.value}` : "-"),
    },
    {
      headerName: "Order Date",
      field: "order_date",
      width: 160,
      valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : "-"),
    },
    
    {
      headerName: "RFQ",
      field: "rfq",
      width: 140,
      cellRenderer: (params) => {
        const s = rfqStatusMap?.[params.data.id];
        if (s && s.sentCount > 0) {
          const dt = s.lastSentAt ? new Date(s.lastSentAt).toLocaleDateString() : "";
          return <span className="text-green-700 font-medium">Sent {dt && `(${dt})`}</span>;
        }
        return (
          <button
            className="text-indigo-600 underline"
            onClick={() => navigate(`/purchase-orders/${params.data.id}/send-rfq`)}
          >
            Send RFQ
          </button>
        );
      },
    },
    {
      headerName: "Actions",
      width: 220,
      cellRenderer: (params) => (
        <div className="flex gap-2">
          <button
            className="text-blue-600"
            onClick={() => navigate(`/purchase-orders/${params.data.id}`)}
          >
            View
          </button>
          <button
            className="text-gray-700"
            onClick={() => navigate(`/purchase-orders/edit/${params.data.id}`)}
          >
            Edit
          </button>
          <button
            className="text-red-600"
            onClick={async () => {
              if (!window.confirm(`Delete PO "${params.data.psr_po_number}"?`)) return;
              try {
                await axios.delete(`${BASE}/api/purchase_orders/${params.data.id}`);
                alert("✅ Purchase Order deleted");
                loadOrders();
              } catch (err) {
                console.error(err);
                alert("Delete failed");
              }
            }}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  // ✅ Match Vendors/Parts grid: use theme class and compact variables only
  const gridStyle = { width: "100%" };

  return (
    <div className="p-6">
      {/* ✅ Make Quartz headers bold + compact row height + vertical centering */}
      <style>{`
        .ag-theme-quartz .ag-header-cell-text {
          font-weight: 600 !important;
        }

        /* Match Vendors/Parts: compact rows & font */
        .ag-theme-quartz {
          --ag-font-size: 13px !important;
          --ag-row-height: 28px !important; /* key difference fixed */
        }

        /* Remove extra cell padding & vertically center */
        .ag-theme-quartz .ag-cell, 
        .ag-theme-quartz .ag-cell-wrapper {
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          display: flex !important;
          align-items: center !important;  /* vertical center */
        }

        /* Ensure row wrapper uses compact height */
        .ag-theme-quartz .ag-row {
          height: 28px !important;
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
              Show {n} per page
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="ag-theme-quartz bg-white shadow-md rounded-lg p-2">
        <div style={gridStyle}>
          <AgGridReact
            theme="legacy"   // ✅ same as Vendors
            ref={gridRef}
            rowData={paginated}
            columnDefs={columns}
            defaultColDef={{ resizable: true }}
            domLayout="autoHeight"
            animateRows={true}
          />
        </div>
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
