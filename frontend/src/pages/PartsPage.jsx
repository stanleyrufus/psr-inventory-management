// frontend/src/pages/PartsPage.jsx
import { hasPermission } from "../utils/permissions";
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

console.log("PARTS PAGE API DATA:", data);
console.log("FIRST PART LAST VENDOR:", data?.[0]?.last_vendor_name);
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
  p.description?.toLowerCase().includes(q) ||
  p.last_vendor_name?.toLowerCase().includes(q);

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

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setStatusFilter("");
    setCurrentPage(1);
  };

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
        className="w-12 h-12 object-contain rounded border cursor-pointer"
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

      {/* VIEW always allowed if page loaded */}
      <button
        className="text-blue-600 text-sm underline"
        onClick={() => setViewingPart(row)}
      >
        View
      </button>

      {/* EDIT */}
<button
  type="button"
  disabled={!canEditParts}
  className={`text-sm underline ${
    canEditParts
      ? "text-gray-700"
      : "text-gray-400 cursor-not-allowed opacity-60"
  }`}
  onClick={() => {
    if (!canEditParts) return;
    setEditingPart(row);
    setShowForm(true);
  }}
>
  Edit
</button>

      {/* DELETE */}
<button
  type="button"
  disabled={!canDeleteParts}
  className={`text-sm underline ${
    canDeleteParts
      ? "text-red-600"
      : "text-gray-400 cursor-not-allowed opacity-60"
  }`}
  onClick={() => {
    if (!canDeleteParts) return;
    handleDelete(row.part_id, row.part_name);
  }}
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
  headerName: "Part Name",
  field: "part_name",
  minWidth: 250,
  flex: 2,
  filter: true,
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

{
  headerName: "Last Vendor",
  field: "last_vendor_name",
  width: 180,
  minWidth: 150,
},
{
  headerName: "Status",
  field: "status",
  width: 110,
  cellRenderer: StatusRenderer,
},
  ];


const canViewParts = hasPermission("view_parts");
const canEditParts = hasPermission("edit_parts");
const canDeleteParts = hasPermission("delete_parts");

console.log("Parts permissions:", {
  canViewParts,
  canEditParts,
  canDeleteParts,
});

if (!canViewParts) {
  return (
    <div className="p-6 text-red-600 font-medium">
      You do not have permission to view parts.
    </div>
  );
}

return (
  <div className="p-4 md:p-6 lg:p-8">


        {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
<h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Inventory Dashboard
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Manage all parts, components, and materials
          </p>
        </div>

        <div className="flex gap-2 md:gap-3">
          <button
  onClick={() => {
    if (!canEditParts) {
      alert("You do not have permission to add parts.");
      return;
    }
    setEditingPart(null);
    setShowForm(true);
  }}
  className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm ${
    canEditParts
      ? "bg-green-600 hover:bg-green-700 text-white"
      : "bg-gray-300 text-gray-500 cursor-not-allowed"
  }`}
>
  ➕ Add Part
</button>

          <button
            onClick={() => setShowBulk(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium rounded-lg shadow-sm"
          >
            ⬆️ Bulk Upload
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4 mb-5">
      <div className="flex flex-wrap gap-3 md:gap-4 items-center">
        <input
          type="text"
          placeholder="Search part #, name, description, vendor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg bg-white shadow-sm px-3 py-2 w-full md:w-72 lg:w-80 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
        />

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-gray-300 rounded-lg bg-white shadow-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
        >
          <option value="">All Categories</option>
          {[...new Set(parts.map((p) => p.category))].map(
            (cat) => cat && <option key={cat}>{cat}</option>
          )}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg bg-white shadow-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
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
          className="border border-gray-300 rounded-lg bg-white shadow-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
        >
          {[10, 25, 50].map((n) => (
            <option key={n} value={n}>
              Show {n} per page
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={clearFilters}
          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
        >
          Clear Filters
        </button>
      </div>
      </div>

     {/* AG Grid + Pagination */}
<div className="bg-white shadow-md rounded-xl p-3 md:p-5">
<div className="ag-theme-quartz" style={{ width: "100%" }}>
<AgGridReact
  rowData={paginated}
  columnDefs={columnDefs}
  defaultColDef={{
    resizable: true,
    minWidth: 90,
    unSortIcon: true,
  }}
  animateRows={true}
  suppressMovableColumns={true}
  domLayout="autoHeight"
  rowHeight={60}
  onGridReady={(params) => params.api.sizeColumnsToFit()}
  onFirstDataRendered={(params) => params.api.sizeColumnsToFit()}
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

      {/* Bold Headers + Sort Affordance */}
      <style>{`
        .ag-theme-quartz {
          --ag-header-font-weight: 700;
        }
        .ag-theme-quartz .ag-header-cell-sortable .ag-sort-none-icon {
          opacity: 0.35;
        }
        .ag-theme-quartz .ag-header-cell-sortable:hover .ag-sort-none-icon {
          opacity: 0.6;
        }
        .ag-theme-quartz .ag-header-cell-sortable:hover {
          background-color: rgba(0, 0, 0, 0.04);
        }
      `}</style>

      {/* ⭐ NEW — PART DETAIL MODAL for clicking Part # */}
      {showDetail && (
        <PartDetail part={selectedPart} onClose={() => setShowDetail(false)} />
      )}
    </div>
  );
}
