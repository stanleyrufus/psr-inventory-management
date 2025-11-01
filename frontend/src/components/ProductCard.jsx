import React from "react";

export default function ProductCard({ product, onView }) {
  return (
    <div
      className="bg-white rounded-xl shadow hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer group"
      onClick={() => onView(product)}
    >
      <div className="relative w-full h-52 overflow-hidden">
        <img
          src={product.image_url || "/images/placeholder.jpg"}
          alt={product.product_name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>
      <div className="p-4">
        <h2 className="font-semibold text-gray-800 text-lg">
          {product.product_code} — {product.product_name}
        </h2>
        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
          {product.short_description || "Industrial automation solution"}
        </p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView(product);
          }}
          className="mt-3 text-blue-600 text-sm font-semibold hover:underline"
        >
          View Details →
        </button>
      </div>
    </div>
  );
}
