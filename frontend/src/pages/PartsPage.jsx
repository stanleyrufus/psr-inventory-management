// frontend/src/pages/PartsPage.jsx
import React, { useEffect, useState } from "react";
import api from "../utils/api";
import PartForm from "../components/forms/PartForm";
import BulkUploadModal from "../components/modals/BulkUploadModal";
import PartDetail from "../components/PartDetail";

export default function PartsPage() {
  const [parts, setParts] = useState([]);
  const [filtered, setFiltered] = useState([]);

  // ✅ Sorting state + function
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const sortBy = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const SortIcon = ({ col }) => {
    if (sortConfig.key !== col) return <span className="ml-1 text-gray-400">▲</span>;
    return (
      <span className="ml-1">
        {sortConfig.direction === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  const [editingPart, setEditingPart] = useState(null);
  const [viewingPart, setViewingPart] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [zoomImage, setZoomImage] = useState(null); // ✅ for image zoom modal

  const loadParts = async () => {
    try {
      const data = await api.fetchParts();
      const sorted = Array.isArray(data)
        ? [...data].sort((a, b) => (b.part_id || b.id) - (a.part_id || a.id))
        : [];
      setParts(sorted);
      setFiltered(sorted);
    } catch (e) {
      console.error("❌ Error loading parts:", e);
      setParts([]);
      setFiltered([]);
    }
  };

  useEffect(() => {
    loadParts();
  }, []);

  useEffect(() => {
    const f = parts.filter((p) => {
      const matchSearch =
        p.part_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.part_number?.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter ? p.category === categoryFilter : true;
      const matchStatus = statusFilter ? p.status === statusFilter : true;
      return matchSearch && matchCategory && matchStatus;
    });
    setFiltered(f);
    setCurrentPage(1);
  }, [search, categoryFilter, statusFilter, parts]);

  const sortedFiltered = [...filtered].sort((a, b) => {
    if (!sortConfig.key) return filtered;
    const x = a[sortConfig.key] ?? "";
    const y = b[sortConfig.key] ?? "";
    return sortConfig.direction === "asc" ? (x > y ? 1 : -1) : (x < y ? 1 : -1);
  });

  const totalPages = Math.ceil(sortedFiltered.length / itemsPerPage) || 1;

  const paginated = sortedFiltered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handlePartSaved = () => {
    setShowForm(false);
    setEditingPart(null);
    loadParts();
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete part "${name}" permanently?`)) return;
    try {
      await api.deletePart(id);
      alert("✅ Part deleted successfully!");
      loadParts();
    } catch (err) {
      console.error("❌ Error deleting part:", err);
      alert("Error deleting part. Check console.");
    }
  };

const BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">
            Inventory Dashboard
          </h2>
          <p className="text-gray-500 text-sm">
            Manage all parts, components, and materials
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setEditingPart(null);
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
          >
            ➕ Add Part
          </button>
          <button
            onClick={() => setShowBulk(true)}
            className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded shadow-sm"
          >
            ⬆️ Bulk Upload
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <input
          type="text"
          placeholder="🔍 Search by name, number, or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-2 w-64"
        />

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">All Categories</option>
          {[...new Set(parts.map((p) => p.category))].map(
            (cat) =>
              cat && (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              )
          )}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
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
              {/* ✅ Image Column */}
              <th className="py-3 px-4 border-b text-center">Image</th>

              <th
                className="py-3 px-4 border-b cursor-pointer"
                onClick={() => sortBy("part_number")}
              >
                <div className="flex items-center">
                  Part # <SortIcon col="part_number" />
                </div>
              </th>

              <th
                className="py-3 px-4 border-b cursor-pointer"
                onClick={() => sortBy("part_name")}
              >
                <div className="flex items-center">
                  Part Name <SortIcon col="part_name" />
                </div>
              </th>

              <th
                className="py-3 px-4 border-b cursor-pointer"
                onClick={() => sortBy("category")}
              >
                <div className="flex items-center">
                  Category <SortIcon col="category" />
                </div>
              </th>

              <th
                className="py-3 px-4 border-b cursor-pointer"
                onClick={() => sortBy("machine_name")}
              >
                <div className="flex items-center">
                  Machine <SortIcon col="machine_name" />
                </div>
              </th>

              <th
                className="py-3 px-4 border-b text-right cursor-pointer"
                onClick={() => sortBy("last_unit_price")}
              >
                <div className="flex items-center justify-end">
                  Last Price <SortIcon col="last_unit_price" />
                </div>
              </th>

              <th
                className="py-3 px-4 border-b cursor-pointer"
                onClick={() => sortBy("last_vendor_name")}
              >
                <div className="flex items-center">
                  Last Vendor <SortIcon col="last_vendor_name" />
                </div>
              </th>

              <th
                className="py-3 px-4 border-b text-center cursor-pointer"
                onClick={() => sortBy("status")}
              >
                <div className="flex items-center justify-center">
                  Status <SortIcon col="status" />
                </div>
              </th>

              <th className="py-3 px-4 border-b text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-6 text-gray-500 font-medium">
                  No parts found
                </td>
              </tr>
            ) : (
              paginated.map((p) => (
                <tr
                  key={p.part_id ?? p.id ?? p.part_number}
                  className="border-t hover:bg-gray-50 transition"
                >
                  {/* ✅ Thumbnail */}
                  <td className="py-2 px-4 text-center">
  {p.image_url ? (
    <img
      src={`${BASE}${p.image_url}`}
      alt="img"
      className="w-12 h-12 object-cover rounded cursor-pointer border"
      onClick={() => setZoomImage(`${BASE}${p.image_url}`)}
      onError={(e) => { e.target.src = "/no-image.png"; }}
    />
  ) : (
    <span className="text-gray-400 text-xs italic">No image</span>
  )}
</td>


                  <td className="py-2 px-4">{p.part_number}</td>
                  <td className="py-2 px-4">{p.part_name}</td>
                  <td className="py-2 px-4">{p.category || "-"}</td>
                  <td className="py-2 px-4">{p.machine_name || "-"}</td>
                  <td className="py-2 px-4 text-right">
                    {p.last_unit_price
                      ? `$${Number(p.last_unit_price).toFixed(2)}`
                      : p.unit_price
                      ? `$${Number(p.unit_price).toFixed(2)}`
                      : "-"}
                  </td>
                  <td className="py-2 px-4">{p.last_vendor_name || "—"}</td>
                  <td className="py-2 px-4 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        p.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {p.status || "Unknown"}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-center">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => setViewingPart(p)} className="text-blue-600 hover:underline text-sm">
                        View
                      </button>
                      <button
                        onClick={() => {
                          setEditingPart(p);
                          setShowForm(true);
                        }}
                        className="text-gray-700 hover:underline text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p.part_id, p.part_name)}
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

      {/* ✅ Image Zoom Modal */}
      {zoomImage && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-white p-4 rounded shadow-lg relative">
            <button
              className="absolute top-2 right-2 text-gray-600"
              onClick={() => setZoomImage(null)}
            >
              ✖
            </button>
            <img
              src={zoomImage}
              className="max-h-[80vh] max-w-[80vw] object-contain rounded"
            />

            <div className="text-center mt-2">
              <a
                href={zoomImage}
                download
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
              >
                ⬇ Download
              </a>
            </div>
          </div>
        </div>
      )}

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

      {/* Modals */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 overflow-y-auto max-h-[90vh]">
            <PartForm
              initial={editingPart ?? {}}
              onSaved={handlePartSaved}
              onCancel={() => {
                setShowForm(false);
                setEditingPart(null);
              }}
            />
          </div>
        </div>
      )}

      {viewingPart && (
        <PartDetail part={viewingPart} onClose={() => setViewingPart(null)} />
      )}

      {showBulk && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6 relative overflow-y-auto max-h-[90vh]">
            <BulkUploadModal
              onClose={() => setShowBulk(false)}
              onComplete={() => {
                loadParts();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
