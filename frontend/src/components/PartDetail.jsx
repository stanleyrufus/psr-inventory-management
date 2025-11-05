import React, { useState } from "react";

export default function PartDetail({ part, onClose }) {
  if (!part) return null;

  const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const imageUrl = part.image_url
    ? `${BASE}${part.image_url?.startsWith("/") ? part.image_url : `/uploads/parts/${part.image_url}`}`
    : null;

  const [zoom, setZoom] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      {/* Main container */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6 relative overflow-y-auto max-h-[90vh]">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl"
        >
          ✕
        </button>

        {/* Title */}
        <h2 className="text-2xl font-semibold text-gray-800 mb-5 pr-8">
          {part.part_name || "Part Details"}
        </h2>

        {/* Image + Info Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

          {/* ✅ Image Block */}
          <div className="flex flex-col items-center gap-3">
            {imageUrl ? (
              <>
                <img
                  src={imageUrl}
                  alt="Part"
                  className="w-40 h-40 object-cover rounded-lg border cursor-pointer"
                  onClick={() => setZoom(true)}
                />
                <button
                  className="bg-blue-600 text-white px-3 py-1 rounded text-xs"
                  onClick={() => window.open(imageUrl, "_blank")}
                >
                  ⬇ Download Image
                </button>
              </>
            ) : (
              <div className="w-40 h-40 rounded-lg border bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                No Image
              </div>
            )}
          </div>

          {/* ✅ Primary Info */}
          <div className="md:col-span-2 grid grid-cols-2 gap-4 text-sm">
            <Detail label="Part Number" value={part.part_number} />
            <Detail label="Category" value={part.category} />
            <Detail label="Unit Price" value={part.unit_price ? `$${part.unit_price}` : "—"} />
            <Detail label="Quantity On Hand" value={part.quantity_on_hand} />
            <Detail label="Minimum Stock Level" value={part.minimum_stock_level} />
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
          <h3 className="font-semibold text-gray-800 mb-2">Last Vendor & PO</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <Detail label="Last Vendor Name" value={part.last_vendor_name} />
            <Detail label="Last PO Number" value={part.last_po_number} />
            <Detail
              label="Last PO Date"
              value={part.last_po_date ? new Date(part.last_po_date).toLocaleDateString() : "—"}
            />
            <Detail label="Last Payment Terms" value={part.last_payment_terms} />
            <Detail label="Last Payment Method" value={part.last_payment_method} />
            <Detail label="Currency" value={part.last_currency_code || "USD"} />
          </div>
        </div>

        {/* Description */}
        <div className="mt-6">
          <h3 className="font-semibold text-gray-800 mb-1">Description</h3>
          <p className="text-gray-600 text-sm whitespace-pre-line">{part.description || "—"}</p>
        </div>

        {/* Remarks */}
        <div className="mt-4">
          <h3 className="font-semibold text-gray-800 mb-1">Remarks</h3>
          <p className="text-gray-600 text-sm whitespace-pre-line">{part.remarks || "—"}</p>
        </div>

        {/* Footer */}
        <div className="mt-6 text-xs text-gray-500 border-t pt-3">
          <p><span className="font-medium">Created On:</span> {part.created_on ? new Date(part.created_on).toLocaleString() : "—"}</p>
          <p><span className="font-medium">Updated On:</span> {part.updated_on ? new Date(part.updated_on).toLocaleString() : "—"}</p>
        </div>
      </div>

      {/* ✅ Zoom Overlay */}
      {zoom && imageUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[999]">
          <img src={imageUrl} className="max-w-[90vw] max-h-[90vh] rounded shadow-lg" />
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
      <p className="text-gray-800 text-sm font-medium">{value || value === 0 ? value : "—"}</p>
    </div>
  );
}
