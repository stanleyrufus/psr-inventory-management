import React from "react";

export default function CategoryTabs({ selectedCategory, onSelect }) {
  const categories = [
    "All Products",
    "Filling Machines",
    "Capping Machines",
    "Labeling Machines",
    "Material Handling",
    "Other Machines",
  ];

  return (
    <div className="flex flex-wrap justify-center gap-3 mb-8">
      {categories.map((cat) => {
        const isActive =
          (cat === "All Products" && !selectedCategory) ||
          selectedCategory === cat;
        return (
          <button
            key={cat}
            onClick={() => onSelect(cat === "All Products" ? "" : cat)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              isActive
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
