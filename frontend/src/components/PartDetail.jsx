import React from "react";

export default function PartDetail({ part, onClose }) {
  if (!part) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-2xl font-semibold text-gray-800">
            {part.part_name || "Part Details"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Primary Info */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
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

        {/* Vendor / PO Info */}
        <div className="mt-6 border-t pt-4">
          <h3 className="font-semibold text-gray-800 mb-2">Last Vendor & PO</h3>
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
            <Detail label="Last Payment Terms" value={part.last_payment_terms} />
            <Detail label="Last Payment Method" value={part.last_payment_method} />
            <Detail label="Currency" value={part.last_currency_code || "USD"} />
          </div>
        </div>

        {/* Description / Remarks */}
        <div className="mt-6">
          <h3 className="font-semibold text-gray-800 mb-1">Description</h3>
          <p className="text-gray-600 text-sm whitespace-pre-line">
            {part.description || "—"}
          </p>
        </div>

        <div className="mt-4">
          <h3 className="font-semibold text-gray-800 mb-1">Remarks</h3>
          <p className="text-gray-600 text-sm whitespace-pre-line">
            {part.remarks || "—"}
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 text-xs text-gray-500 border-t pt-3">
          <p>
            <span className="font-medium">Created On:</span>{" "}
            {part.created_on ? new Date(part.created_on).toLocaleString() : "—"}
          </p>
          <p>
            <span className="font-medium">Updated On:</span>{" "}
            {part.updated_on ? new Date(part.updated_on).toLocaleString() : "—"}
          </p>
        </div>
      </div>
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
