// frontend/src/components/PartDetail.jsx
import React, { useState } from "react";

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

function makeAbsoluteUrl(relativePath) {
  if (!relativePath) return null;
  let clean = relativePath.trim();
  const idx = clean.indexOf("/uploads");
  if (idx !== -1) clean = clean.substring(idx);
  if (!clean.startsWith("/")) clean = "/" + clean;

  return `${FILE_BASE}${clean}`;
}

export default function PartDetail({ part, onClose }) {
  if (!part) return null;

  const imagePaths = getPartImagePaths(part.image_url);
  const imageUrls = imagePaths.map(makeAbsoluteUrl).filter(Boolean);
  const hasImages = imageUrls.length > 0;

  const [mainIndex, setMainIndex] = useState(0);
  const [zoom, setZoom] = useState(false);

  const [relatedPOs, setRelatedPOs] = useState([]);

  React.useEffect(() => {
    if (!part?.part_id) return;

fetch(`${BASE}/parts/${part.part_id}/purchase-orders`)
      .then((res) => res.json())
      .then((json) => setRelatedPOs(json.data || []))
      .catch(() => setRelatedPOs([]));
  }, [part?.part_id]);

  const latestPO = getLatestPO(relatedPOs);
  const mainImageUrl = hasImages ? imageUrls[mainIndex] : null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-5 relative overflow-y-auto max-h-[90vh]">

        {/* ACTION BAR */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <button
            className="bg-blue-600 text-white px-3 h-8 rounded text-xs"
            onClick={() => {
              onClose();
              window.dispatchEvent(new CustomEvent("edit-part", { detail: part }));
            }}
          >
            Edit
          </button>

<button
  className="bg-red-600 text-white px-3 h-8 rounded text-xs"
  onClick={async () => {
    if (!window.confirm("Delete this part permanently?")) return;

    try {
      const res = await fetch(`${BASE}/parts/${part.part_id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Delete failed");

      window.dispatchEvent(new Event("reload-parts"));
      alert("Deleted successfully.");
      onClose();
    } catch {
      alert("Delete failed.");
    }
  }}
>
  Delete
</button>

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-xl font-bold px-2"
          >
            ✕
          </button>
        </div>

        {/* TITLE */}
        <h2 className="text-2xl font-semibold text-gray-800 mb-3 pr-8">
          {part.part_name || "Part Details"}
        </h2>

        {/* IMAGE + DETAILS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">

          {/* IMAGES */}
          <div className="flex flex-col items-center gap-2">
            {hasImages ? (
              <>
                <img
                  src={mainImageUrl}
                  className="w-36 h-36 object-cover rounded-lg border cursor-pointer"
                  onClick={() => setZoom(true)}
                />

                <button
                  className="bg-blue-600 text-white px-3 py-1 rounded text-xs"
                  onClick={() => window.open(mainImageUrl, "_blank")}
                >
                  Download Image
                </button>

                {imageUrls.length > 1 && (
                  <div className="flex gap-1 mt-2 flex-wrap justify-center">
                    {imageUrls.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        className={`w-10 h-10 object-cover rounded border cursor-pointer ${
                          idx === mainIndex ? "ring-2 ring-blue-500" : "opacity-80 hover:opacity-100"
                        }`}
                        onClick={() => setMainIndex(idx)}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="w-36 h-36 rounded-lg border bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                No Image
              </div>
            )}
          </div>

          {/* DETAILS — SQUEEZED */}
          <div className="md:col-span-2 grid grid-cols-2 gap-2 text-sm">
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

        {/* ⭐ LAST VENDOR + PO — SQUEEZED */}
        <div className="mt-3 border-t pt-3">
          <h3 className="font-semibold text-gray-800 mb-1">Latest Vendor &amp; PO</h3>

          {latestPO ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
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
        <div className="mt-4">
          <h3 className="font-semibold text-gray-800 mb-1">Description</h3>
          <p className="text-gray-600 text-sm whitespace-pre-line">{part.description || "—"}</p>
        </div>

        {/* REMARKS */}
        <div className="mt-3">
          <h3 className="font-semibold text-gray-800 mb-1">Remarks</h3>
          <p className="text-gray-600 text-sm whitespace-pre-line">{part.remarks || "—"}</p>
        </div>

        {/* ⭐ RELATED POs — UNCHANGED */}
        <div className="mt-6">
          <h3 className="font-semibold text-gray-800 mb-2">Purchase Orders Containing This Part</h3>

          {relatedPOs.length === 0 ? (
            <p className="text-sm text-gray-500">No purchase orders contain this part.</p>
          ) : (
            <div className="overflow-x-auto border border-gray-300 rounded-md">
              <table className="min-w-full text-sm border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-2 py-1">PO #</th>
                    <th className="border px-2 py-1">Status</th>
                    <th className="border px-2 py-1">Order Date</th>
                    <th className="border px-2 py-1">Qty</th>
                    <th className="border px-2 py-1">Unit Price</th>
                    <th className="border px-2 py-1">Total</th>
                    <th className="border px-2 py-1">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {relatedPOs.map((po, idx) => (
                    <tr key={`${po.id}-${idx}`}>
                      <td className="border px-2 py-1">{po.psr_po_number}</td>
                      <td className="border px-2 py-1">{po.status}</td>
                      <td className="border px-2 py-1">
                        {po.order_date ? new Date(po.order_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="border px-2 py-1">{po.quantity}</td>
                      <td className="border px-2 py-1">
                        {po.unit_price ? "$" + Number(po.unit_price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
                      </td>
                      <td className="border px-2 py-1">
                        {po.total_price ? "$" + Number(po.total_price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
                      </td>
                      <td className="border px-2 py-1">
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
        <div className="mt-5 text-xs text-gray-500 border-t pt-2">
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
      <p className="text-gray-500 text-[11px] uppercase">{label}</p>
      <p className="text-gray-800 text-sm font-medium whitespace-nowrap">
        {value || value === 0 ? value : "—"}
      </p>
    </div>
  );
}
