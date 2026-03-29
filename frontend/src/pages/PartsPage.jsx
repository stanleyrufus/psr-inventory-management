// frontend/src/pages/PartsPage.jsx
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AgGridReact } from "ag-grid-react";
import api from "../utils/api";
import PartForm from "../components/forms/PartForm";
import BulkUploadModal from "../components/modals/BulkUploadModal";
import PartDetail from "../components/PartDetail";


export default function PartsPage() {

  const location = useLocation();
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

const BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const FILE_BASE = BASE.replace(/\/api$/, "");
   

  // ⭐ NEW: safe image URL normalizer
const normalizeImageUrl = (raw) => {
  if (!raw) return null;

  let clean = String(raw).trim();

  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    return clean;
  }

  const uploadsIndex = clean.indexOf("/uploads");
  if (uploadsIndex !== -1) {
    clean = clean.substring(uploadsIndex);
  }

  if (!clean.startsWith("/")) {
    clean = "/" + clean;
  }

  if (clean.startsWith("/uploads/")) {
    return `${FILE_BASE}${clean}`;
  }

  if (clean.startsWith("/images/")) {
    return clean;
  }

  return clean;
};

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
    const openPartId = location.state?.openPartId;
    if (!openPartId || parts.length === 0) return;

    const found = parts.find(
      (p) => String(p.part_id) === String(openPartId)
    );

    if (found) {
      setSelectedPart(found);
      setShowDetail(true);
    }
  }, [location.state, parts]);

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
   ✅ CELL RENDERERS (Updated for multi-image support)
*************************************/

 function getPartImageUrl(image_url) {
  if (!image_url) return "/no-image.png";

  let firstPath = image_url;

  try {
    const parsed = JSON.parse(image_url);
    if (Array.isArray(parsed) && parsed.length > 0) {
      firstPath = parsed[0];
    }
  } catch (e) {
    // single string → do nothing
  }

  firstPath = String(firstPath).trim();

  if (!firstPath) return "/no-image.png";

  if (/^https?:\/\//i.test(firstPath)) {
    return firstPath;
  }

  if (firstPath.startsWith("/images/")) {
    return firstPath;
  }
  if (firstPath.startsWith("images/")) {
    return `/${firstPath}`;
  }

  if (firstPath.startsWith("/uploads/")) {
    return `${FILE_BASE}${firstPath}`;
  }
  if (firstPath.startsWith("uploads/")) {
    return `${FILE_BASE}/${firstPath}`;
  }

  if (firstPath.startsWith("/")) {
    return firstPath;
  }

  return `${FILE_BASE}/uploads/parts/${firstPath}`;
}


 const ImageRenderer = (props) => {
  const url = getPartImageUrl(props.value);

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="flex items-center justify-center h-full"
      title="Open image in new tab"
    >
      <img
        src={url}
        className="w-12 h-12 object-cover rounded border cursor-pointer"
        onError={(e) => {
          e.currentTarget.src = "/no-image.png";
          e.currentTarget.onerror = null;
        }}
      />
    </a>
  );
};

  const StatusRenderer = (props) => {
    const s = props.value || "Unknown";
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          s === "Active" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
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

    // ⭐ NEW DESCRIPTION COLUMN
    {
      headerName: "Description",
      field: "description",
      flex: 2,
      wrapText: true,
      autoHeight: true,
    },

    {
      headerName: "Last Price",
      width: 110,
      valueFormatter: (p) => {
        const v = p.data.last_unit_price ?? p.data.unit_price ?? null;
        return v ? "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-";
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
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-sm rounded shadow"
          >
            ➕ Add Part
          </button>

          <button
            onClick={() => setShowBulk(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-sm rounded shadow"
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

     {/* AG Grid + Pagination */}
<div className="bg-white shadow-md rounded-lg p-2">
<div className="ag-theme-quartz" style={{ width: "100%" }}>
  <AgGridReact
    rowData={paginated}
    columnDefs={columnDefs}
    animateRows={true}
    suppressMovableColumns={true}
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
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-sm rounded shadow inline-block"
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
        <PartDetail part={selectedPart} onClose={() => setShowDetail(false)} />
      )}
    </div>
  );
}
