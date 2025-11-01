import React from "react";
import ProductCard from "./ProductCard";

export default function ProductsList({ products, onView }) {
  if (!products || products.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12">
        No products available in this category.
      </div>
    );
  }

  return (
    <div
      id="product-grid"
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fadeIn"
    >
      {products.map((p) => {
        // Fallback image if missing or invalid
        const imageUrl =
          p.image_url && p.image_url.trim() !== ""
            ? p.image_url
            : "/images/placeholder.jpg";

        // Developer visibility for missing images (won’t show in UI)
        if (!p.image_url) {
          console.warn(`⚠️ Missing image_url for product: ${p.product_name}`);
        }

        return (
          <ProductCard
            key={p.id || p.product_code}
            product={{ ...p, image_url: imageUrl }}
            onView={onView}
          />
        );
      })}
    </div>
  );
}

/* ✅ CSS TIP (add this to your index.css if not already)
--------------------------------------------------------- */
/*
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn {
  animation: fadeIn 0.4s ease-in-out;
}
*/
