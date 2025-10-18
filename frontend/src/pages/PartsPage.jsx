// frontend/src/pages/PartsPage.jsx
import React, { useEffect, useState } from "react";
import api from "../utils/api";
import PartForm from "../components/forms/PartForm";
import BulkUploadModal from "../components/modals/BulkUploadModal";

export default function PartsPage() {
  const [parts, setParts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editingPart, setEditingPart] = useState(null);

  const loadParts = async () => {
    try {
      const data = await api.fetchParts();
      setParts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("❌ Error loading parts:", e);
      setParts([]);
    }
  };

  useEffect(() => {
    loadParts();
  }, []);

  const handlePartSaved = () => {
    setShowForm(false);
    setEditingPart(null);
    loadParts();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Inventory / Parts</h2>
          <p className="text-gray-500 text-sm">
            Manage parts and materials in your inventory
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setEditingPart(null);
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            ➕ Add Part
          </button>
          <button
            onClick={() => setShowBulk(true)}
            className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded"
          >
            ⬆️ Bulk Upload
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-md rounded-lg p-4 overflow-x-auto">
        {parts.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">
            No parts found. Add a part or upload in bulk.
          </p>
        ) : (
          <table className="min-w-full border text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="border px-3 py-2 text-left">Part #</th>
                <th className="border px-3 py-2 text-left">Name</th>
                <th className="border px-3 py-2 text-left">Category</th>
                <th className="border px-3 py-2 text-left">UOM</th>
                <th className="border px-3 py-2 text-right">Qty</th>
                <th className="border px-3 py-2 text-right">Unit Price</th>
                <th className="border px-3 py-2 text-left">Supplier</th>
                <th className="border px-3 py-2 text-left">Location</th>
                <th className="border px-3 py-2 text-center">Status</th>
                <th className="border px-3 py-2 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((p) => (
                <tr key={p.part_id ?? p.id ?? p.part_number} className="hover:bg-gray-50">
                  <td className="border px-3 py-2">{p.part_number}</td>
                  <td className="border px-3 py-2">{p.part_name}</td>
                  <td className="border px-3 py-2">{p.category || "-"}</td>
                  <td className="border px-3 py-2">{p.uom || "-"}</td>
                  <td className="border px-3 py-2 text-right">{p.quantity_on_hand ?? "-"}</td>
                  <td className="border px-3 py-2 text-right">{p.unit_price ? `$${p.unit_price}` : "-"}</td>
                  <td className="border px-3 py-2">{p.supplier_name || "-"}</td>
                  <td className="border px-3 py-2">{p.location || "-"}</td>
                  <td className="border px-3 py-2 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${p.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
                      {p.status || "Unknown"}
                    </span>
                  </td>
                  <td className="border px-3 py-2 text-center">
                    <button
                      onClick={() => {
                        setEditingPart(p);
                        setShowForm(true);
                      }}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Part Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg p-6 relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingPart ? "Edit Part" : "Add Part"}
            </h3>

            <PartForm
              initial={editingPart ?? {}}
              onSaved={handlePartSaved}
              onCancel={() => {
                setShowForm(false);
                setEditingPart(null);
              }}
            />

            <button
              className="absolute top-3 right-4 text-gray-500 hover:text-gray-700"
              onClick={() => {
                setShowForm(false);
                setEditingPart(null);
              }}
            >
              ✖
            </button>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulk && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-3xl rounded-lg shadow-lg p-6 relative">
            <BulkUploadModal
              onClose={() => setShowBulk(false)}
              onComplete={() => {
                setShowBulk(false);
                loadParts();
              }}
            />
            <button
              className="absolute top-3 right-4 text-gray-500 hover:text-gray-700"
              onClick={() => setShowBulk(false)}
            >
              ✖
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
