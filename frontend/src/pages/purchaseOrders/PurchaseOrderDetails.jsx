import React from "react";

const money = (v) => (v == null ? "-" : `$${Number(v).toFixed(2)}`);

export default function PurchaseOrderDetails({ order, onClose }) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl p-6 overflow-y-auto max-h-[95vh]">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-800">
            Purchase Order — {order.psr_po_number}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-lg"
          >
            ✕
          </button>
        </div>

        {/* Top meta */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p><span className="font-medium text-gray-700">Supplier:</span> {order.supplier_name || "—"}</p>
            <p><span className="font-medium text-gray-700">Created By:</span> {order.created_by || "—"}</p>
            <p><span className="font-medium text-gray-700">Order Date:</span> {order.order_date ? new Date(order.order_date).toLocaleString() : "—"}</p>
            <p><span className="font-medium text-gray-700">Expected Delivery:</span> {order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString() : "—"}</p>
          </div>
          <div>
            <p><span className="font-medium text-gray-700">Status:</span> {order.status || "—"}</p>
            <p><span className="font-medium text-gray-700">Payment Terms:</span> {order.payment_terms || "—"}</p>
            <p><span className="font-medium text-gray-700">Currency:</span> {order.currency || "—"}</p>
            <p><span className="font-medium text-gray-700">Remarks:</span> {order.remarks || "—"}</p>
          </div>
        </div>

        {/* Totals */}
        <div className="mt-4 border rounded p-3 bg-gray-50">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div><span className="text-gray-600">Subtotal</span><div className="font-semibold">{money(order.subtotal)}</div></div>
            <div><span className="text-gray-600">Tax</span><div className="font-semibold">{money(order.tax_amount)}</div></div>
            <div><span className="text-gray-600">Shipping</span><div className="font-semibold">{money(order.shipping_charges)}</div></div>
            <div><span className="text-gray-600">Grand Total</span><div className="font-semibold">{money(order.grand_total)}</div></div>
          </div>
        </div>

        {/* Items (if provided) */}
        {Array.isArray(order.items) && order.items.length > 0 && (
          <>
            <h3 className="mt-6 font-semibold text-gray-800">Items</h3>
            <div className="overflow-x-auto mt-2">
              <table className="min-w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-2 py-1">Line</th>
                    <th className="border px-2 py-1">Part</th>
                    <th className="border px-2 py-1">Description</th>
                    <th className="border px-2 py-1 text-right">Qty</th>
                    <th className="border px-2 py-1 text-right">Unit Price</th>
                    <th className="border px-2 py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="border px-2 py-1">{it.line_no ?? idx + 1}</td>
                      <td className="border px-2 py-1">{it.part_id}</td>
                      <td className="border px-2 py-1">{it.description || "—"}</td>
                      <td className="border px-2 py-1 text-right">{it.quantity}</td>
                      <td className="border px-2 py-1 text-right">{money(it.unit_price)}</td>
                      <td className="border px-2 py-1 text-right">{money(it.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Files (if provided) */}
        {Array.isArray(order.files) && order.files.length > 0 && (
          <>
            <h3 className="mt-6 font-semibold text-gray-800">Attachments</h3>
            <ul className="list-disc pl-6 mt-1 text-sm">
              {order.files.map((f) => (
                <li key={f.id}>
                  <a
                    href={`${(import.meta.env.VITE_API_URL || "http://localhost:5000")}${f.filepath?.startsWith("/") ? "" : "/"}${f.filepath}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-700 hover:underline"
                  >
                    {f.original_filename} ({f.mime_type}, {f.size_bytes} bytes)
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
