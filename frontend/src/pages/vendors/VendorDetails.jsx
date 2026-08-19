// src/pages/vendors/VendorDetails.jsx
import React, { useState, useEffect } from "react";
import { fetchVendorPurchaseOrders, deleteVendor } from "../../utils/api";
import { hasPermission } from "../../utils/permissions";

export default function VendorDetails({ vendor, onClose, onDeleted, onEdit }) {
  const [deleting, setDeleting] = useState(false);
const [linkedPOs, setLinkedPOs] = useState([]);
const [poLoading, setPoLoading] = useState(false);
  const canEditVendors = hasPermission("edit_vendors");
  const canDeleteVendors = hasPermission("delete_vendors");

  if (!vendor) return null;

useEffect(() => {
  const loadPOs = async () => {
    try {
      setPoLoading(true);
      const res = await fetchVendorPurchaseOrders(vendor.vendor_id);
      setLinkedPOs(res?.data || []);
    } catch (err) {
      console.error("❌ Error loading vendor POs:", err);
      setLinkedPOs([]);
    } finally {
      setPoLoading(false);
    }
  };

  if (vendor?.vendor_id) {
    loadPOs();
  }
}, [vendor]);

  const handleDelete = async () => {
    if (deleting) return;
    if (!canDeleteVendors) return;

    const ok = window.confirm(
      `Are you sure you want to delete vendor "${vendor.vendor_name}"?`
    );
    if (!ok) return;

    try {
      setDeleting(true);
      await deleteVendor(vendor.vendor_id);

      // ✅ tell parent so it can close + refresh state
      onDeleted?.(vendor.vendor_id);
    } catch (err) {
      console.error("❌ Error deleting vendor:", err);
      alert(err?.response?.data?.message || "Failed to delete vendor");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl border border-gray-300 w-full max-w-3xl p-6 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-3 mb-4">
          <h2 className="min-w-0 flex-1 text-2xl font-bold text-gray-900 leading-tight break-words">
            {vendor.vendor_name || "Vendor Details"}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            <button
              className={`min-w-[80px] h-9 px-4 rounded-lg text-sm font-medium shadow-sm transition-colors ${
                canEditVendors
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed opacity-60"
              }`}
              disabled={deleting || !canEditVendors}
              onClick={() => {
                if (!canEditVendors) return;
                onEdit?.(vendor);
              }}
            >
              Edit
            </button>
            <button
              className={`min-w-[80px] h-9 px-4 rounded-lg text-sm font-medium shadow-sm transition-colors ${
                canDeleteVendors
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed opacity-60"
              }`}
              disabled={deleting || !canDeleteVendors}
              onClick={handleDelete}
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
            <button
              onClick={onClose}
              className="h-9 w-9 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 text-xl shrink-0"
              disabled={deleting}
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-gray-50 border border-gray-300 rounded-xl p-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
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
              <span className="font-medium text-gray-700">
                Preferred Carrier:
              </span>{" "}
              {vendor.preferredcarrier || "—"}
            </p>
            <p>
              <span className="font-medium text-gray-700">Currency:</span>{" "}
              {vendor.currencycode || "USD"}
            </p>
          </div>
        </div>

        {/* Address */}
        <div className="mt-4 bg-gray-50/40 border border-gray-300 rounded-xl p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-2">Address</h3>
          <p className="text-sm text-gray-700 whitespace-pre-line">
            {[vendor.address1, vendor.address2].filter(Boolean).join("\n") || "—"}
          </p>
          <p className="text-sm text-gray-700 mt-1">
            {[vendor.city, vendor.state, vendor.country].filter(Boolean).join(", ")}{" "}
            {vendor.postal_code ? ` ${vendor.postal_code}` : ""}
          </p>
        </div>

        {/* Payment / Terms */}
        <div className="mt-4 bg-gray-50/40 border border-gray-300 rounded-xl p-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
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
            <span className="font-medium text-gray-700">
              Tax Inclusive Pricing:
            </span>{" "}
            {vendor.istaxinclusivepricing ? "Yes" : "No"}
          </p>
        </div>

        {/* Remarks */}
        <div className="mt-4 bg-gray-50/40 border border-gray-300 rounded-xl p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-2">Remarks</h3>
          <p className="text-gray-600 text-sm whitespace-pre-line">
            {vendor.remarks || "—"}
          </p>
        </div>

{/* Linked Purchase Orders */}
<div className="mt-4 bg-gray-50/40 border border-gray-300 rounded-xl p-4">
  <h3 className="text-base font-semibold text-gray-900 mb-3">
    Linked Purchase Orders
  </h3>

  {poLoading ? (
    <p className="text-sm text-gray-500">Loading...</p>
  ) : linkedPOs.length === 0 ? (
    <p className="text-sm text-gray-500">No purchase orders found.</p>
  ) : (
    <div className="max-h-40 overflow-y-auto border rounded">
      <table className="w-full text-[13px] border-collapse">
        <thead className="bg-gray-50 font-bold text-gray-900">
          <tr>
            <th className="h-9 px-3 py-0 border-b border-gray-300 border-r border-gray-200 last:border-r-0 text-left align-middle">PO #</th>
<th className="h-9 px-3 py-0 border-b border-gray-300 border-r border-gray-200 last:border-r-0 text-left align-middle">Status</th>
<th className="h-9 px-3 py-0 border-b border-gray-300 border-r border-gray-200 last:border-r-0 text-left align-middle">Order Date</th>
<th className="h-9 px-3 py-0 border-b border-gray-300 border-r border-gray-200 last:border-r-0 text-left align-middle">Total</th>
<th className="h-9 px-3 py-0 border-b border-gray-300 border-r border-gray-200 last:border-r-0 text-left align-middle">Action</th>
          </tr>
        </thead>
        <tbody>
  {linkedPOs.map((po) => (
    <tr key={po.id} className="hover:bg-gray-50 transition-colors">
      <td className="p-2">{po.psr_po_number}</td>

      <td className="p-2">{po.status}</td>

      <td className="p-2">
        {po.order_date
          ? new Date(po.order_date).toLocaleDateString()
          : "—"}
      </td>

      <td className="p-2">{po.grand_total}</td>

      <td className="p-2">
        <button
          className="text-blue-600 hover:underline"
          onClick={() => window.location.href = `/purchase-orders/${po.id}`}
        >
          View
        </button>
      </td>
    </tr>
  ))}
</tbody>
      </table>
    </div>
  )}
</div>

        {/* Footer */}
        <div className="mt-4 bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-xs text-gray-500">
          <p>
            <span className="font-medium">Created On:</span>{" "}
            {vendor.created_on ? new Date(vendor.created_on).toLocaleString() : "—"}
          </p>
          <p>
            <span className="font-medium">Updated On:</span>{" "}
            {vendor.updated_on ? new Date(vendor.updated_on).toLocaleString() : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}