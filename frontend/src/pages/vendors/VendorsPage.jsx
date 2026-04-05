// src/pages/vendors/VendorsPage.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { fetchVendors, deleteVendor } from "../../utils/api";
import { hasPermission } from "../../utils/permissions";

import VendorForm from "./VendorForm";
import VendorDetails from "./VendorDetails";
import VendorBulkUpload from "./VendorBulkUpload";

import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const canViewVendors = hasPermission("view_vendors");
  const canEditVendors = hasPermission("edit_vendors");
  console.log("Vendor page permissions:", {
    canViewVendors,
    canEditVendors,
  });


  // Modals
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [viewingVendor, setViewingVendor] = useState(null);
  const [editingVendor, setEditingVendor] = useState(null);

  const loadVendors = useCallback(async () => {
    try {
      const data = await fetchVendors();
      setVendors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Error loading vendors:", err);
      setVendors([]);
    }
  }, []);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

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
        statusFilter === ""
          ? true
          : statusFilter === "Active"
            ? activeVal
            : !activeVal;

      return matchSearch && matchStatus;
    });
  }, [vendors, search, statusFilter]);

  /* ---------------- Pagination ---------------- */
  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / Number(itemsPerPage))
  );

  const pageData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  /* ---------------- Handlers ---------------- */
  const onView = useCallback((vendor) => {
    setViewingVendor(vendor);
  }, []);

  const onEdit = useCallback((vendor) => {
    setViewingVendor(null);
    setEditingVendor(vendor);
    setShowForm(true);
  }, []);

  const onDeleteFromGrid = useCallback(async (vendor) => {
    if (!window.confirm(`Delete vendor "${vendor.vendor_name}"?`)) return;

    try {
      await deleteVendor(vendor.vendor_id);

      setVendors((prev) =>
        prev.filter((v) => String(v.vendor_id) !== String(vendor.vendor_id))
      );

      alert("Vendor deleted successfully.");
    } catch (e) {
      console.error("Delete vendor failed:", e);
      alert(e?.response?.data?.message || "Failed to delete vendor.");
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
        cellRenderer: (params) => (
          <span
            className="text-blue-700 hover:underline cursor-pointer"
            onClick={() => onView(params.data)}
          >
            {params.value}
          </span>
        ),
      },
      { headerName: "Contact", field: "contact_name", flex: 1 },
      { headerName: "Phone", field: "phone", flex: 1 },
      { headerName: "Email", field: "email", flex: 1.2 },
      {
        headerName: "Location",
        flex: 1.2,
        valueGetter: (p) =>
          [p.data.city, p.data.state, p.data.country]
            .filter(Boolean)
            .join(", ") || "—",
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
                active
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {active ? "Active" : "Inactive"}
            </span>
          );
        },
      },
    ],
    [onView]
  );

  // ✅ ADD THIS BLOCK HERE
  if (!canViewVendors) {
    return (
      <div className="p-6 text-red-600 font-medium text-xl">
        VENDORS PAGE BLOCKED
      </div>
    );
  }

  return (
    <div className="p-6">
      <style>{`.ag-theme-quartz .ag-header-cell-text{font-weight:600;}`}</style>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Vendors</h2>
          <p className="text-gray-500 text-sm">
            Approved suppliers / vendors used for purchasing
          </p>
        </div>

        <div className="flex gap-2">
               <button
            type="button"
            disabled={!canEditVendors}
            onClick={() => {
              if (!canEditVendors) return;
              setShowBulk(true);
            }}
            className={`px-3 py-1.5 text-sm rounded shadow ${
              canEditVendors
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            ⬆️ Bulk Upload
          </button>

                    <button
            type="button"
            disabled={!canEditVendors}
            onClick={() => {
              if (!canEditVendors) return;
              setViewingVendor(null);
              setEditingVendor(null);
              setShowForm(true);
            }}
            className={`px-3 py-1.5 text-sm rounded shadow ${
              canEditVendors
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
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

   <div className="bg-white shadow-md rounded-lg p-2">
  <div className="ag-theme-quartz" style={{ width: "100%" }}>
    <AgGridReact
      rowData={pageData}
      columnDefs={columnDefs}
      pagination={false}
      domLayout="autoHeight"
    />
  </div>

  {totalPages > 1 && (
    <div className="flex justify-center items-center gap-3 mt-4 text-sm">
      <button
        disabled={currentPage === 1}
        onClick={() => goToPage(currentPage - 1)}
        className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
      >
        Prev
      </button>

      <span>
        Page {currentPage} of {totalPages}
      </span>

      <button
        disabled={currentPage === totalPages}
        onClick={() => goToPage(currentPage + 1)}
        className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
      >
        Next
      </button>
    </div>
  )}
</div>

      {showForm && (
        <VendorForm
          initial={editingVendor || {}}
          onCancel={() => {
            setShowForm(false);
            setEditingVendor(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditingVendor(null);
            setViewingVendor(null);
            loadVendors();
          }}
        />
      )}

      {showBulk && (
        <VendorBulkUpload
          onClose={() => {
            setShowBulk(false);
            loadVendors();
          }}
        />
      )}

      {viewingVendor && (
        <VendorDetails
          vendor={viewingVendor}
          onClose={() => setViewingVendor(null)}
          onDeleted={() => {
            setViewingVendor(null);
            loadVendors();
          }}
          onEdit={(vendor) => {
            setViewingVendor(null);
            setEditingVendor(vendor);
            setShowForm(true);
          }}
        />
      )}
    </div>
  );
}