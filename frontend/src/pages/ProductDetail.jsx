import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

const money = (v) => "$" + Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ProductDetail() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();

  const [product, setProduct] = useState(state?.product || null);
  const [bom, setBom] = useState(null);
  const [loading, setLoading] = useState(!state?.product);
  const [bomLoading, setBomLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadProduct() {
      try {
        setLoading(true);
        setError("");

        const res = await axios.get(`${BASE}/api/products/${id}`);
        if (!ignore) {
          setProduct(res?.data?.data || null);
        }
      } catch (err) {
        console.error("❌ Error loading product:", err);
        if (!ignore) {
          setError("Failed to load product details.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    if (!state?.product) {
      loadProduct();
    } else {
      setLoading(false);
    }

    return () => {
      ignore = true;
    };
  }, [id, state]);

  useEffect(() => {
    let ignore = false;

    async function loadBom() {
      try {
        setBomLoading(true);
        const res = await axios.get(`${BASE}/api/products/${id}/bom`);
        if (!ignore) {
          setBom(res?.data?.data || null);
        }
      } catch (err) {
        console.error("❌ Error loading product BOM:", err);
        if (!ignore) {
          setBom(null);
        }
      } finally {
        if (!ignore) setBomLoading(false);
      }
    }

    loadBom();

    return () => {
      ignore = true;
    };
  }, [id]);

  const mechanicalParts = useMemo(() => bom?.grouped?.mechanical || [], [bom]);
  const totals = bom?.totals || { mechanical: 0, electrical: 0, other: 0, grand: 0 };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading product details...</div>;
  }

  if (error || !product) {
    return <div className="p-6 text-center text-gray-500">{error || "No product details found."}</div>;
  }

  const hasLegacySpecs =
    product.machine_type ||
    product.frame_series ||
    product.nozzle_count ||
    typeof product.demo_available !== "undefined";

  const keyFeatures = Array.isArray(product.key_features)
    ? product.key_features
    : [];

  const applications = Array.isArray(product.applications)
    ? product.applications
    : [];

  return (
    <div className="p-8 max-w-7xl mx-auto bg-white rounded-lg shadow-md">
      <button
        onClick={() => navigate(-1)}
        className="text-blue-600 text-sm font-medium mb-4 hover:underline"
      >
        ← Back to Products
      </button>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="flex justify-center">
          <img
            src={product.image_url || "/images/placeholder.jpg"}
            alt={product.product_name}
            className="w-full max-w-md rounded-lg object-cover shadow"
          />
        </div>

        <div className="flex flex-col">
          <h1 className="text-3xl font-bold text-gray-800 mb-1">
            {product.product_code ? `${product.product_code} — ` : ""}
            {product.product_name}
          </h1>

          <p className="text-blue-600 font-semibold mb-1">{product.category}</p>

          <p className="text-gray-700 mb-4 leading-relaxed whitespace-pre-line">
            {product.full_description || product.long_description || product.short_description}
          </p>

          {product.pdf_brochure_url && (
            <a
              href={product.pdf_brochure_url}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-blue-600 font-medium hover:underline mb-4"
            >
              📄 Download Brochure
            </a>
          )}

          {keyFeatures.length > 0 && (
            <section className="mb-4">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">Key Features</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                {keyFeatures.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </section>
          )}

          {hasLegacySpecs ? (
            <section className="mb-2">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">Technical Specifications</h2>
              <table className="min-w-full text-sm border">
                <tbody>
                  {product.machine_type && (
                    <tr>
                      <td className="border px-3 py-2 font-medium w-1/3 text-gray-800">
                        Machine Type
                      </td>
                      <td className="border px-3 py-2 text-gray-700">{product.machine_type}</td>
                    </tr>
                  )}
                  {product.frame_series && (
                    <tr>
                      <td className="border px-3 py-2 font-medium w-1/3 text-gray-800">
                        Frame Series
                      </td>
                      <td className="border px-3 py-2 text-gray-700">{product.frame_series}</td>
                    </tr>
                  )}
                  {typeof product.nozzle_count !== "undefined" && product.nozzle_count && (
                    <tr>
                      <td className="border px-3 py-2 font-medium w-1/3 text-gray-800">
                        Nozzle Count
                      </td>
                      <td className="border px-3 py-2 text-gray-700">{product.nozzle_count}</td>
                    </tr>
                  )}
                  {typeof product.demo_available !== "undefined" && (
                    <tr>
                      <td className="border px-3 py-2 font-medium w-1/3 text-gray-800">
                        Demo Available
                      </td>
                      <td className="border px-3 py-2 text-gray-700">
                        {product.demo_available ? "Yes" : "No"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          ) : null}
        </div>
      </div>

      {applications.length > 0 && (
        <>
          <hr className="my-6" />
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-800">Applications</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              {applications.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </section>
        </>
      )}

      <hr className="my-6" />

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-semibold text-gray-800">Mechanical Parts</h2>
          {bomLoading ? (
            <span className="text-sm text-gray-500">Loading BOM...</span>
          ) : (
            <span className="text-lg font-semibold text-green-700">
              Mechanical Budget: {money(totals.mechanical)}
            </span>
          )}
        </div>

        {bomLoading ? (
          <div className="text-gray-500 py-6">Loading BOM details...</div>
        ) : mechanicalParts.length === 0 ? (
          <div className="text-gray-500 py-6">No mechanical BOM parts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-3 py-2 text-left">Part Number</th>
                  <th className="border px-3 py-2 text-left">Part Name / Description</th>
                  <th className="border px-3 py-2 text-left">Vendor</th>
                  <th className="border px-3 py-2 text-right">Unit Price</th>
                  <th className="border px-3 py-2 text-right">Qty Required</th>
                  <th className="border px-3 py-2 text-right">Extended Cost</th>
                  <th className="border px-3 py-2 text-right">Stock</th>
                  <th className="border px-3 py-2 text-left">UOM</th>
                </tr>
              </thead>
              <tbody>
                {mechanicalParts.map((row) => (
                  <tr key={row.id}>
                    <td className="border px-3 py-2 font-medium text-gray-800">
                      {row.part_number}
                    </td>
                    <td className="border px-3 py-2 text-gray-700">
                      {row.part_name || row.description || row.source_description || "-"}
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
                  <td colSpan="5" className="border px-3 py-2 text-right font-semibold text-gray-800">
                    Mechanical Total
                  </td>
                  <td className="border px-3 py-2 text-right font-bold text-green-700">
                    {money(totals.mechanical)}
                  </td>
                  <td colSpan="2" className="border px-3 py-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <hr className="my-6" />

      <div className="text-sm text-gray-700">
        📞 {product.contact_phone} &nbsp; | &nbsp; ✉️{" "}
        <a
          href={`mailto:${product.contact_email}`}
          className="text-blue-600 hover:underline"
        >
          {product.contact_email}
        </a>
      </div>
    </div>
  );
}
