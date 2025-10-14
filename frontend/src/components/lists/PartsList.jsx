// src/components/lists/PartsList.jsx
import React from "react";

export default function PartsList({ parts, onEdit }) {
  return (
    <div className="bg-white shadow rounded-lg p-4 overflow-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="py-2 px-3 border">ID</th>
            <th className="py-2 px-3 border">Part Number</th>
            <th className="py-2 px-3 border">Name</th>
            <th className="py-2 px-3 border">Category</th>
            <th className="py-2 px-3 border">Description</th>
            <th className="py-2 px-3 border">UOM</th>
            <th className="py-2 px-3 border">Qty On Hand</th>
            <th className="py-2 px-3 border">Min Stock</th>
            <th className="py-2 px-3 border">Unit Price</th>
            <th className="py-2 px-3 border">Supplier</th>
            <th className="py-2 px-3 border">Supplier Part #</th>
            <th className="py-2 px-3 border">Location</th>
            <th className="py-2 px-3 border">Status</th>
            <th className="py-2 px-3 border">Used in Products</th>
            <th className="py-2 px-3 border">Lead Time (days)</th>
            <th className="py-2 px-3 border">Weight (kg)</th>
            <th className="py-2 px-3 border">Material</th>
            <th className="py-2 px-3 border">Machine Compatibility</th>
            <th className="py-2 px-3 border">Last Order Date</th>
            <th className="py-2 px-3 border">Remarks</th>
            <th className="py-2 px-3 border">Created At</th>
            <th className="py-2 px-3 border">Updated At</th>
            <th className="py-2 px-3 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {parts.length === 0 && (
            <tr>
              <td className="p-4 border text-center" colSpan={23}>
                No parts
              </td>
            </tr>
          )}
          {parts.map((p) => (
            <tr key={p.part_id} className="border-t">
              <td className="py-2 px-3 border">{p.part_id}</td>
              <td className="py-2 px-3 border">{p.part_number}</td>
              <td className="py-2 px-3 border">{p.part_name}</td>
              <td className="py-2 px-3 border">{p.category}</td>
              <td className="py-2 px-3 border">{p.description}</td>
              <td className="py-2 px-3 border">{p.uom}</td>
              <td className="py-2 px-3 border">{p.quantity_on_hand}</td>
              <td className="py-2 px-3 border">{p.minimum_stock_level}</td>
              <td className="py-2 px-3 border">${p.unit_price}</td>
              <td className="py-2 px-3 border">{p.supplier_name}</td>
              <td className="py-2 px-3 border">{p.supplier_part_number}</td>
              <td className="py-2 px-3 border">{p.location}</td>
              <td className="py-2 px-3 border">{p.status}</td>
              <td className="py-2 px-3 border">{p.used_in_products?.join(", ")}</td>
              <td className="py-2 px-3 border">{p.lead_time_days}</td>
              <td className="py-2 px-3 border">{p.weight_kg}</td>
              <td className="py-2 px-3 border">{p.material}</td>
              <td className="py-2 px-3 border">{p.machine_compatibility}</td>
              <td className="py-2 px-3 border">{p.last_order_date}</td>
              <td className="py-2 px-3 border">{p.remarks}</td>
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
