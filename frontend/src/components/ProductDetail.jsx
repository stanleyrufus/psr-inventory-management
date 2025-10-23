// frontend/src/components/ProductDetail.jsx
import React from "react";

export default function ProductDetail({ product, onClose }) {
  if (!product) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-800">
            {product.product_name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-lg"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p>
              <span className="font-medium text-gray-700">Code:</span>{" "}
              {product.product_code}
            </p>
            <p>
              <span className="font-medium text-gray-700">Category:</span>{" "}
              {product.category}
            </p>
            <p>
              <span className="font-medium text-gray-700">Subcategory:</span>{" "}
              {product.subcategory || "—"}
            </p>
            <p>
              <span className="font-medium text-gray-700">Machine Type:</span>{" "}
              {product.machine_type || "—"}
            </p>
            <p>
              <span className="font-medium text-gray-700">Frame Series:</span>{" "}
              {product.frame_series || "—"}
            </p>
          </div>

          <div>
            <p>
              <span className="font-medium text-gray-700">Status:</span>{" "}
              {product.status}
            </p>
            <p>
              <span className="font-medium text-gray-700">Demo Available:</span>{" "}
              {product.demo_available ? "Yes" : "No"}
            </p>
            <p>
              <span className="font-medium text-gray-700">Contact Email:</span>{" "}
              {product.contact_email}
            </p>
            <p>
              <span className="font-medium text-gray-700">Contact Phone:</span>{" "}
              {product.contact_phone}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="font-medium text-gray-800 mb-1">Description</h3>
          <p className="text-gray-600 text-sm whitespace-pre-line">
            {product.full_description || product.short_description || "—"}
          </p>
        </div>

        {product.image_url && (
          <div className="mt-4">
            <img
              src={product.image_url}
              alt={product.product_name}
              className="rounded-lg shadow max-h-60 object-contain mx-auto"
            />
          </div>
        )}
      </div>
    </div>
  );
}
