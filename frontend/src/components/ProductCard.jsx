// frontend/src/components/ProductCard.jsx
import React from "react";

export default function ProductCard({ product, onView, onEdit }) {
  return (
    <div className="bg-white shadow rounded-lg p-4 border hover:shadow-lg transition-all">
      <h3 className="text-lg font-semibold text-gray-800">{product.product_name}</h3>
      <p className="text-sm text-gray-500 mb-1">{product.product_code}</p>
      <p className="text-sm text-gray-600">
        <span className="font-medium">Category:</span> {product.category || "—"}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium">Status:</span>{" "}
        <span
          className={`px-2 py-0.5 rounded-full text-xs ${
            product.status === "Active"
              ? "bg-green-100 text-green-800"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          {product.status}
        </span>
      </p>

      <div className="flex justify-between mt-3">
        <button
          onClick={() => onView(product)}
          className="text-blue-600 text-sm hover:underline"
        >
          View
        </button>
        <button
          onClick={() => onEdit(product)}
          className="text-gray-700 text-sm hover:underline"
        >
          Edit
        </button>
      </div>
    </div>
  );
}
