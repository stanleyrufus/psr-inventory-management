import React, { useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import { useParams, useNavigate } from "react-router-dom";
import PartDetail from "../components/PartDetail";

const BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const FILE_BASE = BASE.replace(/\/api$/, "");

const money = (v) =>
  "$" +
  Number(v || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getProductImageUrl = (raw) => {
  if (!raw) return "";

  const value = String(raw).trim();
  if (!value) return "";

  if (/^https?:\/\//i.test(value)) return value;

  if (value.startsWith("/images/")) return value;
  if (value.startsWith("images/")) return `/${value}`;

  if (value.startsWith("/uploads")) return `${FILE_BASE}${value}`;
  if (value.startsWith("uploads/")) return `${FILE_BASE}/${value}`;

  if (value.startsWith("/")) return value;

  return `${FILE_BASE}/uploads/products/${value}`;
};

function BomTable({
  title,
  rows,
  total,
  bomLoading,
  emptyText,
  onOpenPart,
  onDeleteRow,
  onDeleteSection,
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
  <div className="flex items-center gap-3">
    <h2 className="text-2xl font-semibold text-gray-800">{title}</h2>

    {!bomLoading && rows.length > 0 && (
      <button
  type="button"
  onClick={() => onDeleteSection(title)}
  className="no-print px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
>
  Delete {title.replace(" Parts", "")}
</button>
    )}
  </div>

  {bomLoading ? (
    <span className="text-sm text-gray-500">Loading BOM...</span>
  ) : (
    <span className="text-lg font-semibold text-green-700">
      {title.replace(" Parts", "")} Budget: {money(total)}
    </span>
  )}
</div>

      {bomLoading ? (
        <div className="text-gray-500 py-6">Loading BOM details...</div>
      ) : rows.length === 0 ? (
        <div className="text-gray-500 py-6">{emptyText}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
  <th className="border px-3 py-2 text-left">Part Number</th>
  <th className="border px-3 py-2 text-left">
    Part Name / Description
  </th>
  <th className="border px-3 py-2 text-left">Vendor</th>
  <th className="border px-3 py-2 text-right">Unit Price</th>
  <th className="border px-3 py-2 text-right">Qty Required</th>
  <th className="border px-3 py-2 text-right">Extended Cost</th>
  <th className="border px-3 py-2 text-right">Stock</th>
  <th className="border px-3 py-2 text-left">UOM</th>
<th className="no-print border px-3 py-2 text-center">Action</th>
</tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id || row.part_id || index}>
                  <td className="border px-3 py-2 font-medium">
                    {row.part_id ? (
                      <button
                        type="button"
                        className="text-blue-600 hover:underline cursor-pointer bg-transparent border-0 p-0 font-medium"
                        title="Open part details"
                        onClick={() => onOpenPart(row)}
                      >
                        {row.part_number}
                      </button>
                    ) : (
                      <span className="text-gray-800">
                        {row.part_number || "-"}
                      </span>
                    )}
                  </td>
                  <td className="border px-3 py-2 text-gray-700">
                    {row.part_name ||
                      row.description ||
                      row.source_description ||
                      "-"}
                  </td>
                  <td className="border px-3 py-2 text-gray-700">
                    {row.last_vendor_name || "-"}
                  </td>
                  <td className="border px-3 py-2 text-right text-gray-700">
                    {money(row.unit_price_for_budget)}
                  </td>
                  <td className="border px-3 py-2 text-right text-gray-700">
                    {Number(row.qty_required || 0)}
                  </td>
                  <td className="border px-3 py-2 text-right font-semibold text-gray-800">
                    {money(row.extended_cost)}
                  </td>
                  <td className="border px-3 py-2 text-right text-gray-700">
                    {Number(row.quantity_on_hand || 0)}
                  </td>
                  <td className="border px-3 py-2 text-gray-700">
  {row.uom || "-"}
</td>
<td className="no-print border px-3 py-2 text-center">
  <button
  type="button"
  onClick={() => onDeleteRow(row)}
  className="no-print text-red-600 hover:text-red-800 font-medium"
>
  Delete
</button>
</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td
  colSpan="6"
  className="border px-3 py-2 text-right font-semibold text-gray-800"
>
                  {title.replace(" Parts", "")} Total
                </td>
                <td className="border px-3 py-2 text-right font-bold text-green-700">
                  {money(total)}
                </td>
<td colSpan="3" className="border px-3 py-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="grid grid-cols-12 gap-2 py-[2px] border-b border-gray-100">
<div className="col-span-5 text-[13px] font-medium text-gray-600">
        {label}
      </div>
<div className="col-span-7 text-[13px] text-gray-800 break-words">
        {value || "-"}
      </div>
    </div>
  );
}
export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [bom, setBom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bomLoading, setBomLoading] = useState(true);
  const [error, setError] = useState("");
  const [imageFailed, setImageFailed] = useState(false);

  const [selectedPart, setSelectedPart] = useState(null);
  const [showPartDetail, setShowPartDetail] = useState(false);
  const [partModalLoading, setPartModalLoading] = useState(false);
const [uploadingBom, setUploadingBom] = useState(false);
const [showAddBomModal, setShowAddBomModal] = useState(false);
const [addingBomRow, setAddingBomRow] = useState(false);
const [newBomRow, setNewBomRow] = useState({
  part_number: "",
  part_name: "",
  qty_required: 1,
  section: "electrical",
  unit_price: "",
  source_description: "",
});
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setBomLoading(true);
        setError("");
        setImageFailed(false);

        const [productRes, bomRes] = await Promise.all([
          api.get(`${BASE}/products/${id}`),
          api.get(`${BASE}/products/${id}/bom`),
        ]);

        if (cancelled) return;

        const resolvedProduct = productRes?.data?.data || productRes?.data || null;
        const resolvedBom = bomRes?.data?.data || bomRes?.data || null;

        setProduct(resolvedProduct);
        setBom(resolvedBom);
      } catch (err) {
        if (cancelled) return;
        console.error("ProductDetail load error:", err);
        setError(
          err?.response?.data?.message || err.message || "Failed to load"
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
          setBomLoading(false);
        }
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const openPartDetail = async (row) => {
    if (!row) return;

    setSelectedPart(row);
    setShowPartDetail(true);

    if (!row.part_id) return;

    try {
      setPartModalLoading(true);

      // Try to enrich the BOM row with full part details.
      // If this endpoint is not available, the modal will still open with BOM row data.
      const res = await api.get(`${BASE}/parts/${row.part_id}`);
      const resolvedPart = res?.data?.data || res?.data || row;
      setSelectedPart(resolvedPart);
    } catch (err) {
      console.warn("Part detail enrichment failed, using BOM row data:", err);
      setSelectedPart(row);
    } finally {
      setPartModalLoading(false);
    }
  };

const handleBomFileUpload = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    setUploadingBom(true);

const sendUpload = async (confirmMachineMismatch = false) => {
  const formData = new FormData();

  formData.append(
    "confirmMachineMismatch",
    confirmMachineMismatch ? "true" : "false"
  );
  formData.append("file", file);

  return api.post(`${BASE}/products/${id}/bom/upload`, formData);
};

    let uploadRes;

    try {
      uploadRes = await sendUpload(false);
    } catch (err) {
      const data = err?.response?.data;

      if (data?.requiresConfirmation) {
        const machineNames =
          data?.machineValidation?.mismatchedMachineNames?.join(", ") ||
          "another machine";

        const productName =
          data?.machineValidation?.productName || `product ${id}`;

        const confirmed = window.confirm(
          `${data.message}\n\n` +
            `Sheet machine name(s): ${machineNames}\n` +
            `Target product: ${productName}\n\n` +
            `Do you want to continue anyway?`
        );

        if (!confirmed) {
          event.target.value = "";
          return;
        }

try {
  uploadRes = await sendUpload(true);
} catch (confirmErr) {
  console.error("Confirmed BOM upload failed:", confirmErr);
  throw confirmErr;
}
      } else {
        throw err;
      }
    }

    const bomRes = await api.get(`${BASE}/products/${id}/bom`);
    const resolvedBom = bomRes?.data?.data || bomRes?.data || null;
    setBom(resolvedBom);

    alert(
      `${uploadRes?.data?.message || "BOM uploaded successfully"}\n\n` +
        `Inventory Created: ${uploadRes?.data?.inventoryCreated ?? 0}\n` +
        `Inventory Matched: ${uploadRes?.data?.inventoryMatched ?? 0}\n` +
        `Inventory Updated: ${uploadRes?.data?.inventoryUpdated ?? 0}\n` +
        `Inserted: ${uploadRes?.data?.inserted ?? 0}\n` +
        `Updated: ${uploadRes?.data?.updated ?? 0}\n` +
        `Processed: ${uploadRes?.data?.totalProcessed ?? 0}`
    );

    event.target.value = "";
} catch (err) {
  console.error("BOM upload failed:", err);

  const data = err?.response?.data;

  if (Array.isArray(data?.duplicateErrors) && data.duplicateErrors.length > 0) {
    const duplicateMessage = data.duplicateErrors
      .map((x) => `- ${x.message}`)
      .join("\n");

    alert(
      `${data?.message || "Duplicate part numbers found."}\n\n${duplicateMessage}`
    );
  } else if (data?.requiresConfirmation) {
    alert(
      "The upload still requires confirmation after you clicked OK. " +
      "This means the confirmation flag was not accepted by the backend. " +
      "Please retry once after this code change."
    );
  } else {
    alert(data?.message || "Failed to upload BOM");
  }

  } finally {
    setUploadingBom(false);
  }
};

const reloadBom = async () => {
  const bomRes = await api.get(`${BASE}/products/${id}/bom`);
  const resolvedBom = bomRes?.data?.data || bomRes?.data || null;
  setBom(resolvedBom);
};

const handleDeleteBomRow = async (row) => {
  if (!row?.id) return;

  const confirmed = window.confirm(
    `Delete BOM row for part '${row.part_number || row.part_name || row.part_id}'?`
  );
  if (!confirmed) return;

  try {
    await api.delete(`${BASE}/products/${id}/bom/rows/${row.id}`);
    await reloadBom();
  } catch (err) {
    console.error("Delete BOM row failed:", err);
    alert(err?.response?.data?.message || "Failed to delete BOM row");
  }
};

const handleDeleteBomSection = async (title) => {
  const section = String(title || "").toLowerCase().includes("mechanical")
    ? "mechanical"
    : String(title || "").toLowerCase().includes("electrical")
    ? "electrical"
    : "other";

  const confirmed = window.confirm(
    `Delete all ${section} BOM rows for this product?`
  );
  if (!confirmed) return;

  try {
    await api.delete(`${BASE}/products/${id}/bom/section/${section}`);
    await reloadBom();
  } catch (err) {
    console.error("Delete BOM section failed:", err);
    alert(err?.response?.data?.message || `Failed to delete ${section} BOM`);
  }
};

const handleAddBomRow = async () => {
  try {
    if (!newBomRow.part_number.trim()) {
      alert("Part number is required");
      return;
    }
    if (!newBomRow.part_name.trim()) {
      alert("Part name is required");
      return;
    }
    if (!Number(newBomRow.qty_required) || Number(newBomRow.qty_required) <= 0) {
      alert("Quantity must be greater than 0");
      return;
    }

    setAddingBomRow(true);

    const payload = {
      part_number: newBomRow.part_number.trim(),
      part_name: newBomRow.part_name.trim(),
      qty_required: Number(newBomRow.qty_required),
      section: newBomRow.section,
      unit_price: Number(newBomRow.unit_price || 0),
      source_description: newBomRow.source_description.trim(),
    };

    const res = await api.post(`${BASE}/products/${id}/bom/rows`, payload);

    await reloadBom();

    alert(
      `${res?.data?.message || "BOM row saved successfully"}\n\n` +
        `Action: ${res?.data?.action || "-"}\n` +
        `Inventory Created: ${res?.data?.inventoryCreated ? "Yes" : "No"}\n` +
        `Inventory Updated: ${res?.data?.inventoryUpdated ? "Yes" : "No"}`
    );

    setShowAddBomModal(false);
    setNewBomRow({
      part_number: "",
      part_name: "",
      qty_required: 1,
      section: "electrical",
      unit_price: "",
      source_description: "",
    });
  } catch (err) {
    console.error("Add BOM row failed:", err);
    alert(err?.response?.data?.message || "Failed to add BOM row");
  } finally {
    setAddingBomRow(false);
  }
};

const handlePrintBom = () => {
  window.print();
};

  const mechanicalParts = useMemo(() => bom?.grouped?.mechanical || [], [bom]);
  const electricalParts = useMemo(() => bom?.grouped?.electrical || [], [bom]);
  const totals = bom?.totals || {
    mechanical: 0,
    electrical: 0,
    other: 0,
    grand: 0,
  };

  const rawImageValue =
    product?.image_url ||
    product?.image ||
    product?.product_image ||
    product?.image_path ||
    product?.photo ||
    product?.image_filename ||
    product?.filename ||
    product?.file_name ||
    product?.thumbnail ||
    product?.product_photo ||
    product?.productImage ||
    product?.imageUrl ||
    product?.img ||
    product?.picture ||
    product?.media_url ||
    product?.photo_url;

  const productImage = getProductImageUrl(rawImageValue);

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        Loading product details...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="p-6 text-center text-gray-500">
        {error || "No product details found."}
      </div>
    );
  }

  return (
<div className="print-area pt-4 px-8 pb-8 max-w-7xl mx-auto bg-white rounded-lg shadow-md">
<h1 className="text-2xl font-semibold text-gray-800 mb-2">Product Detail</h1>
<div className="print-top grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <section className="xl:col-span-4">
          <div className="bg-gray-50 rounded-lg border p-3">
<div className="w-full h-[360px] flex items-center justify-center bg-white rounded-lg border overflow-hidden">
              {productImage && !imageFailed ? (
                <img
                  src={productImage}
                  alt={product?.product_name || product?.name || "Product"}
                  className="max-h-full max-w-full object-contain"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <div className="text-gray-400 text-sm">No product image</div>
              )}
            </div>
          </div>
        </section>

<section className="product-top-right xl:col-span-8 flex flex-col gap-3 h-[360px] min-h-[360px]">
<section className="bg-gray-50 rounded-lg p-4 border flex-1">
<h2 className="text-2xl font-semibold text-gray-800 mb-3">
              Product Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
              <div>
                <DetailRow label="Product Name" value={product.product_name || product.name} />
                <DetailRow label="Product Number" value={product.product_number} />
                <DetailRow label="SKU" value={product.sku} />
                <DetailRow label="Category" value={product.category_name || product.category} />
                <DetailRow label="Type" value={product.product_type} />
              </div>

              <div>
                <DetailRow label="Status" value={product.status} />
                <DetailRow label="Revision" value={product.revision} />
                <DetailRow label="Unit Price" value={money(product.unit_price)} />
                <DetailRow label="Description" value={product.description} />
              </div>
            </div>
          </section>

<section className="bg-gray-50 rounded-lg p-4 border flex-1">
<h2 className="text-2xl font-semibold text-gray-800 mb-3">
              Inventory / Build Summary
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
              <div>
                <DetailRow label="Qty On Hand" value={product.quantity_on_hand} />
                <DetailRow label="Min Stock" value={product.min_stock} />
                <DetailRow label="Max Stock" value={product.max_stock} />
                <DetailRow label="UOM" value={product.uom} />
              </div>
              <div>
                <DetailRow label="Mechanical Budget" value={money(totals.mechanical)} />
                <DetailRow label="Electrical Budget" value={money(totals.electrical)} />
                <DetailRow label="Other Budget" value={money(totals.other)} />
                <DetailRow label="Grand Total" value={money(totals.grand)} />
              </div>
            </div>
          </section>
        </section>
      </div>
        <hr className="my-6" />

<div className="no-print flex justify-end mb-4 gap-2">
  <button
    type="button"
    onClick={() => setShowAddBomModal(true)}
    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
  >
    Add BOM Part
  </button>

  <button
    type="button"
    onClick={handlePrintBom}
    className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
  >
    Print BOM
  </button>

  <label className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer">
    {uploadingBom ? "Uploading..." : "Upload BOM"}
    <input
      type="file"
      accept=".xlsx,.xls,.csv"
      className="hidden"
      onChange={handleBomFileUpload}
      disabled={uploadingBom}
    />
  </label>
</div>

      <BomTable
  title="Mechanical Parts"
  rows={mechanicalParts}
  total={totals.mechanical}
  bomLoading={bomLoading}
  emptyText="No mechanical BOM parts found."
  onOpenPart={openPartDetail}
  onDeleteRow={handleDeleteBomRow}
  onDeleteSection={handleDeleteBomSection}
/>

      <hr className="my-6" />

  <BomTable
  title="Electrical Parts"
  rows={electricalParts}
  total={totals.electrical}
  bomLoading={bomLoading}
  emptyText="No electrical BOM parts found."
  onOpenPart={openPartDetail}
  onDeleteRow={handleDeleteBomRow}
  onDeleteSection={handleDeleteBomSection}
/>

<div className="no-print mt-6">
        <button
          onClick={() => navigate("/products")}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Back to Products
        </button>
      </div>

{showAddBomModal && (
  <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Add BOM Part</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Part Number</label>
          <input
            type="text"
            value={newBomRow.part_number}
            onChange={(e) =>
              setNewBomRow((prev) => ({ ...prev, part_number: e.target.value }))
            }
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Part Name</label>
          <input
            type="text"
            value={newBomRow.part_name}
            onChange={(e) =>
              setNewBomRow((prev) => ({ ...prev, part_name: e.target.value }))
            }
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Qty Required</label>
          <input
            type="number"
            min="1"
            step="1"
            value={newBomRow.qty_required}
            onChange={(e) =>
              setNewBomRow((prev) => ({ ...prev, qty_required: e.target.value }))
            }
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
          <select
            value={newBomRow.section}
            onChange={(e) =>
              setNewBomRow((prev) => ({ ...prev, section: e.target.value }))
            }
            className="w-full border rounded px-3 py-2"
          >
            <option value="electrical">Electrical</option>
            <option value="mechanical">Mechanical</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={newBomRow.unit_price}
            onChange={(e) =>
              setNewBomRow((prev) => ({ ...prev, unit_price: e.target.value }))
            }
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input
            type="text"
            value={newBomRow.source_description}
            onChange={(e) =>
              setNewBomRow((prev) => ({
                ...prev,
                source_description: e.target.value,
              }))
            }
            className="w-full border rounded px-3 py-2"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <button
          type="button"
          onClick={() => setShowAddBomModal(false)}
          className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleAddBomRow}
          disabled={addingBomRow}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {addingBomRow ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  </div>
)}

      {showPartDetail && selectedPart && (
        <PartDetail
          part={selectedPart}
          onClose={() => {
            setShowPartDetail(false);
            setSelectedPart(null);
            setPartModalLoading(false);
          }}
        />
      )}

      {showPartDetail && partModalLoading && (
        <div className="fixed bottom-4 right-4 z-[60] bg-white border shadow px-4 py-2 rounded text-sm text-gray-600">
          Loading full part details...
        </div>
      )}
    </div>
  );
}

