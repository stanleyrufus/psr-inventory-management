import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CategoryTabs from "../components/CategoryTabs";
import ProductsList from "../components/ProductsList";
import productData from "../data/products.json"; // ✅ Local data import

export default function ProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");

  useEffect(() => {
    // Load static product data instead of API
    setProducts(productData);
  }, []);

  const filtered = useMemo(() => {
    if (!selectedCategory) return products;
    return products.filter((p) =>
      p.category?.toLowerCase().includes(selectedCategory.toLowerCase())
    );
  }, [products, selectedCategory]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-['Rajdhani']">
      {/* 🏭 Hero Section */}
      <section className="relative h-[50vh] flex flex-col justify-center items-center text-center overflow-hidden bg-gradient-to-r from-gray-900 via-blue-900 to-gray-800 text-white">
        <div className="absolute inset-0">
          <div className="hero-bg-container">
            <div
              className="hero-bg-image fade"
              style={{ backgroundImage: "url('/images/hero/filler.jpg')" }}
            ></div>
            <div
              className="hero-bg-image fade"
              style={{ backgroundImage: "url('/images/hero/capper.jpg')" }}
            ></div>
            <div
              className="hero-bg-image fade"
              style={{ backgroundImage: "url('/images/hero/inserter.jpg')" }}
            ></div>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent"></div>
        <div className="relative z-10 max-w-3xl px-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 leading-snug drop-shadow-lg">
            Powering Innovation in <span className="text-blue-400">Bottling</span>,{" "}
            <span className="text-blue-300">Capping</span>, and{" "}
            <span className="text-blue-200">Filling</span> Machinery
          </h1>
          <p className="text-base md:text-lg text-gray-200 mb-4">
            Explore world-class industrial automation solutions engineered by PSR Automation Inc.
          </p>
        </div>
      </section>

      {/* 🔹 Catalog Section */}
      <section id="product-grid" className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-semibold text-gray-800 mb-2">
            PSR Product Catalog
          </h2>
          <p className="text-gray-500 text-sm">
            Browse our lineup of industrial automation equipment
          </p>
        </div>

        {/* Category Tabs */}
        <CategoryTabs
          selectedCategory={selectedCategory}
          onSelect={(cat) => setSelectedCategory(cat)}
        />

        {/* Product Grid */}
        <ProductsList
          products={filtered}
          onView={(p) => navigate(`/products/${p.id}`, { state: { product: p } })}
        />
      </section>
    </div>
  );
}
