// frontend/src/components/PartDetail.jsx
import React, { useState } from "react";
import { hasPermission } from "../utils/permissions";
import api, { deletePart } from "../utils/api";

function getLatestPO(relatedPOs) {
  if (!Array.isArray(relatedPOs) || relatedPOs.length === 0) return null;
  return relatedPOs[0];
}

const BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const FILE_BASE = BASE.replace(/\/api$/, "");
/* IMAGE HELPERS */
function getPartImagePaths(image_url) {
  if (!image_url) return [];
  try {
    const parsed = JSON.parse(image_url);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {}
  if (typeof image_url === "string" && image_url.trim() !== "") {
    return [image_url.trim()];
  }
  return [];
}

function makeAbsoluteUrl(imagePath) {
  if (!imagePath || typeof imagePath !== "string") {
    return null;
  }

  const clean = imagePath.trim();

  if (!clean) {
    return null;
  }

  // AI-enriched images may already be complete external URLs.
  if (/^https?:\/\//i.test(clean)) {
    return clean;
  }

  // Also preserve browser-supported inline/blob image URLs.
  if (
    clean.startsWith("data:") ||
    clean.startsWith("blob:")
  ) {
    return clean;
  }

  // Existing locally uploaded images.
  const uploadsIndex = clean.indexOf("/uploads");
  const localPath =
    uploadsIndex !== -1
      ? clean.substring(uploadsIndex)
      : clean.startsWith("/")
        ? clean
        : `/${clean}`;

  return `${FILE_BASE}${localPath}`;
}

export default function PartDetail({ part, onClose }) {
  if (!part) return null;
const canEditParts = hasPermission("edit_parts");
const canDeleteParts = hasPermission("delete_parts");

  const imagePaths = getPartImagePaths(part.image_url);
  const imageUrls = imagePaths.map(makeAbsoluteUrl).filter(Boolean);
  const hasImages = imageUrls.length > 0;

  const [mainIndex, setMainIndex] = useState(0);
  const [zoom, setZoom] = useState(false);

  const [relatedPOs, setRelatedPOs] = useState([]);
const [reviewStatus, setReviewStatus] = useState(
  part.image_review_status || "not_reviewed"
);

const [reviewBusy, setReviewBusy] = useState(false);

  React.useEffect(() => {
    if (!part?.part_id) return;

api
  .get(`/parts/${part.part_id}/purchase-orders`)
  .then((res) => setRelatedPOs(res.data?.data || []))
  .catch(() => setRelatedPOs([]));  }, [part?.part_id]);

  const latestPO = getLatestPO(relatedPOs);
  const mainImageUrl = hasImages ? imageUrls[mainIndex] : null;
/* IMAGE REVIEW ACTIONS */

const handleImageVerified = async () => {
  if (!canEditParts || reviewBusy) return;

  try {
    setReviewBusy(true);

    await api.post(`/parts/${part.part_id}/image-review`);

    setReviewStatus("approved");
    window.dispatchEvent(new Event("reload-parts"));
  } catch (err) {
    alert(
      err?.response?.data?.message ||
      err?.message ||
      "Failed to verify image."
    );
  } finally {
    setReviewBusy(false);
  }
};

const handleImageRejected = async () => {
  if (!canEditParts || reviewBusy || !imagePaths[mainIndex]) return;

  const confirmed = window.confirm(
    "This image does not match the part. Do you want to delete this image?"
  );

  if (!confirmed) return;

  try {
    setReviewBusy(true);

    await api.delete(`/parts/${part.part_id}/image`, {
      data: {
        image_url: imagePaths[mainIndex],
      },
    });

    window.dispatchEvent(new Event("reload-parts"));

    alert("Image removed successfully.");
    onClose();
  } catch (err) {
    alert(
      err?.response?.data?.message ||
      err?.message ||
      "Failed to remove image."
    );
  } finally {
    setReviewBusy(false);
  }
};

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-4xl p-5 relative overflow-y-auto max-h-[90vh]">

        {/* HEADER */}
        <div className="flex items-start justify-between gap-4 mb-4 border-b border-gray-100 pb-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold text-gray-900 leading-tight break-words">
              {part.part_name || "Part Details"}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
<button
  type="button"
  disabled={!canEditParts}
  className={`min-w-[80px] h-9 px-4 rounded-lg text-sm font-medium shadow-sm transition-colors ${
    canEditParts
      ? "bg-blue-600 hover:bg-blue-700 text-white"
      : "bg-gray-300 text-gray-500 cursor-not-allowed opacity-60"
  }`}
  onClick={() => {
    if (!canEditParts) return;
    onClose();
    window.dispatchEvent(new CustomEvent("edit-part", { detail: part }));
  }}
>
  Edit
</button>

<button
  type="button"
  disabled={!canDeleteParts}
  className={`min-w-[80px] h-9 px-4 rounded-lg text-sm font-medium shadow-sm transition-colors ${
    canDeleteParts
      ? "bg-red-600 hover:bg-red-700 text-white"
      : "bg-gray-300 text-gray-500 cursor-not-allowed opacity-60"
  }`}
onClick={async () => {
  if (!canDeleteParts) return;

  if (!window.confirm("Delete this part permanently?")) return;

  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Not authenticated. Please log in again.");
    }

    const res = await fetch(`${BASE}/parts/${part.part_id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    let data = {};
    try {
      data = await res.json();
    } catch {}

    if (!res.ok) {
      throw new Error(data?.message || `Failed to delete part (${res.status})`);
    }

    window.dispatchEvent(new Event("reload-parts"));
    alert(data?.message || "Deleted successfully.");
    onClose();
  } catch (err) {
    alert(err.message || "Failed to delete part.");
  }
}}
>
  Delete
</button>
            <button
              onClick={onClose}
              className="h-9 w-9 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 text-xl font-bold transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="space-y-4">

        {/* IMAGE + DETAILS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* IMAGES CARD */}
          <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex flex-col items-center gap-2">
            {hasImages ? (
              <>
<img
  src={mainImageUrl}
  referrerPolicy="no-referrer"
className="w-36 h-36 object-contain rounded-lg border border-gray-200 cursor-pointer bg-white"
  onClick={() => setZoom(true)}
  alt={part.part_name || part.part_number || "Part image"}
/>

                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  onClick={() => window.open(mainImageUrl, "_blank")}
                >
                  Download Image
                </button>

{reviewStatus === "approved" ? (
  <div className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-center">
    ✓ Image verified by PSR team
  </div>
) : (
  canEditParts && (
    <div className="border border-gray-200 rounded-lg px-3 py-2.5 text-center bg-gray-50">
      <p className="text-xs font-medium text-gray-700 mb-2">
        Is this the right image?
      </p>

      <div className="flex justify-center gap-2">
        <button
          type="button"
          disabled={reviewBusy}
          onClick={handleImageVerified}
          className="px-3 py-1 rounded-lg text-xs font-medium transition-colors bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
        >
          Yes
        </button>

        <button
          type="button"
          disabled={reviewBusy}
          onClick={handleImageRejected}
          className="px-3 py-1 rounded-lg text-xs font-medium transition-colors bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
        >
          No
        </button>
      </div>
    </div>
  )
)}

                {imageUrls.length > 1 && (
                  <div className="flex gap-1 mt-2 flex-wrap justify-center">
                    {imageUrls.map((url, idx) => (
                     <img
  key={idx}
  src={url}
  referrerPolicy="no-referrer"
  alt={`Part image ${idx + 1}`}
className={`w-10 h-10 object-contain rounded border border-gray-200 cursor-pointer bg-white ${
    idx === mainIndex
      ? "ring-2 ring-blue-500"
      : "opacity-80 hover:opacity-100"
  }`}
  onClick={() => setMainIndex(idx)}
/>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="w-36 h-36 rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                No Image
              </div>
            )}
          </div>

          {/* DETAILS CARD */}
          <div className="md:col-span-2 bg-gray-50/70 border border-gray-200 rounded-xl p-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Detail label="Part Number" value={part.part_number} />
            <Detail label="Category" value={part.category} />
            <Detail
              label="Unit Price"
              value={
                part.current_unit_price
                  ? "$" + Number(part.current_unit_price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : "—"
              }
            />
            <Detail label="Quantity On Hand" value={part.quantity_on_hand} />
            <Detail label="Min Stock" value={part.minimum_stock_level} />
            <Detail label="Material" value={part.material} />
            <Detail label="UOM" value={part.uom} />
            <Detail label="Weight (kg)" value={part.weight_kg} />
            <Detail label="Lead Time" value={part.lead_time_days} />
            <Detail label="Machine" value={part.machine_name} />
            <Detail label="Location" value={part.location} />
          </div>
        </div>

        {/* ⭐ LAST VENDOR + PO */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Latest Vendor &amp; PO</h3>

          {latestPO ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 text-sm">
              <Detail label="Vendor" value={latestPO.vendor_name} />
              <Detail label="PO #" value={latestPO.psr_po_number} />
              <Detail
                label="PO Date"
                value={
                  latestPO.order_date
                    ? new Date(latestPO.order_date).toLocaleDateString()
                    : "—"
                }
              />
              <Detail label="Qty" value={latestPO.quantity} />
              <Detail
                label="Unit Price"
                value={
                  latestPO.unit_price
                    ? "$" + Number(latestPO.unit_price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : "—"
                }
              />
              <Detail
                label="Total"
                value={
                  latestPO.total_price
                    ? "$" + Number(latestPO.total_price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : "—"
                }
              />
            </div>
          ) : (
            <p className="text-sm text-gray-500">No purchase order history.</p>
          )}
        </div>

        {/* DESCRIPTION */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-2">Description</h3>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{part.description || "—"}</p>
        </div>

        {/* REMARKS */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-2">Remarks</h3>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{part.remarks || "—"}</p>
        </div>

        {/* ⭐ RELATED POs */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Purchase Orders Containing This Part</h3>

          {relatedPOs.length === 0 ? (
            <p className="text-sm text-gray-500">No purchase orders contain this part.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-300">
              <table className="min-w-full text-[13px] border-collapse">
                <thead>
                  <tr>
                    <th className="h-9 px-3 py-0 text-left text-[13px] font-bold text-gray-900 bg-gray-50 align-middle leading-none whitespace-nowrap border-b border-gray-300 border-r border-gray-200 last:border-r-0">PO #</th>
                    <th className="h-9 px-3 py-0 text-left text-[13px] font-bold text-gray-900 bg-gray-50 align-middle leading-none whitespace-nowrap border-b border-gray-300 border-r border-gray-200 last:border-r-0">Status</th>
                    <th className="h-9 px-3 py-0 text-left text-[13px] font-bold text-gray-900 bg-gray-50 align-middle leading-none whitespace-nowrap border-b border-gray-300 border-r border-gray-200 last:border-r-0">Order Date</th>
                    <th className="h-9 px-3 py-0 text-left text-[13px] font-bold text-gray-900 bg-gray-50 align-middle leading-none whitespace-nowrap border-b border-gray-300 border-r border-gray-200 last:border-r-0">Qty</th>
                    <th className="h-9 px-3 py-0 text-left text-[13px] font-bold text-gray-900 bg-gray-50 align-middle leading-none whitespace-nowrap border-b border-gray-300 border-r border-gray-200 last:border-r-0">Unit Price</th>
                    <th className="h-9 px-3 py-0 text-left text-[13px] font-bold text-gray-900 bg-gray-50 align-middle leading-none whitespace-nowrap border-b border-gray-300 border-r border-gray-200 last:border-r-0">Total</th>
                    <th className="h-9 px-3 py-0 text-left text-[13px] font-bold text-gray-900 bg-gray-50 align-middle leading-none whitespace-nowrap border-b border-gray-300 border-r border-gray-200 last:border-r-0">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {relatedPOs.map((po, idx) => (
                    <tr key={`${po.id}-${idx}`} className="hover:bg-gray-50 transition-colors">
                      <td className="h-9 px-3 py-0 text-[13px] text-gray-800 align-middle leading-none whitespace-nowrap border-b border-gray-200 border-r border-gray-100 last:border-r-0">{po.psr_po_number}</td>
                      <td className="h-9 px-3 py-0 text-[13px] text-gray-800 align-middle leading-none whitespace-nowrap border-b border-gray-200 border-r border-gray-100 last:border-r-0">{po.status}</td>
                      <td className="h-9 px-3 py-0 text-[13px] text-gray-800 align-middle leading-none whitespace-nowrap border-b border-gray-200 border-r border-gray-100 last:border-r-0">
                        {po.order_date ? new Date(po.order_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="h-9 px-3 py-0 text-[13px] text-gray-800 align-middle leading-none whitespace-nowrap border-b border-gray-200 border-r border-gray-100 last:border-r-0">{po.quantity}</td>
                      <td className="h-9 px-3 py-0 text-[13px] text-gray-800 align-middle leading-none whitespace-nowrap border-b border-gray-200 border-r border-gray-100 last:border-r-0">
                        {po.unit_price ? "$" + Number(po.unit_price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
                      </td>
                      <td className="h-9 px-3 py-0 text-[13px] text-gray-800 align-middle leading-none whitespace-nowrap border-b border-gray-200 border-r border-gray-100 last:border-r-0">
                        {po.total_price ? "$" + Number(po.total_price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
                      </td>
                      <td className="h-9 px-3 py-0 text-[13px] text-gray-800 align-middle leading-none whitespace-nowrap border-b border-gray-200 border-r border-gray-100 last:border-r-0">
                        <a
                          href={`/purchase-orders/${po.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          View PO
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
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

      {/* ZOOM */}
      {zoom && mainImageUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[999]">
          <img src={mainImageUrl} className="max-w-[90vw] max-h-[90vh] rounded shadow-lg" />
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
      <p className="text-gray-500 text-[11px] uppercase tracking-wide">{label}</p>
      <p className="text-gray-900 text-sm font-medium whitespace-nowrap">
        {value || value === 0 ? value : "—"}
      </p>
    </div>
  );
}
