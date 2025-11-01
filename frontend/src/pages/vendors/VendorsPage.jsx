import React, { useEffect, useState, useMemo } from "react";
import {
  fetchVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  bulkUploadVendors,
} from "../../utils/api";

import VendorForm from "./VendorForm";
import VendorDetails from "./VendorDetails";
import VendorBulkUpload from "./VendorBulkUpload";

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [viewingVendor, setViewingVendor] = useState(null);
  const [editingVendor, setEditingVendor] = useState(null);

  // ✅ Sorting state
  const [sortConfig, setSortConfig] = useState({
    key: "vendor_name",
    direction: "asc",
  });

  // ✅ Load vendors
  const loadVendors = async () => {
    try {
      const data = await fetchVendors();
      const sorted = Array.isArray(data)
        ? [...data].sort((a, b) =>
            String(a.vendor_name || "").localeCompare(
              String(b.vendor_name || ""),
              undefined,
              { sensitivity: "base" }
            )
          )
        : [];
      setVendors(sorted);
    } catch (err) {
      console.error("❌ Error loading vendors:", err);
      setVendors([]);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  // ✅ Filtering
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vendors.filter((v) => {
      const matchSearch =
        !q ||
        v.vendor_name?.toLowerCase().includes(q) ||
        v.contact_name?.toLowerCase().includes(q) ||
        v.phone?.toLowerCase().includes(q) ||
        v.email?.toLowerCase().includes(q) ||
        v.city?.toLowerCase().includes(q) ||
        v.state?.toLowerCase().includes(q);

      const matchStatus =
        statusFilter === ""
          ? true
          : statusFilter === "Active"
          ? v.isactive === true ||
            v.isactive === "true" ||
            v.isactive === 1 ||
            v.is_active === true ||
            v.is_active === "true" ||
            v.is_active === 1
          : v.isactive === false ||
            v.isactive === "false" ||
            v.isactive === 0 ||
            v.is_active === false ||
            v.is_active === "false" ||
            v.is_active === 0;

      return matchSearch && matchStatus;
    });
  }, [vendors, search, statusFilter]);

  // ✅ Sorting handler
  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  // ✅ Sort icon (clean triangles beside header)
  const renderSortIcon = (key) => {
    if (sortConfig.key === key) {
      return (
        <span className="ml-1">
          {sortConfig.direction === "asc" ? "▲" : "▼"}
        </span>
      );
    }
    return <span className="ml-1 text-gray-400">▲</span>; // faint triangle for alignment
  };

  // ✅ Apply sorting
  const sortedFiltered = useMemo(() => {
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      const aVal =
        sortConfig.key === "location"
          ? [a.city, a.state, a.country].filter(Boolean).join(", ")
          : a[sortConfig.key];
      const bVal =
        sortConfig.key === "location"
          ? [b.city, b.state, b.country].filter(Boolean).join(", ")
          : b[sortConfig.key];

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortConfig.direction === "asc"
        ? String(aVal || "").localeCompare(String(bVal || ""), undefined, {
            sensitivity: "base",
          })
        : String(bVal || "").localeCompare(String(aVal || ""), undefined, {
            sensitivity: "base",
          });
    });
    return sorted;
  }, [filtered, sortConfig]);

  // ✅ Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(sortedFiltered.length / Number(itemsPerPage))
  );

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedFiltered.slice(start, start + itemsPerPage);
  }, [sortedFiltered, currentPage, itemsPerPage]);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // ✅ Delete Vendor
  const handleDelete = async (vendor_id, vendor_name) => {
    if (!window.confirm(`Are you sure you want to delete "${vendor_name}"?`))
      return;
    try {
      await deleteVendor(vendor_id);
      alert(`✅ Vendor "${vendor_name}" deleted successfully.`);
      loadVendors();
    } catch (err) {
      console.error("❌ Error deleting vendor:", err);
      alert("Error deleting vendor. Check console for details.");
    }
  };

  // ✅ After save or bulk upload
  const handleSavedClose = () => {
    setShowForm(false);
    setEditingVendor(null);
    loadVendors();
  };

  return (
    <div className="p-6">
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
            onClick={() => setShowBulk(true)}
            className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded shadow-sm"
          >
            ⬆️ Bulk Upload
          </button>

          <button
            onClick={() => {
              setEditingVendor(null);
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
          >
            ➕ Add Vendor
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <input
          type="text"
          placeholder="🔍 Search name, contact, phone, email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="border rounded px-3 py-2 w-64"
        />

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="border rounded px-3 py-2"
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

      {/* Table */}
      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="min-w-full border text-sm text-left">
          <thead className="bg-gray-100 text-gray-700 uppercase text-xs font-semibold">
            <tr>
              <th
                className="py-3 px-4 border-b cursor-pointer"
                onClick={() => handleSort("vendor_name")}
              >
                <div className="flex items-center">
                  Vendor Name {renderSortIcon("vendor_name")}
                </div>
              </th>
              <th
                className="py-3 px-4 border-b cursor-pointer"
                onClick={() => handleSort("contact_name")}
              >
                <div className="flex items-center">
                  Contact {renderSortIcon("contact_name")}
                </div>
              </th>
              <th
                className="py-3 px-4 border-b cursor-pointer"
                onClick={() => handleSort("phone")}
              >
                <div className="flex items-center">
                  Phone {renderSortIcon("phone")}
                </div>
              </th>
              <th
                className="py-3 px-4 border-b cursor-pointer"
                onClick={() => handleSort("email")}
              >
                <div className="flex items-center">
                  Email {renderSortIcon("email")}
                </div>
              </th>
              <th
                className="py-3 px-4 border-b cursor-pointer"
                onClick={() => handleSort("location")}
              >
                <div className="flex items-center">
                  Location {renderSortIcon("location")}
                </div>
              </th>
              <th
                className="py-3 px-4 border-b cursor-pointer text-center"
                onClick={() => handleSort("is_active")}
              >
                <div className="flex items-center justify-center">
                  Status {renderSortIcon("is_active")}
                </div>
              </th>
              <th className="py-3 px-4 border-b text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-6 text-gray-500 font-medium"
                >
                  No vendors found
                </td>
              </tr>
            ) : (
              paginated.map((v) => (
                <tr
                  key={v.vendor_id ?? v.id ?? v.vendor_name}
                  className="border-t hover:bg-gray-50 transition"
                >
                  <td className="py-2 px-4">{v.vendor_name}</td>
                  <td className="py-2 px-4">{v.contact_name || "—"}</td>
                  <td className="py-2 px-4">{v.phone || "—"}</td>
                  <td className="py-2 px-4">{v.email || "—"}</td>
                  <td className="py-2 px-4">
                    {[v.city, v.state, v.country]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </td>
                  <td className="py-2 px-4 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        v.isactive === true ||
                        v.isactive === "true" ||
                        v.isactive === 1 ||
                        v.is_active === true ||
                        v.is_active === "true" ||
                        v.is_active === 1
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {v.isactive === true ||
                      v.isactive === "true" ||
                      v.isactive === 1 ||
                      v.is_active === true ||
                      v.is_active === "true" ||
                      v.is_active === 1
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-center">
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => setViewingVendor(v)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View
                      </button>
                      <button
                        onClick={() => {
                          setEditingVendor(v);
                          setShowForm(true);
                        }}
                        className="text-gray-700 hover:underline text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(v.vendor_id, v.vendor_name)}
                        className="text-red-600 hover:underline text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 overflow-y-auto max-h-[90vh]">
            <VendorForm
              initial={editingVendor ?? {}}
              onSaved={handleSavedClose}
              onCancel={() => {
                setShowForm(false);
                setEditingVendor(null);
              }}
            />
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingVendor && (
        <VendorDetails
          vendor={viewingVendor}
          onClose={() => setViewingVendor(null)}
        />
      )}

      {/* Bulk Upload Modal */}
      {showBulk && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6 relative">
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
