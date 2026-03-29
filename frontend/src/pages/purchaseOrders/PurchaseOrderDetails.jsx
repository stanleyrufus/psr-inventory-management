import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const FILE_BASE = BASE.replace(/\/api$/, "");

const money = (v) =>
  v == null || v === "" || isNaN(Number(v)) ? "-" : "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PurchaseOrderDetails({ order: propOrder, onClose }) {
  const { id } = useParams();
// ✅ DEFENSIVE GUARD
if (!id || isNaN(Number(id))) {
  return <div className="p-6">Invalid Purchase Order</div>;
}
  const navigate = useNavigate();

    const [fetchedOrder, setFetchedOrder] = useState(null);
  const [vendorInfo, setVendorInfo] = useState(null);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ Payment Summary modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    payment_method: "",
    amount_paid: "",
    payment_reference: "",
    credit_applied: "",
    payment_notes: "",
  });

  // -------------------------------
  //  Load PO
  // -------------------------------
  useEffect(() => {
    if (propOrder) return;
    if (!id) return;

    setLoading(true);
    axios
      .get(`${BASE}/purchase_orders/${id}`)
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

  useEffect(() => {
    if (!po) return;

    setPaymentForm({
      payment_method: po.payment_method || "",
      amount_paid:
        po.amount_paid != null && po.amount_paid !== ""
          ? po.amount_paid
          : po.grand_total || "",
      payment_reference: po.payment_reference || "",
      credit_applied:
        po.credit_applied != null && po.credit_applied !== ""
          ? po.credit_applied
          : "",
      payment_notes: po.payment_notes || "",
    });
  }, [po]);

  // -------------------------------
  //  Load Vendor
  // -------------------------------
  useEffect(() => {
    if (!po?.vendor_id) return;

    axios
      .get(`${BASE}/vendors/${po.vendor_id}`)
      .then((res) => setVendorInfo(res.data?.data || res.data || null))
      .catch((err) => console.error("❌ Failed to load vendor info:", err));
  }, [po?.vendor_id]);

  // -------------------------------
  //  Load ALL PARTS (for part number + images)
  // -------------------------------
  useEffect(() => {
    axios
      .get(`${BASE}/parts`)
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

  const savePaymentSummary = async () => {
    try {
      setPaymentSaving(true);

      await axios.put(`${BASE}/purchase_orders/${po.id}`, {
        ...po,
        status: "Paid",
        payment_method: paymentForm.payment_method || null,
        amount_paid: Number(paymentForm.amount_paid || 0),
        payment_reference: paymentForm.payment_reference || null,
        credit_applied: Number(paymentForm.credit_applied || 0),
        payment_notes: paymentForm.payment_notes || null,
      });

      alert("PO marked as PAID.");
      setShowPaymentModal(false);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Failed to save payment summary.");
    } finally {
      setPaymentSaving(false);
    }
  };



  return (
    <div
      className={
        isModal
          ? "fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          : "p-6 bg-white rounded shadow max-w-5xl mx-auto mt-0 mb-8"
      }
    >
      {/* PRINT STYLES – KEEPING ORIGINAL SO PRINT IS CLEAN */}
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
              onClick={() => setShowPaymentModal(true)}
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
                  await axios.put(`${BASE}/purchase_orders/${po.id}`, {
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
  onClick={() => navigate(`/purchase-orders/edit/${po.id}`)}
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
                await axios.delete(`${BASE}/purchase_orders/${po.id}`);
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
    ULTRA-COMPACT HEADER WITH PSR BLUE STRIP (UPDATED)
   ======================================================= */}
<div className="bg-blue-900 text-white rounded-md mb-4 px-4 py-3 border border-blue-900 flex justify-between items-start">

  {/* LEFT: PSR ADDRESS */}
  <div className="text-xs leading-tight">
    <div className="font-bold text-lg tracking-wide">
      PSR AUTOMATION INC.
    </div>
    <div>13318 SKYLINE CIRCLE</div>
    <div>SHAKOPEE MN 55379</div>
    <div>Phone: 952-233-1441 • Fax: 952-233-3731</div>
    <div>Email: SHINEY@PSRAUTOMATION.COM</div>
  </div>

  {/* RIGHT: PO INFO — SAME FONT SIZE AS ADDRESS */}
  <div className="text-right text-xs leading-tight">
    <div className="w-full flex justify-end">
  {po.status === "Paid" && (
    <div className="w-36 text-center py-1 bg-red-700 text-white border-2 border-red-200 font-extrabold text-sm tracking-wider rounded">
  PAID
</div>
  )}
</div>

    <div className="mt-1">
      PO NUMBER: {po.psr_po_number || "-"}
    </div>

    <div>
      ORDER DATE:{" "}
      {po.order_date
        ? new Date(po.order_date).toLocaleDateString()
        : "—"}
    </div>

    <div>
      ORDER STATUS: {po.status || "—"}
    </div>
  </div>

</div>


{/* =======================================================
    PURCHASED FROM + SUMMARY (compact + THICK BLUE BORDERS)
   ======================================================= */}
<div className="grid grid-cols-2 gap-3 mb-3 text-sm">
  {/* ---------------------------------------------
      PURCHASED FROM (Vendor) — Ultra Compact
     --------------------------------------------- */}
<div className="border-2 border-blue-900 rounded-md bg-gray-50 px-3 py-2 leading-snug text-sm">
  <div className="font-semibold text-gray-800 mb-1">
    VENDOR:
  </div>

  <div className="text-gray-900">
    {vendorInfo?.vendor_name || po.vendor_name || "Vendor"}
  </div>


    {vendorInfo?.contact_name && (
      <div className="text-xs">Attn: {vendorInfo.contact_name}</div>
    )}

    {vendorInfo?.address1 && <div className="text-xs">{vendorInfo.address1}</div>}
    {vendorInfo?.address2 && <div className="text-xs">{vendorInfo.address2}</div>}

    {/* City + State + ZIP + USA */}
    {(vendorInfo?.city ||
      vendorInfo?.state ||
      vendorInfo?.postal_code) && (
      <div className="text-xs">
        {(vendorInfo.city || "") +
          (vendorInfo.city && vendorInfo.state ? ", " : "") +
          (vendorInfo.state || "") +
          ((vendorInfo.city || vendorInfo.state) && vendorInfo.postal_code ? " " : "") +
          (vendorInfo.postal_code || "")}{" "}
        USA
      </div>
    )}

    {/* Phone + Email (NO icons) */}
    {(vendorInfo?.phone || vendorInfo?.email) && (
      <div className="text-xs mt-1">
        {vendorInfo.phone && <>Phone: {vendorInfo.phone}</>}
        {vendorInfo.phone && vendorInfo.email && " • "}
        {vendorInfo.email && <>Email: {vendorInfo.email}</>}
      </div>
    )}
  </div>

  {/* ---------------------------------------------
      ORDER SUMMARY (Ordered By + Dates + Terms + Remarks)
     --------------------------------------------- */}
<div className="border-2 border-blue-900 rounded-md bg-gray-50 px-3 py-2 leading-snug space-y-0.5 text-sm">

    <div className="flex">
      <span className="w-32 font-medium text-gray-700">Ordered By:</span>
      <span>{po.created_by || "—"}</span>
    </div>

<div className="flex">
  <span className="w-32 font-medium text-gray-700">Received On:</span>
  <span>
    {po.received_on
      ? new Date(po.received_on).toLocaleDateString()
      : "—"}
  </span>
</div>


  <div className="flex">
  <span className="w-32 font-medium text-gray-700">Received By:</span>
  <span>{po.received_by || "—"}</span>
</div>


    {/* ⭐ Date Paid (auto when status = Paid) */}
    <div className="flex">
      <span className="w-32 font-medium text-gray-700">Date Paid:</span>
      <span>
        {po.status === "Paid" && po.updated_at
          ? new Date(po.updated_at).toLocaleDateString()
          : "—"}
      </span>
    </div>

    {/* ⭐ Remarks */}
    <div className="flex items-start">
      <span className="w-32 font-medium text-gray-700">Remarks:</span>
      <span className="whitespace-pre-wrap">
        {po.remarks?.trim() || "—"}
      </span>
    </div>
  </div>

</div>


        {/* =======================================================
            ORDER PARTS
           ======================================================= */}
        <h3 className="mt-2 font-semibold text-gray-800 text-sm">
          ORDER PARTS
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

                  // ✅ FIX IMAGE: handle JSON array or single path
                  let imgUrl = null;
                  if (part?.image_url) {
                    try {
                      const arr = JSON.parse(part.image_url);
                      if (Array.isArray(arr) && arr.length > 0) {
                        const pth = arr[0].startsWith("/")
                          ? arr[0]
                          : "/" + arr[0];
                        imgUrl = `${FILE_BASE}${pth}`;
                      } else {
                        const single = part.image_url.startsWith("/")
                          ? part.image_url
                          : "/" + part.image_url;
                        imgUrl = `${FILE_BASE}${single}`;
                      }
                    } catch {
                      const single = part.image_url.startsWith("/")
                        ? part.image_url
                        : "/" + part.image_url;
                      imgUrl = `${FILE_BASE}${single}`;
                    }
                  }

const isBackOrdered = Boolean(it.back_ordered ?? it.bo ?? false);

return (
  <tr
    key={idx}
    className={isBackOrdered ? "bg-yellow-200" : idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
  >
    <td className={`border border-gray-300 px-2 py-1 text-center ${isBackOrdered ? "bg-yellow-200" : ""}`}>
      {it.line_no ?? idx + 1}
    </td>

    <td className={`border border-gray-300 px-2 py-1 ${isBackOrdered ? "bg-yellow-200" : ""}`}>
      {part?.part_number || `Part #${it.part_id || it.partId || "-"}`}
    </td>

    <td className={`border border-gray-300 px-2 py-1 ${isBackOrdered ? "bg-yellow-200" : ""}`}>
      {part?.description || it.description || "—"}
    </td>

    <td className={`border border-gray-300 px-2 py-1 text-center ${isBackOrdered ? "bg-yellow-200" : ""}`}>
      {imgUrl ? (
        <img
          src={imgUrl}
          alt={part?.part_number || "Part image"}
          className="w-12 h-12 object-cover border border-gray-300 rounded"
        />
      ) : (
        <span className="text-gray-400 text-[11px]">No Image</span>
      )}
    </td>

    <td className={`border border-gray-300 px-2 py-1 text-right ${isBackOrdered ? "bg-yellow-200" : ""}`}>
      {it.quantity}
    </td>

    <td className={`border border-gray-300 px-2 py-1 text-right ${isBackOrdered ? "bg-yellow-200" : ""}`}>
      {money(it.unit_price)}
    </td>

    <td className={`border border-gray-300 px-2 py-1 text-right ${isBackOrdered ? "bg-yellow-200" : ""}`}>
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

        {/* =======================================================
            TOTALS (Tax forced to 0)
           ======================================================= */}
                <div className="mt-4 flex justify-end">
          <div className="border border-gray-300 rounded-md bg-gray-50 px-4 py-3 text-sm w-72">
            {po.status === "Paid" && (
              <>
                <div className="font-semibold text-gray-800 mb-2 border-b border-gray-300 pb-1">
                  Payment Summary
                </div>

                <div className="flex justify-between mb-1">
                  <span className="text-gray-700">Date Paid</span>
                  <span className="font-medium">
                    {po.date_paid
                      ? new Date(po.date_paid).toLocaleDateString()
                      : "—"}
                  </span>
                </div>

                <div className="flex justify-between mb-1">
                  <span className="text-gray-700">Method</span>
                  <span className="font-medium">{po.payment_method || "—"}</span>
                </div>

                <div className="flex justify-between mb-2">
                  <span className="text-gray-700">Reference</span>
                  <span className="font-medium">{po.payment_reference || "—"}</span>
                </div>
              </>
            )}

            <div className={po.status === "Paid" ? "border-t border-gray-300 pt-2 mt-2" : ""}>
              <div className="flex justify-between mb-1">
                <span className="text-gray-700">Subtotal</span>
                <span className="font-semibold">{money(po.subtotal)}</span>
              </div>

              <div className="flex justify-between mb-1">
                <span className="text-gray-700">Tax (0%)</span>
                <span className="font-semibold">$0.00</span>
              </div>

              <div className="flex justify-between mb-1">
                <span className="text-gray-700">Shipping</span>
                <span className="font-semibold">{money(po.shipping_charges)}</span>
              </div>

              <div className="border-t border-gray-300 mt-2 pt-2 flex justify-between">
                <span className="font-semibold text-gray-800">GRAND TOTAL</span>
                <span className="font-bold text-gray-900">{money(po.grand_total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* =======================================================
            ATTACHMENTS
           ======================================================= */}
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

      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 print-hide">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Payment Summary</h3>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-xl font-bold text-gray-600 hover:text-black"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Payment Method
                </label>
                <select
                  className="border p-2 rounded w-full"
                  value={paymentForm.payment_method}
                  onChange={(e) =>
                    setPaymentForm((p) => ({
                      ...p,
                      payment_method: e.target.value,
                    }))
                  }
                >
                  <option value="">Select</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Check">Check</option>
                  <option value="ACH">ACH</option>
                  <option value="Wire">Wire</option>
                  <option value="Cash">Cash</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Amount Paid
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="border p-2 rounded w-full"
                  value={paymentForm.amount_paid}
                  onChange={(e) =>
                    setPaymentForm((p) => ({
                      ...p,
                      amount_paid: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Payment Reference
                </label>
                <input
                  type="text"
                  className="border p-2 rounded w-full"
                  value={paymentForm.payment_reference}
                  onChange={(e) =>
                    setPaymentForm((p) => ({
                      ...p,
                      payment_reference: e.target.value,
                    }))
                  }
                  placeholder="Check # / Transaction # / Ref #"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Credit Applied
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="border p-2 rounded w-full"
                  value={paymentForm.credit_applied}
                  onChange={(e) =>
                    setPaymentForm((p) => ({
                      ...p,
                      credit_applied: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Payment Notes
                </label>
                <textarea
                  className="border p-2 rounded w-full"
                  rows={3}
                  value={paymentForm.payment_notes}
                  onChange={(e) =>
                    setPaymentForm((p) => ({
                      ...p,
                      payment_notes: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 bg-gray-200 rounded"
                disabled={paymentSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={savePaymentSummary}
                className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded"
                disabled={paymentSaving}
              >
                {paymentSaving ? "Saving..." : "Save & Mark Paid"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}