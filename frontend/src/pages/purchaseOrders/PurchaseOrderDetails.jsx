// src/pages/purchaseOrders/PurchaseOrderDetails.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const money = (v) => (v == null ? "-" : `$${Number(v).toFixed(2)}`);

export default function PurchaseOrderDetails({ order: propOrder, onClose }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [fetchedOrder, setFetchedOrder] = useState(null);
  const [vendorInfo, setVendorInfo] = useState(null); // ✅ FIXED hook inside component
  const [loading, setLoading] = useState(false);

  // -------------------------------
  //  Load PO
  // -------------------------------
  useEffect(() => {
    if (propOrder) return;
    if (!id) return;

    setLoading(true);
    axios
      .get(`${BASE}/api/purchase_orders/${id}`)
      .then((res) => setFetchedOrder(res.data?.data || res.data || null))
      .catch((err) => {
        console.error("❌ Error loading PO:", err);
        alert("Failed to load Purchase Order details.");
      })
      .finally(() => setLoading(false));
  }, [id, propOrder]);

  const po = useMemo(() => {
    if (propOrder) return propOrder.data || propOrder;
    return fetchedOrder;
  }, [propOrder, fetchedOrder]);

  // -------------------------------
  //  Load Vendor details based on vendor_id from PO
  // -------------------------------
  useEffect(() => {
    if (!po?.vendor_id) return;

    axios
      .get(`${BASE}/api/vendors/${po.vendor_id}`)
      .then((res) => setVendorInfo(res.data?.data || res.data || null))
      .catch((err) => console.error("❌ Failed to load vendor info:", err));
  }, [po?.vendor_id]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!po) return <div className="p-6">Purchase Order not found.</div>;

  const items = Array.isArray(po.items) ? po.items : [];
  const files = Array.isArray(po.files) ? po.files : [];

  const handleClose = () => {
    if (onClose) onClose();
    else navigate("/purchase-orders");
  };

  const isModal = !!onClose;

  const Wrapper = ({ children }) =>
    isModal ? (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
        {children}
      </div>
    ) : (
      <div className="p-6 bg-white rounded shadow max-w-5xl mx-auto my-8">
        {children}
      </div>
    );

  // -------------------------------
  // Render
  // -------------------------------
  return (
    <Wrapper>
<style>
{`
  @media print {
    /* Hide everything */
    body * {
      visibility: hidden !important;
    }

    /* Show only the PO container */
    #print-po, #print-po * {
      visibility: visible !important;
    }

    /* Position the PO print block at the top-left */
    #print-po {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
    }

    /* Remove shadows for clean printing */
    .shadow, .shadow-md, .shadow-lg, .shadow-xl {
      box-shadow: none !important;
    }
  }
`}
</style>

    <div
  id="print-po"
  className={`bg-white rounded-lg shadow-xl w-full ${
    isModal ? "max-w-5xl p-6 overflow-y-auto max-h-[95vh]" : "p-6"
  }`}
>

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-800">
            Purchase Order — {po.psr_po_number}
          </h2>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="px-3 py-1 bg-gray-700 hover:bg-black text-white text-sm rounded shadow"
            >
              🖨 Print
            </button>

            <button
              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded shadow"
              onClick={() => alert("PDF Download route coming soon")}
            >
              ⬇️ Download
            </button>

            <button
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded shadow"
              onClick={() =>
                (window.location.href = `/purchase-orders/edit/${po.id}`)
              }
            >
              ✏️ Edit
            </button>

            <button
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded shadow"
              onClick={async () => {
                if (!window.confirm(`Delete PO "${po.psr_po_number}" permanently?`)) return;
                try {
                  await axios.delete(`${BASE}/api/purchase_orders/${po.id}`);
                  alert("✅ Purchase Order deleted");
                  handleClose();
                } catch (err) {
                  console.error(err);
                  alert("❌ Failed to delete purchase order");
                }
              }}
            >
              🗑 Delete
            </button>

            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 text-xl font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* TO / FROM SECTION */}
        <div className="grid grid-cols-2 gap-4 mt-6 mb-6">
          {/* TO — Vendor */}
<div className="border rounded-lg p-3 bg-gray-50 leading-tight text-sm">

  {/* Header: Vendor + Attn */}
  <h2 className="font-semibold text-gray-800 text-sm mb-1">
    TO — {vendorInfo?.vendor_name || po.vendor_name || "—"}
    {vendorInfo?.contact_name ? (
      <span className="text-gray-700"> (Attn: {vendorInfo.contact_name})</span>
    ) : null}
  </h2>

  {/* Compact Address Line (Address1, Address2) */}
  {(vendorInfo?.address1 || vendorInfo?.address2) && (
    <p className="text-gray-700">
      {(vendorInfo.address1 || "") +
        (vendorInfo.address2 ? `, ${vendorInfo.address2}` : "")}
    </p>
  )}

 {/* City, State, Zip, Country — all in one line */}
{(vendorInfo?.city ||
  vendorInfo?.state ||
  vendorInfo?.postal_code ||
  vendorInfo?.country) && (
  <p className="text-gray-700">
    {vendorInfo.city || ""}
    {vendorInfo.city && vendorInfo.state ? ", " : ""}
    {vendorInfo.state || ""}
    {(vendorInfo.city || vendorInfo.state) && vendorInfo.postal_code
      ? " "
      : ""}
    {vendorInfo.postal_code || ""}
    {(vendorInfo.city ||
      vendorInfo.state ||
      vendorInfo.postal_code) &&
    vendorInfo.country
      ? ", "
      : ""}
    {vendorInfo.country || ""}
  </p>
)}

  {/* Phone */}
  {vendorInfo?.phone && (
    <p className="text-gray-700 mt-1">📞 {vendorInfo.phone}</p>
  )}

  {/* Email */}
  {vendorInfo?.email && (
    <p className="text-gray-700">✉️ {vendorInfo.email}</p>
  )}
</div>


          {/* FROM — PSR */}
          <div className="border rounded-lg p-3 bg-gray-50 leading-tight text-sm">
            <h2 className="font-semibold text-gray-800 text-sm mb-1">
              FROM — PSR Automation Inc.
            </h2>

            <p className="text-gray-700">13318 Skyline Cir</p>
            <p className="text-gray-700">Shakopee, MN 55379, USA</p>

            <p className="text-gray-700 mt-1">📞 952-233-1441</p>
            <p className="text-gray-700">✉️ info@psrautomation.com</p>
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p>
              <span className="font-medium text-gray-700">Created By:</span>{" "}
              {po.created_by || "—"}
            </p>
            <p>
              <span className="font-medium text-gray-700">Order Date:</span>{" "}
              {po.order_date
                ? new Date(po.order_date).toLocaleDateString()
                : "—"}
            </p>
            <p>
              <span className="font-medium text-gray-700">
                Expected Delivery:
              </span>{" "}
              {po.expected_delivery_date
                ? new Date(po.expected_delivery_date).toLocaleDateString()
                : "—"}
            </p>
          </div>

          <div>
            <p>
              <span className="font-medium text-gray-700">Status:</span>{" "}
              {po.status || "—"}
            </p>
            <p>
              <span className="font-medium text-gray-700">Payment Terms:</span>{" "}
              {po.payment_terms || "—"}
            </p>
            <p>
              <span className="font-medium text-gray-700">Currency:</span>{" "}
              {po.currency || "—"}
            </p>
          </div>
        </div>

        {/* Totals */}
        <div className="mt-4 border rounded p-3 bg-gray-50">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Subtotal</span>
              <div className="font-semibold">{money(po.subtotal)}</div>
            </div>
            <div>
              <span className="text-gray-600">Tax</span>
              <div className="font-semibold">{money(po.tax_amount)}</div>
            </div>
            <div>
              <span className="text-gray-600">Shipping</span>
              <div className="font-semibold">{money(po.shipping_charges)}</div>
            </div>
            <div>
              <span className="text-gray-600">Grand Total</span>
              <div className="font-semibold">{money(po.grand_total)}</div>
            </div>
          </div>
        </div>

        {/* Items */}
        <h3 className="mt-6 font-semibold text-gray-800">Items</h3>
        {items.length > 0 ? (
          <div className="overflow-x-auto mt-2">
            <table className="min-w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-1">Line</th>
                  <th className="border px-2 py-1">Part Number</th>
                  <th className="border px-2 py-1">Description</th>
                  <th className="border px-2 py-1 text-right">Qty</th>
                  <th className="border px-2 py-1 text-right">Unit Price</th>
                  <th className="border px-2 py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="border px-2 py-1 text-center">
                      {it.line_no ?? idx + 1}
                    </td>
                    <td className="border px-2 py-1">
                      {it.part_number || it.part_id}
                    </td>
                    <td className="border px-2 py-1">
                      {it.description || "—"}
                    </td>
                    <td className="border px-2 py-1 text-right">
                      {it.quantity}
                    </td>
                    <td className="border px-2 py-1 text-right">
                      {money(it.unit_price)}
                    </td>
                    <td className="border px-2 py-1 text-right">
                      {money(it.total_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mt-2">No items found.</p>
        )}

        {/* Attachments */}
        <h3 className="mt-6 font-semibold text-gray-800">Attachments</h3>
        {files.length > 0 ? (
          <ul className="list-disc pl-6 mt-1 text-sm">
            {files.map((f) => (
              <li key={f.id || f.filepath}>
                <a
                  href={`${BASE}${
                    f.filepath?.startsWith("/") ? "" : "/"
                  }${f.filepath}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-700 hover:underline"
                >
                  {f.original_filename} ({f.mime_type},{" "}
                  {f.size_bytes?.toLocaleString() || 0} bytes)
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 mt-2">
            No attachments uploaded.
          </p>
        )}
      </div>

    </Wrapper>
  );
}
