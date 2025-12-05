// src/pages/purchaseOrders/PurchaseOrderDetails.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const FILE_BASE = BASE.replace(/\/api$/, "");

const money = (v) =>
  v == null || v === "" || isNaN(Number(v)) ? "-" : `$${Number(v).toFixed(2)}`;

export default function PurchaseOrderDetails({ order: propOrder, onClose }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [fetchedOrder, setFetchedOrder] = useState(null);
  const [vendorInfo, setVendorInfo] = useState(null);
  const [parts, setParts] = useState([]);
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
  //  Load Vendor
  // -------------------------------
  useEffect(() => {
    if (!po?.vendor_id) return;

    axios
      .get(`${BASE}/api/vendors/${po.vendor_id}`)
      .then((res) => setVendorInfo(res.data?.data || res.data || null))
      .catch((err) => console.error("❌ Failed to load vendor info:", err));
  }, [po?.vendor_id]);

  // -------------------------------
  //  Load ALL PARTS (for part number + images)
  // -------------------------------
  useEffect(() => {
    axios
      .get(`${BASE}/api/parts`)
      .then((res) => {
        const raw = res.data?.data || res.data || [];
        const normalized = raw.map((p) => ({
          part_id: p.part_id || p.id,
          part_number: p.part_number,
          part_name: p.part_name,
          description: p.description,
          image_url: p.image_url,
          current_unit_price: p.current_unit_price,
        }));
        setParts(normalized);
      })
      .catch(() => setParts([]));
  }, []);

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
      <div className="p-6 bg-white rounded shadow max-w-5xl mx-auto mt-0 mb-8">
        {children}
      </div>
    );

  return (
    <Wrapper>
      {/* PRINT STYLES */}
      <style>
        {`
          @media print {
            body * { visibility: hidden !important; }
            #print-po, #print-po * { visibility: visible !important; }
            #print-po { position: absolute; top: 0; left: 0; width: 100%; }
            .shadow, .shadow-md, .shadow-lg, .shadow-xl { box-shadow: none !important; }
            .print-hide { display: none !important; visibility: hidden !important; }
          }
        `}
      </style>

      <div
        id="print-po"
        className={`relative bg-white rounded-lg shadow-xl w-full ${
          isModal ? "max-w-6xl p-6 overflow-y-auto max-h-[95vh]" : "p-6"
        }`}
      >
        {/* TOP ACTION BAR (non-print) */}
        <div className="flex justify-end gap-2 mb-3 -mt-6 print-hide">
          <button
            onClick={() => window.print()}
            className="px-3 h-10 bg-gray-700 hover:bg-black text-white text-sm rounded shadow flex items-center"
          >
            🖨 Print
          </button>

          {po.status !== "Paid" && (
            <button
              className="px-3 h-10 bg-green-700 hover:bg-green-800 text-white text-sm rounded shadow flex items-center"
              onClick={async () => {
                if (!window.confirm("Mark this PO as PAID?")) return;

                try {
                  await axios.put(`${BASE}/api/purchase_orders/${po.id}`, {
                    ...po,
                    status: "Paid",
                  });

                  alert("PO marked as PAID.");
                  window.location.reload();
                } catch (err) {
                  console.error(err);
                  alert("Failed to update status.");
                }
              }}
            >
              💲 Mark as Paid
            </button>
          )}

          {po.status === "Paid" && (
            <button
              className="px-3 h-10 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded shadow flex items-center"
              onClick={async () => {
                if (!window.confirm("Revert this PO to UNPAID status?")) return;

                try {
                  await axios.put(`${BASE}/api/purchase_orders/${po.id}`, {
                    ...po,
                    status: "Received", // revert to previous state
                  });

                  alert("PO status reverted to UNPAID.");
                  window.location.reload();
                } catch (err) {
                  console.error(err);
                  alert("Failed to update status.");
                }
              }}
            >
              ↩️ Mark as Unpaid
            </button>
          )}

          <button
            className="px-3 h-10 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded shadow flex items-center"
            onClick={() =>
              (window.location.href = `/purchase-orders/edit/${po.id}`)
            }
          >
            ✏️ Edit
          </button>

          <button
            className="px-3 h-10 bg-red-600 hover:bg-red-700 text-white text-sm rounded shadow flex items-center"
            onClick={async () => {
              if (
                !window.confirm(
                  `Delete PO "${po.psr_po_number}" permanently?`
                )
              )
                return;

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
            className="h-10 px-3 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xl font-bold rounded flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* =======================================================
            HEADER STRIP (PSR + PO INFO)
           ======================================================= */}
        <div className="border border-gray-300 rounded-md mb-4">
          <div className="flex justify-between items-center bg-blue-900 text-white px-3 py-1 rounded-t-md print-color">
            <div className="font-semibold text-base tracking-wide">
              PSR AUTOMATION INC.
            </div>
            <div className="text-sm font-semibold tracking-wide">
              PO #: {po.psr_po_number || "-"}
            </div>
          </div>

          {/* =======================================================
              THREE COLUMNS WITH CLEAN VERTICAL DIVIDERS
             ======================================================= */}
          <div className="grid grid-cols-3 text-sm border border-gray-300 rounded-md bg-gray-50">
            <div className="p-3 border-r border-gray-300">
              <div className="font-semibold text-gray-800">
                {vendorInfo?.vendor_name || po.vendor_name || "Vendor"}
              </div>

              {vendorInfo?.contact_name && (
                <div>Attn: {vendorInfo.contact_name}</div>
              )}
              {vendorInfo?.address1 && <div>{vendorInfo.address1}</div>}
              {vendorInfo?.address2 && <div>{vendorInfo.address2}</div>}

              {(vendorInfo?.city ||
                vendorInfo?.state ||
                vendorInfo?.postal_code) && (
                <div>
                  {vendorInfo.city || ""}
                  {vendorInfo.city && vendorInfo.state ? ", " : ""}
                  {vendorInfo.state || ""}
                  {(vendorInfo.city || vendorInfo.state) &&
                  vendorInfo.postal_code
                    ? " "
                    : ""}
                  {vendorInfo.postal_code || ""}
                </div>
              )}

              {vendorInfo?.country && <div>{vendorInfo.country}</div>}
              {vendorInfo?.phone && <div>📞 {vendorInfo.phone}</div>}
              {vendorInfo?.email && <div>✉️ {vendorInfo.email}</div>}
            </div>

            <div className="p-3 border-r border-gray-300 space-y-1">
              <div className="flex">
                <span className="w-32 font-medium text-gray-700">PO Date:</span>
                <span>
                  {po.order_date
                    ? new Date(po.order_date).toLocaleDateString()
                    : "—"}
                </span>
              </div>

              <div className="flex">
                <span className="w-32 font-medium text-gray-700">
                  Expected Delivery:
                </span>
                <span>
                  {po.expected_delivery_date
                    ? new Date(po.expected_delivery_date).toLocaleDateString()
                    : "—"}
                </span>
              </div>

              <div className="flex">
                <span className="w-32 font-medium text-gray-700">Status:</span>
                <span>{po.status || "—"}</span>
              </div>
            </div>

            <div className="p-3 space-y-1">
              <div className="flex">
                <span className="w-32 font-medium text-gray-700">
                  Created By:
                </span>
                <span>{po.created_by || "—"}</span>
              </div>

              <div className="flex">
                <span className="w-32 font-medium text-gray-700">
                  Payment Terms:
                </span>
                <span>{po.payment_terms || "—"}</span>
              </div>

              <div className="flex">
                <span className="w-32 font-medium text-gray-700">
                  Currency:
                </span>
                <span>{po.currency || "USD"}</span>
              </div>
            </div>
          </div>

          {/* ⭐ FIXED: added missing closing div */}
        </div>

        {/* =======================================================
            SOLD TO / SHIP TO — With Blue Header Strip
           ======================================================= */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="border border-gray-300 rounded-md bg-gray-50 text-sm leading-tight">
            <div className="bg-blue-900 text-white px-3 py-1 border-b border-gray-300 print-color">
              <span className="font-semibold tracking-wide text-xs">
                SOLD TO
              </span>
            </div>
            <div className="px-3 py-2 leading-tight">
              <p className="font-semibold text-gray-800">SHINEY RAMNARAIN</p>
              <p className="text-gray-800">PSR AUTOMATION</p>
              <p className="text-gray-800">13318 SKYLINE CIRCLE</p>
              <p className="text-gray-800">SHAKOPEE MN 55379</p>
              <p className="text-gray-800">Phone: 952-233-1441</p>
              <p className="text-gray-800">Fax: 952-233-3731</p>
              <p className="text-gray-800">Email: SHINEY@PSRAUTOMATION.COM</p>
            </div>
          </div>

          <div className="border border-gray-300 rounded-md bg-gray-50 text-sm leading-tight">
            <div className="bg-blue-900 text-white px-3 py-1 border-b border-gray-300 print-color">
              <span className="font-semibold tracking-wide text-xs">
                SHIP TO
              </span>
            </div>
            <div className="px-3 py-2 leading-tight">
              <p className="font-semibold text-gray-800">PSR AUTOMATION</p>
              <p className="text-gray-800">13318 SKYLINE CIRCLE</p>
              <p className="text-gray-800">SHAKOPEE MN 55379</p>
            </div>
          </div>
        </div>

        <h3 className="mt-2 font-semibold text-gray-800 text-sm">
          ORDER LINES
        </h3>

        {items.length > 0 ? (
          <div className="overflow-x-auto mt-2 border border-gray-300 rounded-md">
            <table className="min-w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="border border-gray-300 px-2 py-1 text-center w-12">
                    LINE
                  </th>
                  <th className="border border-gray-300 px-2 py-1 text-left w-40">
                    PART NUMBER
                  </th>
                  <th className="border border-gray-300 px-2 py-1 text-left">
                    DESCRIPTION
                  </th>
                  <th className="border border-gray-300 px-2 py-1 text-center w-24">
                    IMAGE
                  </th>
                  <th className="border border-gray-300 px-2 py-1 text-right w-20">
                    QTY
                  </th>
                  <th className="border border-gray-300 px-2 py-1 text-right w-24">
                    UNIT PRICE
                  </th>
                  <th className="border border-gray-300 px-2 py-1 text-right w-28">
                    LINE TOTAL
                  </th>
                </tr>
              </thead>

              <tbody>
                {items.map((it, idx) => {
                  const part = parts.find(
                    (p) =>
                      String(p.part_id) === String(it.part_id || it.partId)
                  );

                  const imgUrl =
                    part?.image_url &&
                    `${FILE_BASE}${
                      part.image_url.startsWith("/") ? "" : "/"
                    }${part.image_url}`;

                  return (
                    <tr
                      key={idx}
                      className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="border border-gray-300 px-2 py-1 text-center">
                        {it.line_no ?? idx + 1}
                      </td>

                      <td className="border border-gray-300 px-2 py-1">
                        {part?.part_number ||
                          `Part #${it.part_id || it.partId || "-"}`}
                      </td>

                      <td className="border border-gray-300 px-2 py-1">
                        {part?.description || it.description || "—"}
                      </td>

                      <td className="border border-gray-300 px-2 py-1 text-center">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={part?.part_number || "Part image"}
                            className="w-12 h-12 object-cover border border-gray-300 rounded"
                          />
                        ) : (
                          <span className="text-gray-400 text-[11px]">
                            No Image
                          </span>
                        )}
                      </td>

                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {it.quantity}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {money(it.unit_price)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {money(it.total_price)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mt-2">No items found.</p>
        )}

        <div className="mt-4 flex justify-end relative">
          {po.status === "Paid" && (
            <div className="absolute top-1/2 -translate-y-1/2 right-[18rem] rotate-[-12deg] opacity-70 pointer-events-none">
              <span className="inline-block px-5 py-2 text-red-700 border-4 border-red-700 font-extrabold text-3xl tracking-wider rounded-lg">
                PAID
              </span>
            </div>
          )}

          <div className="border border-gray-300 rounded-md bg-gray-50 px-4 py-3 text-sm w-64">
            <div className="flex justify-between mb-1">
              <span className="text-gray-700">Subtotal</span>
              <span className="font-semibold">{money(po.subtotal)}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-700">
                Tax ({po.tax_percent ?? 0}%)
              </span>
              <span className="font-semibold">{money(po.tax_amount)}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-700">Shipping</span>
              <span className="font-semibold">
                {money(po.shipping_charges)}
              </span>
            </div>
            <div className="border-t border-gray-300 mt-2 pt-2 flex justify-between">
              <span className="font-semibold text-gray-800">
                GRAND TOTAL
              </span>
              <span className="font-bold text-gray-900">
                {money(po.grand_total)}
              </span>
            </div>
          </div>
        </div>

        <h3 className="mt-6 font-semibold text-gray-800">Attachments</h3>

        {files.length > 0 ? (
          <div className="grid grid-cols-4 gap-4 mt-2">
            {files.map((f) => {
              const fileUrl = `${FILE_BASE}${
                f.filepath.startsWith("/") ? "" : "/"
              }${f.filepath}`;
              const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(
                f.original_filename
              );

              return (
                <div
                  key={f.id}
                  className="border rounded p-2 text-center bg-white shadow-sm"
                >
                  {isImage ? (
                    <a href={fileUrl} target="_blank" rel="noreferrer">
                      <img
                        src={fileUrl}
                        alt={f.original_filename}
                        className="w-20 h-20 object-cover mx-auto rounded border"
                      />
                    </a>
                  ) : (
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-700 underline text-sm break-all"
                    >
                      {f.original_filename}
                    </a>
                  )}

                  <div className="text-xs text-gray-600 mt-1">
                    {f.original_filename}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 mt-2">No attachments uploaded.</p>
        )}
      </div>
    </Wrapper>
  );
}
