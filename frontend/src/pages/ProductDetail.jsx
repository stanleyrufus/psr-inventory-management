import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
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
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-semibold text-gray-800">{title}</h2>
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
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td
                  colSpan="5"
                  className="border px-3 py-2 text-right font-semibold text-gray-800"
                >
                  {title.replace(" Parts", "")} Total
                </td>
                <td className="border px-3 py-2 text-right font-bold text-green-700">
                  {money(total)}
                </td>
                <td colSpan="2" className="border px-3 py-2"></td>
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
  const [importingBom, setImportingBom] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setBomLoading(true);
        setError("");
        setImageFailed(false);

        const [productRes, bomRes] = await Promise.all([
          axios.get(`${BASE}/products/${id}`),
          axios.get(`${BASE}/products/${id}/bom`),
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
      const res = await axios.get(`${BASE}/parts/${row.part_id}`);
      const resolvedPart = res?.data?.data || res?.data || row;
      setSelectedPart(resolvedPart);
    } catch (err) {
      console.warn("Part detail enrichment failed, using BOM row data:", err);
      setSelectedPart(row);
    } finally {
      setPartModalLoading(false);
    }
  };

  const handleImportBom = async () => {
    try {
      setImportingBom(true);
await axios.post(`${BASE}/products/${id}/bom/import`);

alert("BOM imported successfully");

// reload BOM
const bomRes = await axios.get(`${BASE}/products/${id}/bom`);
const resolvedBom = bomRes?.data?.data || bomRes?.data || null;
setBom(resolvedBom);
    } catch (err) {
      console.error("BOM import trigger failed:", err);
      alert("Failed to import BOM");
    } finally {
      setImportingBom(false);
    }
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
<div className="pt-4 px-8 pb-8 max-w-7xl mx-auto bg-white rounded-lg shadow-md">
<h1 className="text-2xl font-semibold text-gray-800 mb-2">Product Detail</h1>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
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

<section className="xl:col-span-8 flex flex-col gap-3 h-[360px] min-h-[360px]">
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

      <div className="flex justify-end mb-4 gap-2">
        <button
          type="button"
          onClick={handleImportBom}
          disabled={importingBom}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {importingBom ? "Importing..." : "Import BOM"}
        </button>
      </div>

      <BomTable
        title="Mechanical Parts"
        rows={mechanicalParts}
        total={totals.mechanical}
        bomLoading={bomLoading}
        emptyText="No mechanical BOM parts found."
        onOpenPart={openPartDetail}
      />

      <hr className="my-6" />

      <BomTable
        title="Electrical Parts"
        rows={electricalParts}
        total={totals.electrical}
        bomLoading={bomLoading}
        emptyText="No electrical BOM parts found."
        onOpenPart={openPartDetail}
      />

      <div className="mt-6">
        <button
          onClick={() => navigate("/products")}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Back to Products
        </button>
      </div>

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