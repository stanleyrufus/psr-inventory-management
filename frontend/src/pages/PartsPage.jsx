import React, { useEffect, useState } from "react";
import api from "../utils/api";
import PartForm from "../components/forms/PartForm"; // singular
import PartsList from "../components/lists/PartsList";

export default function PartsPage() {
  const [parts, setParts] = useState([]);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    api.fetchParts().then(setParts).catch((e) => console.error(e));
  }, []);

  const onSaved = () => {
    api.fetchParts().then(setParts);
    setEditing(null);
  };

  const onEdit = (part) => {
    setEditing(part);
  };

  const openNew = () => setEditing({}); // empty object for new part

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold">Inventory / Parts</h2>
          <p className="text-sm text-gray-500">Manage parts used in machines</p>
        </div>
        <div>
          <button
            onClick={openNew}
            className="bg-psr-accent text-white px-4 py-2 rounded"
          >
            Add Part
          </button>
        </div>
      </div>

      <div className="card p-4">
        <PartsList parts={parts} onEdit={onEdit} />
      </div>

      {editing !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-auto">
          <div className="bg-white p-6 rounded w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <PartForm
              initial={editing}
              onSaved={onSaved}
              onCancel={() => setEditing(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
