import React from "react";

const products = [
  { id: 1, name: "Filler Model X", sku: "FL-X-001", qty: 120, status: "In Stock" },
  { id: 2, name: "Capper Pro 200", sku: "CP-200", qty: 20, status: "Low Stock" },
  { id: 3, name: "Transfer Station A", sku: "TS-A", qty: 0, status: "Out of Stock" },
];

export default function ProductTable() {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left">
        <thead>
          <tr className="text-sm text-psr-muted">
            <th className="py-2 px-3">Product</th>
            <th className="py-2 px-3">SKU</th>
            <th className="py-2 px-3">Quantity</th>
            <th className="py-2 px-3">Status</th>
            <th className="py-2 px-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="py-3 px-3">{p.name}</td>
              <td className="py-3 px-3">{p.sku}</td>
              <td className="py-3 px-3">{p.qty}</td>
              <td className="py-3 px-3">
                <span className={`px-2 py-1 rounded-full text-xs ${p.status === "Low Stock" ? "bg-yellow-100 text-yellow-800" : p.status === "Out of Stock" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                  {p.status}
                </span>
              </td>
              <td className="py-3 px-3">
                <button className="text-sm px-3 py-1 rounded bg-psr-accent text-white">Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
