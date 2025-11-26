// frontend/src/components/PartDetail.jsx
import React, { useState } from "react";

/**
 * Helper 1: turn DB image_url into an array of relative paths
 * Supports:
 *  - JSON string: ["\/uploads/parts/a.jpg","/uploads/parts/b.jpg"]
 *  - Single string: "/uploads/parts/a.jpg"
 *  - Null / empty: []
 */
function getPartImagePaths(image_url) {
  if (!image_url) return [];

  // Try JSON array first (new format)
  try {
    const parsed = JSON.parse(image_url);
    if (Array.isArray(parsed)) {
      return parsed.filter(Boolean);
    }
  } catch (e) {
    // Not JSON → fall through
  }

  // Old format: single string path
  if (typeof image_url === "string" && image_url.trim() !== "") {
    return [image_url.trim()];
  }

  return [];
}

/**
 * Helper 2: turn a relative "/uploads/parts/xxx.jpg" into
 * an absolute URL using VITE_API_URL
 */
function makeAbsoluteUrl(relativePath) {
  if (!relativePath) return null;

  // Ensure starts with "/"
  let clean = relativePath.trim();
  const uploadsIndex = clean.indexOf("/uploads");
  if (uploadsIndex !== -1) {
    clean = clean.substring(uploadsIndex);
  }
  if (!clean.startsWith("/")) {
    clean = "/" + clean;
  }

  const base = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(
    /\/$/,
    ""
  );

  return `${base}${clean}`;
}

export default function PartDetail({ part, onClose }) {
  if (!part) return null;

  // 🔹 Build full image URL array
  const imagePaths = getPartImagePaths(part.image_url);
  const imageUrls = imagePaths.map(makeAbsoluteUrl).filter(Boolean);
  const hasImages = imageUrls.length > 0;

  // 🔹 Main image index for gallery
  const [mainIndex, setMainIndex] = useState(0);
  const [zoom, setZoom] = useState(false);

  const mainImageUrl = hasImages ? imageUrls[mainIndex] : null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      {/* Main container */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6 relative overflow-y-auto max-h-[90vh]">
        {/* ⭐ TOP RIGHT ACTION BAR */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {/* Edit */}
          <button
            className="bg-blue-600 text-white px-3 py-1 rounded text-xs"
            onClick={() => {
              onClose();
              window.dispatchEvent(
                new CustomEvent("edit-part", { detail: part })
              );
            }}
          >
            ✏️ Edit
          </button>

          {/* Delete */}
          <button
            className="bg-red-600 text-white px-3 py-1 rounded text-xs"
            onClick={() => {
              if (!window.confirm("Delete this part permanently?")) return;

              fetch(
                `${import.meta.env.VITE_API_URL}/api/parts/${part.part_id}`,
                {
                  method: "DELETE",
                }
              )
                .then(() => {
                  alert("Deleted successfully.");
                  onClose();
                  window.dispatchEvent(new Event("reload-parts"));
                })
                .catch((err) => {
                  console.error(err);
                  alert("Delete failed.");
                });
            }}
          >
            🗑 Delete
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-xl font-bold px-2"
          >
            ✕
          </button>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-semibold text-gray-800 mb-5 pr-8">
          {part.part_name || "Part Details"}
        </h2>

        {/* Image + Info Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Image + thumbnails */}
          <div className="flex flex-col items-center gap-3">
            {hasImages ? (
              <>
                {/* Main image */}
                <img
                  src={mainImageUrl}
                  alt="Part"
                  className="w-40 h-40 object-cover rounded-lg border cursor-pointer"
                  onClick={() => setZoom(true)}
                  onError={(e) => {
                    e.target.src = "/no-image.png";
                    e.target.onerror = null;
                  }}
                />

                {/* Download button */}
                <button
                  className="bg-blue-600 text-white px-3 py-1 rounded text-xs"
                  onClick={() => window.open(mainImageUrl, "_blank")}
                >
                  ⬇ Download Image
                </button>

                {/* Thumbnails row */}
                {imageUrls.length > 1 && (
                  <div className="flex gap-2 mt-2 flex-wrap justify-center">
                    {imageUrls.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`thumb-${idx}`}
                        className={`w-12 h-12 object-cover rounded border cursor-pointer ${
                          idx === mainIndex
                            ? "ring-2 ring-blue-500"
                            : "opacity-80 hover:opacity-100"
                        }`}
                        onClick={() => setMainIndex(idx)}
                        onError={(e) => {
                          e.target.src = "/no-image.png";
                          e.target.onerror = null;
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="w-40 h-40 rounded-lg border bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                No Image
              </div>
            )}
          </div>

          {/* Info */}
          <div className="md:col-span-2 grid grid-cols-2 gap-4 text-sm">
            <Detail label="Part Number" value={part.part_number} />
            <Detail label="Category" value={part.category} />
            <Detail
              label="Unit Price"
              value={
                part.unit_price || part.current_unit_price
                  ? `$${Number(
                      part.unit_price ?? part.current_unit_price
                    ).toFixed(2)}`
                  : "—"
              }
            />
            <Detail
              label="Quantity On Hand"
              value={part.quantity_on_hand}
            />
            <Detail
              label="Minimum Stock Level"
              value={part.minimum_stock_level}
            />
            <Detail label="Material" value={part.material} />
            <Detail label="UOM" value={part.uom} />
            <Detail label="Weight (kg)" value={part.weight_kg} />
            <Detail label="Lead Time (days)" value={part.lead_time_days} />
            <Detail label="Machine Name" value={part.machine_name} />
            <Detail label="Location" value={part.location} />
            <Detail
              label="Status"
              value={
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    part.status === "Active"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {part.status || "Unknown"}
                </span>
              }
            />
          </div>
        </div>

        {/* Vendor / PO Info */}
        <div className="mt-4 border-t pt-4">
          <h3 className="font-semibold text-gray-800 mb-2">
            Last Vendor &amp; PO
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <Detail label="Last Vendor Name" value={part.last_vendor_name} />
            <Detail label="Last PO Number" value={part.last_po_number} />
            <Detail
              label="Last PO Date"
              value={
                part.last_po_date
                  ? new Date(part.last_po_date).toLocaleDateString()
                  : "—"
              }
            />
            <Detail
              label="Last Payment Terms"
              value={part.last_payment_terms}
            />
            <Detail
              label="Last Payment Method"
              value={part.last_payment_method}
            />
            <Detail
              label="Currency"
              value={part.last_currency_code || "USD"}
            />
          </div>
        </div>

        {/* Description */}
        <div className="mt-6">
          <h3 className="font-semibold text-gray-800 mb-1">Description</h3>
          <p className="text-gray-600 text-sm whitespace-pre-line">
            {part.description || "—"}
          </p>
        </div>

        {/* Remarks */}
        <div className="mt-4">
          <h3 className="font-semibold text-gray-800 mb-1">Remarks</h3>
          <p className="text-gray-600 text-sm whitespace-pre-line">
            {part.remarks || "—"}
          </p>
        </div>

        {/* Footer timestamps */}
        <div className="mt-6 text-xs text-gray-500 border-t pt-3">
          <p>
            <span className="font-medium">Created On:</span>{" "}
            {part.created_on
              ? new Date(part.created_on).toLocaleString()
              : "—"}
          </p>
          <p>
            <span className="font-medium">Updated On:</span>{" "}
            {part.updated_on
              ? new Date(part.updated_on).toLocaleString()
              : "—"}
          </p>
        </div>
      </div>

      {/* Fullscreen Zoom */}
      {zoom && mainImageUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[999]">
          <img
            src={mainImageUrl}
            className="max-w-[90vw] max-h-[90vh] rounded shadow-lg"
          />
          <button
            onClick={() => setZoom(false)}
            className="absolute top-4 right-6 text-white text-3xl font-bold"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-gray-500 text-xs uppercase">{label}</p>
      <p className="text-gray-800 text-sm font-medium">
        {value || value === 0 ? value : "—"}
      </p>
    </div>
  );
}
