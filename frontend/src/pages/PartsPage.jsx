// frontend/src/pages/PartsPage.jsx
import React, { useEffect, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import api from "../utils/api";
import PartForm from "../components/forms/PartForm";
import BulkUploadModal from "../components/modals/BulkUploadModal";
import PartDetail from "../components/PartDetail";

export default function PartsPage() {
  // ⭐ NEW – moved inside component to follow React rules
  const [selectedPart, setSelectedPart] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const handleViewPart = (row) => {
    setSelectedPart(row);
    setShowDetail(true);
  };

  const [parts, setParts] = useState([]);
  const [filtered, setFiltered] = useState([]);

  const [editingPart, setEditingPart] = useState(null);
  const [viewingPart, setViewingPart] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [zoomImage, setZoomImage] = useState(null);

  const BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

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
      const q = search.toLowerCase();

      const matchSearch =
        p.part_name?.toLowerCase().includes(q) ||
        p.part_number?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q);

      const matchCategory = categoryFilter ? p.category === categoryFilter : true;
      const matchStatus = statusFilter ? p.status === statusFilter : true;

      return matchSearch && matchCategory && matchStatus;
    });

    setFiltered(f);
    setCurrentPage(1);
  }, [search, categoryFilter, statusFilter, parts]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;

  const paginated = filtered.slice(
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

useEffect(() => {
  const editListener = (e) => {
    setEditingPart(e.detail);
    setShowForm(true);
  };
  const reloadListener = () => loadParts();

  window.addEventListener("edit-part", editListener);
  window.addEventListener("reload-parts", reloadListener);

  return () => {
    window.removeEventListener("edit-part", editListener);
    window.removeEventListener("reload-parts", reloadListener);
  };
}, []);


  /*************************************
   ✅ CELL RENDERERS
  *************************************/
  const ImageRenderer = (props) => {
    const url = props.value ? `${BASE}${props.value}` : null;
    return url ? (
      <img
        src={url}
        className="w-12 h-12 object-cover rounded border cursor-pointer"
        onClick={() => setZoomImage(url)}
        onError={(e) => (e.target.src = "/no-image.png")}
      />
    ) : (
      <span className="text-gray-400 text-xs italic">No image</span>
    );
  };

  const StatusRenderer = (props) => {
    const s = props.value || "Unknown";
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          s === "Active"
            ? "bg-green-100 text-green-700"
            : "bg-gray-200 text-gray-600"
        }`}
      >
        {s}
      </span>
    );
  };

  const ActionsRenderer = (props) => {
    const row = props.data;
    return (
      <div className="flex gap-2 justify-start">
        <button
          className="text-blue-600 text-sm underline"
          onClick={() => setViewingPart(row)}
        >
          View
        </button>
        <button
          className="text-gray-700 text-sm underline"
          onClick={() => {
            setEditingPart(row);
            setShowForm(true);
          }}
        >
          Edit
        </button>
        <button
          className="text-red-600 text-sm underline"
          onClick={() => handleDelete(row.part_id, row.part_name)}
        >
          Delete
        </button>
      </div>
    );
  };

  /*************************************
   ✅ AG GRID COLUMNS 
   – Part # becomes clickable link → opens Detail modal
  *************************************/
  const columnDefs = [
    { headerName: "Image", field: "image_url", width: 100, cellRenderer: ImageRenderer },

    {
      headerName: "Part #",
      field: "part_number",
      width: 120,
      flex: 1,
      cellRenderer: (params) => (
        <span
          className="text-blue-700 hover:underline cursor-pointer"
          onClick={() => handleViewPart(params.data)}
        >
          {params.value}
        </span>
      ),
    },

    {
      headerName: "Last Price",
      width: 110,
      valueFormatter: (p) => {
        const v = p.data.last_unit_price ?? p.data.unit_price ?? null;
        return v ? `$${Number(v).toFixed(2)}` : "-";
      },
    },

    { headerName: "Last Vendor", field: "last_vendor_name", width: 160, flex: 1 },

    { headerName: "Status", field: "status", width: 110, cellRenderer: StatusRenderer },

  ];

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
            className="bg-blue-600 text-white px-4 py-2 rounded shadow"
          >
            ➕ Add Part
          </button>

          <button
            onClick={() => setShowBulk(true)}
            className="border border-blue-600 text-blue-600 px-4 py-2 rounded"
          >
            ⬆️ Bulk Upload
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <input
          type="text"
          placeholder="Search..."
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
            (cat) => cat && <option key={cat}>{cat}</option>
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

      {/* AG Grid */}
      <div className="ag-theme-quartz" style={{ height: 500, width: "100%" }}>
        <AgGridReact
          rowData={paginated}
          columnDefs={columnDefs}
          animateRows={true}
          suppressMovableColumns={true}
        />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-4 gap-3 text-sm">
          <button
            disabled={currentPage === 1}
            onClick={() => goToPage(currentPage - 1)}
            className="px-3 py-1 border rounded"
          >
            Prev
          </button>

          <span>
            Page {currentPage} of {totalPages}
          </span>

          <button
            disabled={currentPage === totalPages}
            onClick={() => goToPage(currentPage + 1)}
            className="px-3 py-1 border rounded"
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
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6">
            <BulkUploadModal
              onClose={() => setShowBulk(false)}
              onComplete={() => loadParts()}
            />
          </div>
        </div>
      )}

      {/* Image Zoom */}
      {zoomImage && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
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

      {/* Bold Headers */}
      <style>{`
        .ag-theme-quartz {
          --ag-header-font-weight: 700;
        }
      `}</style>

      {/* ⭐ NEW — PART DETAIL MODAL for clicking Part # */}
      {showDetail && (
        <PartDetail
          part={selectedPart}
          onClose={() => setShowDetail(false)}
        />
      )}
    </div>
  );
}
