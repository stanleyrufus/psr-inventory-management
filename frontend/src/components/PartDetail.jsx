// frontend/src/components/PartDetail.jsx
import React from "react";

export default function PartDetail({ part, onClose }) {
  if (!part) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-800">
            {part.part_name || "Part Details"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-lg"
          >
            ✕
          </button>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p>
              <span className="font-medium text-gray-700">Part Number:</span>{" "}
              {part.part_number}
            </p>
            <p>
              <span className="font-medium text-gray-700">Category:</span>{" "}
              {part.category || "—"}
            </p>
            <p>
              <span className="font-medium text-gray-700">UOM:</span>{" "}
              {part.uom || "—"}
            </p>
            <p>
              <span className="font-medium text-gray-700">Quantity on Hand:</span>{" "}
              {part.quantity_on_hand ?? "—"}
            </p>
            <p>
              <span className="font-medium text-gray-700">Min Stock:</span>{" "}
              {part.minimum_stock_level ?? "—"}
            </p>
            <p>
              <span className="font-medium text-gray-700">Unit Price:</span>{" "}
              {part.unit_price ? `$${part.unit_price}` : "—"}
            </p>
          </div>

          <div>
            <p>
              <span className="font-medium text-gray-700">Supplier:</span>{" "}
              {part.supplier_name || "—"}
            </p>
            <p>
              <span className="font-medium text-gray-700">Supplier Part #:</span>{" "}
              {part.supplier_part_number || "—"}
            </p>
            <p>
              <span className="font-medium text-gray-700">Lead Time (days):</span>{" "}
              {part.lead_time_days || "—"}
            </p>
            <p>
              <span className="font-medium text-gray-700">Weight (kg):</span>{" "}
              {part.weight_kg || "—"}
            </p>
            <p>
              <span className="font-medium text-gray-700">Material:</span>{" "}
              {part.material || "—"}
            </p>
            <p>
              <span className="font-medium text-gray-700">Status:</span>{" "}
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  part.status === "Active"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {part.status || "Unknown"}
              </span>
            </p>
          </div>
        </div>

        {/* Description + Remarks */}
        <div className="mt-4">
          <h3 className="font-medium text-gray-800 mb-1">Description</h3>
          <p className="text-gray-600 text-sm whitespace-pre-line">
            {part.description || "—"}
          </p>
        </div>

        <div className="mt-4">
          <h3 className="font-medium text-gray-800 mb-1">Remarks</h3>
          <p className="text-gray-600 text-sm whitespace-pre-line">
            {part.remarks || "—"}
          </p>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-xs text-gray-500 border-t pt-3">
          <p>
            <span className="font-medium">Location:</span>{" "}
            {part.location || "—"}
          </p>
          <p>
            <span className="font-medium">Last Order Date:</span>{" "}
            {part.last_order_date
              ? new Date(part.last_order_date).toLocaleDateString()
              : "—"}
          </p>
          <p>
            <span className="font-medium">Created At:</span>{" "}
            {part.created_at
              ? new Date(part.created_at).toLocaleString()
              : "—"}
          </p>
          <p>
            <span className="font-medium">Updated At:</span>{" "}
            {part.updated_at
              ? new Date(part.updated_at).toLocaleString()
              : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
