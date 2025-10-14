// src/components/lists/ProductList.jsx
import React from "react";

export default function ProductList({ products, onEdit }) {
  return (
    <div className="bg-white shadow rounded-lg p-4 overflow-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="py-2 px-3 border">ID</th>
            <th className="py-2 px-3 border">Name</th>
            <th className="py-2 px-3 border">SKU</th>
            <th className="py-2 px-3 border">Description</th>
            <th className="py-2 px-3 border">Category</th>
            <th className="py-2 px-3 border">Model</th>
            <th className="py-2 px-3 border">Dimensions</th>
            <th className="py-2 px-3 border">Weight (kg)</th>
            <th className="py-2 px-3 border">Price</th>
            <th className="py-2 px-3 border">Status</th>
            <th className="py-2 px-3 border">Created At</th>
            <th className="py-2 px-3 border">Updated At</th>
            <th className="py-2 px-3 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 && (
            <tr>
              <td className="p-4 border text-center" colSpan={13}>
                No products
              </td>
            </tr>
          )}
          {products.map((p) => (
            <tr key={p.product_id} className="border-t">
              <td className="py-2 px-3 border">{p.product_id}</td>
              <td className="py-2 px-3 border">{p.product_name}</td>
              <td className="py-2 px-3 border">{p.product_code}</td>
              <td className="py-2 px-3 border">{p.description}</td>
              <td className="py-2 px-3 border">{p.category}</td>
              <td className="py-2 px-3 border">{p.model_number}</td>
              <td className="py-2 px-3 border">{p.dimensions}</td>
              <td className="py-2 px-3 border">{p.weight_kg}</td>
              <td className="py-2 px-3 border">${p.price}</td>
              <td className="py-2 px-3 border">{p.status}</td>
              <td className="py-2 px-3 border">{new Date(p.created_at).toLocaleString()}</td>
              <td className="py-2 px-3 border">{new Date(p.updated_at).toLocaleString()}</td>
              <td className="py-2 px-3 border">
                <button
                  onClick={() => onEdit(p)}
                  className="text-sm px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
