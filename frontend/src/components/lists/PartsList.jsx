import React from "react";
import api from "../../utils/api";

export default function PartsList({ parts, onEdit, onView, onDeleted }) {
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete part "${name}" permanently?`)) return;
    try {
      await api.deletePart(id);
      alert("✅ Part deleted successfully!");
      onDeleted && onDeleted(); // reload after deletion
    } catch (err) {
      console.error("❌ Delete failed:", err);
      alert("Error deleting part. Check console.");
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-4 overflow-auto">
      <table className="min-w-full text-left text-sm border">
        <thead className="bg-gray-100">
          <tr>
            <th className="py-2 px-3 border">#</th>
            <th className="py-2 px-3 border">Part Number</th>
            <th className="py-2 px-3 border">Part Name</th>
            <th className="py-2 px-3 border">Category</th>
            <th className="py-2 px-3 border">Qty</th>
            <th className="py-2 px-3 border">Unit Price</th>
            <th className="py-2 px-3 border text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {parts.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center py-4">
                No parts found
              </td>
            </tr>
          )}
          {parts.map((p, idx) => (
            <tr key={p.part_id || idx} className="hover:bg-gray-50">
              <td className="py-2 px-3 border">{p.part_id}</td>
              <td className="py-2 px-3 border">{p.part_number}</td>
              <td className="py-2 px-3 border">{p.part_name}</td>
              <td className="py-2 px-3 border">{p.category || "-"}</td>
              <td className="py-2 px-3 border text-right">
                {p.quantity_on_hand ?? "-"}
              </td>
              <td className="py-2 px-3 border text-right">
                {p.current_unit_price
                  ? `$${Number(p.current_unit_price).toFixed(2)}`
                  : "-"}
              </td>
              <td className="py-2 px-3 border text-center flex justify-center gap-2">
                <button
                  onClick={() => onView && onView(p)}
                  className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-xs"
                >
                  View
                </button>
                <button
                  onClick={() => onEdit && onEdit(p)}
                  className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(p.part_id, p.part_name)}
                  className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
