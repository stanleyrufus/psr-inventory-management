// src/pages/vendors/VendorsPage.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { fetchVendors, deleteVendor } from "../../utils/api";

import VendorForm from "./VendorForm";
import VendorDetails from "./VendorDetails";
import VendorBulkUpload from "./VendorBulkUpload";

import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
// import "ag-grid-community/styles/ag-theme-quartz.css"; // ✅ CHANGED from alpine → quartz

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [viewingVendor, setViewingVendor] = useState(null);
  const [editingVendor, setEditingVendor] = useState(null);

  const loadVendors = async () => {
    try {
      const data = await fetchVendors();
      setVendors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Error loading vendors:", err);
      setVendors([]);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  /* ---------------- Filtering ---------------- */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return vendors.filter((v) => {
      const matchSearch =
        !q ||
        v.vendor_name?.toLowerCase().includes(q) ||
        v.contact_name?.toLowerCase().includes(q) ||
        v.phone?.toLowerCase().includes(q) ||
        v.email?.toLowerCase().includes(q) ||
        v.city?.toLowerCase().includes(q) ||
        v.state?.toLowerCase().includes(q);

      const activeVal =
        v.isactive === true ||
        v.isactive === "true" ||
        v.isactive === 1 ||
        v.is_active === true ||
        v.is_active === "true" ||
        v.is_active === 1;

      const matchStatus =
        statusFilter === "" ? true : statusFilter === "Active" ? activeVal : !activeVal;

      return matchSearch && matchStatus;
    });
  }, [vendors, search, statusFilter]);

  /* ---------------- Pagination ---------------- */
  const totalPages = Math.max(1, Math.ceil(filtered.length / Number(itemsPerPage)));

  const pageData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  /* ---------------- Cell handlers ---------------- */
  const onView = useCallback((vendor) => setViewingVendor(vendor), []);
  const onEdit = useCallback((vendor) => {
    setEditingVendor(vendor);
    setShowForm(true);
  }, []);
  const onDelete = useCallback(async (vendor) => {
    if (!window.confirm(`Delete vendor "${vendor.vendor_name}"?`)) return;
    try {
      await deleteVendor(vendor.vendor_id);
      await loadVendors();
    } catch (e) {
      console.error("Delete vendor failed:", e);
      alert("Failed to delete vendor.");
    }
  }, []);

  /* ---------------- AG Grid columns ---------------- */
  const columnDefs = useMemo(
    () => [
      {
        headerName: "Vendor Name",
        field: "vendor_name",
        flex: 1.2,
        sortable: true,
      },
      { headerName: "Contact", field: "contact_name", flex: 1 },
      { headerName: "Phone", field: "phone", flex: 1 },
      { headerName: "Email", field: "email", flex: 1.2 },
      {
        headerName: "Location",
        flex: 1.2,
        valueGetter: (p) =>
          [p.data.city, p.data.state, p.data.country].filter(Boolean).join(", ") || "—",
      },
      {
        headerName: "Status",
        flex: 0.8,
        cellRenderer: (p) => {
          const active =
            p.data.isactive === true ||
            p.data.isactive === "true" ||
            p.data.isactive === 1 ||
            p.data.is_active === true ||
            p.data.is_active === "true" ||
            p.data.is_active === 1;

          return (
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
              }`}
            >
              {active ? "Active" : "Inactive"}
            </span>
          );
        },
      },
      {
        headerName: "Actions",
        flex: 1,
        cellRenderer: (p) => {
          const v = p.data;
          return (
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button
                className="text-blue-600 hover:underline text-sm"
                onClick={() => onView(v)}
              >
                View
              </button>
              <button
                className="text-gray-700 hover:underline text-sm"
                onClick={() => onEdit(v)}
              >
                Edit
              </button>
              <button
                className="text-red-600 hover:underline text-sm"
                onClick={() => onDelete(v)}
              >
                Delete
              </button>
            </div>
          );
        },
      },
    ],
    [onView, onEdit, onDelete]
  );

  return (
    <div className="p-6">
      {/* make AG Grid Quartz headers bold only */}
      <style>{`.ag-theme-quartz .ag-header-cell-text{font-weight:600;}`}</style>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Vendors</h2>
          <p className="text-gray-500 text-sm">Approved suppliers / vendors used for purchasing</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowBulk(true)}
            className="border border-blue-600 text-blue-600 px-4 py-2 rounded hover:bg-blue-50"
          >
            ⬆️ Bulk Upload
          </button>

          <button
            onClick={() => {
              setEditingVendor(null);
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            ➕ Add Vendor
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <input
          placeholder="🔍 Search name, contact, phone, email…"
          className="border rounded px-3 py-2 w-64"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />

        <select
          className="border rounded px-3 py-2"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>

        <select
          value={itemsPerPage}
          onChange={(e) => {
            setItemsPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
          className="border rounded px-3 py-2"
        >
          {[10, 25, 50].map((n) => (
            <option key={n} value={n}>
              Show {n} per page
            </option>
          ))}
        </select>
      </div>

      {/* ✅ AG GRID (theme class only updated) */}
      <div className="ag-theme-quartz" style={{ width: "100%" }}>
        <AgGridReact
theme="legacy"

          rowData={pageData}
          columnDefs={columnDefs}
          pagination={false}
          domLayout="autoHeight"
        />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-4 gap-3 text-sm">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>

          <span>
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6">
            <VendorForm
              initial={editingVendor}
              onSaved={() => {
                setShowForm(false);
                setEditingVendor(null);
                loadVendors();
              }}
              onCancel={() => {
                setShowForm(false);
                setEditingVendor(null);
              }}
            />
          </div>
        </div>
      )}

      {/* View Vendor Modal */}
      {viewingVendor && (
        <VendorDetails vendor={viewingVendor} onClose={() => setViewingVendor(null)} />
      )}

      {/* Bulk Upload Modal */}
      {showBulk && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full p-6 relative">
            <VendorBulkUpload
              onClose={() => setShowBulk(false)}
              onComplete={() => {
                setShowBulk(false);
                loadVendors();
              }}
            />
            <button
              className="absolute top-3 right-4 text-gray-500 hover:text-gray-700"
              onClick={() => setShowBulk(false)}
            >
              ✖
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
