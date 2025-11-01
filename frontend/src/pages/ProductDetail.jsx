import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function ProductDetail() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const product = state?.product;

  if (!product)
    return <div className="p-6 text-center text-gray-500">No product details found.</div>;

  // Helpers for legacy specs fallback
  const hasLegacySpecs =
    product.machine_type ||
    product.frame_series ||
    product.nozzle_count ||
    typeof product.demo_available !== "undefined";

  return (
    <div className="p-8 max-w-6xl mx-auto bg-white rounded-lg shadow-md">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="text-blue-600 text-sm font-medium mb-4 hover:underline"
      >
        ← Back to Products
      </button>

      {/* Top: Image (left) + Info/Description (right) */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: Image */}
        <div className="flex justify-center">
          <img
            src={product.image_url || "/images/placeholder.jpg"}
            alt={product.product_name}
            className="w-full max-w-md rounded-lg object-cover shadow"
          />
        </div>

        {/* Right: Title, meta, description, THEN features + specs to fill the gap */}
        <div className="flex flex-col">
          {/* Title + Meta */}
          <h1 className="text-3xl font-bold text-gray-800 mb-1">
            {product.product_code ? `${product.product_code} — ` : ""}
            {product.product_name}
          </h1>
          <p className="text-blue-600 font-semibold mb-1">{product.category}</p>

          {/* Description (stays here) */}
          <p className="text-gray-700 mb-4 leading-relaxed whitespace-pre-line">
            {product.long_description || product.short_description}
          </p>

          {/* Brochure link (optional) */}
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

          {/* Key Features — stacked right under description */}
          {Array.isArray(product.key_features) && product.key_features.length > 0 && (
            <section className="mb-4">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">Key Features</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                {product.key_features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Technical Specs — also in the RIGHT column to fill space */}
          {(Array.isArray(product.technical_specs) && product.technical_specs.length > 0) || hasLegacySpecs ? (
            <section className="mb-2">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">Technical Specifications</h2>

              {/* New schema: [{label,value}] */}
              {Array.isArray(product.technical_specs) && product.technical_specs.length > 0 ? (
                <table className="min-w-full text-sm border">
                  <tbody>
                    {product.technical_specs.map((row, idx) => (
                      <tr key={idx}>
                        <td className="border px-3 py-2 font-medium w-1/3 text-gray-800">
                          {row.label}
                        </td>
                        <td className="border px-3 py-2 text-gray-700">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                // Legacy fields fallback (only render what exists)
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
                    {typeof product.nozzle_count !== "undefined" && (
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
              )}
            </section>
          ) : null}
        </div>
      </div>

      {/* Applications (full width, below the two-column block) */}
      {Array.isArray(product.applications) && product.applications.length > 0 && (
        <>
          <hr className="my-6" />
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-800">Applications</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              {product.applications.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </section>
        </>
      )}

      {/* Contact (full width) */}
      <hr className="my-6" />
      <div className="text-sm text-gray-700">
        {product.contact_info ? (
          <>
            📞 {product.contact_info.phone} &nbsp; | &nbsp; ✉️{" "}
            <a href={`mailto:${product.contact_info.email}`} className="text-blue-600 hover:underline">
              {product.contact_info.email}
            </a>
          </>
        ) : (
          <>
            📞 {product.contact_phone} &nbsp; | &nbsp; ✉️ {product.contact_email}
          </>
        )}
      </div>
    </div>
  );
}
