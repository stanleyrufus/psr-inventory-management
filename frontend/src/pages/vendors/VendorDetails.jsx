// src/components/VendorDetail.jsx
import React from "react";

export default function VendorDetail({ vendor, onClose }) {
  if (!vendor) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-800">
            {vendor.vendor_name || "Vendor Details"}
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
              <span className="font-medium text-gray-700">Contact Name:</span>{" "}
              {vendor.contact_name || "—"}
            </p>
            <p>
              <span className="font-medium text-gray-700">Phone:</span>{" "}
              {vendor.phone || "—"}
            </p>
            <p>
              <span className="font-medium text-gray-700">Email:</span>{" "}
              {vendor.email || "—"}
            </p>
            <p>
              <span className="font-medium text-gray-700">Website:</span>{" "}
              {vendor.website || "—"}
            </p>
          </div>

          <div>
            <p>
              <span className="font-medium text-gray-700">Status:</span>{" "}
              {vendor.isactive ? (
                <span className="text-green-700 font-medium">Active</span>
              ) : (
                <span className="text-gray-500">Inactive</span>
              )}
            </p>
            <p>
              <span className="font-medium text-gray-700">Discount:</span>{" "}
              {vendor.discount ? `${vendor.discount}%` : "—"}
            </p>
            <p>
              <span className="font-medium text-gray-700">Preferred Carrier:</span>{" "}
              {vendor.preferredcarrier || "—"}
            </p>
            <p>
              <span className="font-medium text-gray-700">Currency:</span>{" "}
              {vendor.currencycode || "USD"}
            </p>
          </div>
        </div>

        {/* Address Info */}
        <div className="mt-5 border-t pt-3">
          <h3 className="font-medium text-gray-800 mb-1">Address</h3>
          <p className="text-sm text-gray-700 whitespace-pre-line">
            {[vendor.address1, vendor.address2].filter(Boolean).join("\n") || "—"}
          </p>
          <p className="text-sm text-gray-700 mt-1">
            {[vendor.city, vendor.state, vendor.country]
              .filter(Boolean)
              .join(", ")}{" "}
            {vendor.postal_code ? ` ${vendor.postal_code}` : ""}
          </p>
        </div>

        {/* Payment / Terms */}
        <div className="mt-5 border-t pt-3 grid grid-cols-2 gap-3 text-sm">
          <p>
            <span className="font-medium text-gray-700">Payment Terms:</span>{" "}
            {vendor.payment_terms || "—"}
          </p>
          <p>
            <span className="font-medium text-gray-700">Payment Method:</span>{" "}
            {vendor.payment_method || "—"}
          </p>
          <p>
            <span className="font-medium text-gray-700">Tax Scheme:</span>{" "}
            {vendor.taxingscheme || "—"}
          </p>
          <p>
            <span className="font-medium text-gray-700">Tax Inclusive Pricing:</span>{" "}
            {vendor.istaxinclusivepricing ? "Yes" : "No"}
          </p>
        </div>

        {/* Remarks */}
        <div className="mt-5 border-t pt-3">
          <h3 className="font-medium text-gray-800 mb-1">Remarks</h3>
          <p className="text-gray-600 text-sm whitespace-pre-line">
            {vendor.remarks || "—"}
          </p>
        </div>

<div className="flex justify-end gap-3 mt-6 border-t pt-4">
  <button
    className="px-4 py-2 bg-blue-600 text-white rounded"
    onClick={() => {
      onClose();     // close details modal
      window.__openVendorEdit?.(vendor); // trigger edit from parent
    }}
  >
    Edit Vendor
  </button>

  <button
    className="px-4 py-2 bg-red-600 text-white rounded"
    onClick={() => window.__deleteVendor?.(vendor.vendor_id, vendor.vendor_name)}
  >
    Delete Vendor
  </button>
</div>

        {/* Footer Info */}
        <div className="mt-6 text-xs text-gray-500 border-t pt-3">
          <p>
            <span className="font-medium">Created On:</span>{" "}
            {vendor.created_on
              ? new Date(vendor.created_on).toLocaleString()
              : "—"}
          </p>
          <p>
            <span className="font-medium">Updated On:</span>{" "}
            {vendor.updated_on
              ? new Date(vendor.updated_on).toLocaleString()
              : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
