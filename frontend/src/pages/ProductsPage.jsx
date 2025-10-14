import React, { useEffect, useState } from "react";
import api from "../utils/api";
import ProductForm from "../components/forms/ProductForm";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    api.fetchProducts().then(setProducts).catch((e) => console.error(e));
  }, []);

  const openNew = () => setEditing({}); // empty object for new
  const edit = (p) => setEditing(p);

  const onSaved = (saved) => {
    api.fetchProducts().then(setProducts);
    setEditing(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold">Products (Machines)</h2>
          <p className="text-sm text-gray-500">Machines and finished goods</p>
        </div>
        <div>
          <button onClick={openNew} className="bg-psr-accent text-white px-4 py-2 rounded">Add Product</button>
        </div>
      </div>

      <div className="card p-4 overflow-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-gray-500 bg-gray-100">
            <tr>
              <th className="py-2 px-3">ID</th>
              <th className="py-2 px-3">Name</th>
              <th className="py-2 px-3">SKU</th>
              <th className="py-2 px-3">Description</th>
              <th className="py-2 px-3">Category</th>
              <th className="py-2 px-3">Model</th>
              <th className="py-2 px-3">Dimensions</th>
              <th className="py-2 px-3">Weight (kg)</th>
              <th className="py-2 px-3">Price</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Created At</th>
              <th className="py-2 px-3">Updated At</th>
              <th className="py-2 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td className="p-4 text-center" colSpan={13}>No products</td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p.product_id} className="border-t">
                <td className="py-2 px-3">{p.product_id}</td>
                <td className="py-2 px-3">{p.product_name}</td>
                <td className="py-2 px-3">{p.product_code}</td>
                <td className="py-2 px-3">{p.description}</td>
                <td className="py-2 px-3">{p.category}</td>
                <td className="py-2 px-3">{p.model_number}</td>
                <td className="py-2 px-3">{p.dimensions}</td>
                <td className="py-2 px-3">{p.weight_kg}</td>
                <td className="py-2 px-3">${p.price}</td>
                <td className="py-2 px-3">{p.status}</td>
                <td className="py-2 px-3">{p.created_at}</td>
                <td className="py-2 px-3">{p.updated_at}</td>
                <td className="py-2 px-3">
                  <button onClick={() => edit(p)} className="text-sm px-3 py-1 rounded bg-gray-100">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded w-full max-w-3xl overflow-auto">
            <ProductForm initial={editing} onSaved={onSaved} onCancel={() => setEditing(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
