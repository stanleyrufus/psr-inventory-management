// frontend/src/pages/settings/PermissionsModal.jsx
import { useEffect, useState } from "react";
import { Button } from "@tremor/react";
import { apiRaw as api } from "../../utils/api";

export default function PermissionsModal({ role, open, onClose }) {
  const [allPerms, setAllPerms] = useState([]);
  const [selected, setSelected] = useState([]);

  const isAdmin = role?.name?.toLowerCase() === "admin";

  // Load permissions when modal opens
  useEffect(() => {
    if (!open || !role) return;
    loadPermissions();
  }, [open, role]);

  async function loadPermissions() {
    try {
      const all = await api.get("/permissions");
      const assigned = await api.get(`/permissions/role/${role.id}`);

      const allList = all.data.data || all.data || [];
      const assignedIds = assigned.data.permission_ids || assigned.data.permissions || [];

      setAllPerms(allList);
      setSelected(assignedIds);
    } catch (err) {
      console.error("Failed to load permissions:", err);
      alert("Failed to load permissions for this role");
    }
  }

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const allIds = allPerms.map((p) => p.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.includes(id));

  const handleSelectAll = () => {
    if (allSelected) {
      setSelected([]);
    } else {
      setSelected(allIds);
    }
  };

  async function save() {
    try {
      // For admin, we don't actually need to store anything, but we'll still save to keep DB consistent
      await api.put(`/permissions/role/${role.id}`, {
        permission_ids: selected,
      });
      alert("Permissions updated");
      onClose();
    } catch (err) {
      console.error("Failed to save permissions:", err);
      alert("Failed to save permissions");
    }
  }

  if (!open || !role) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-[1000] flex justify-center items-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">
            Permissions for: <span className="font-bold">{role.name}</span>
          </h2>
          <button
            className="text-gray-500 text-xl"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Admin note */}
        {isAdmin && (
          <div className="mb-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
            <strong>Admin role:</strong> Admin has full access by design. These
            checkboxes are informational and not needed for enforcing access.
          </div>
        )}

        {/* Select All */}
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={handleSelectAll}
              disabled={allPerms.length === 0}
            />
            Select All
          </label>
          <span className="text-xs text-gray-500">
            {selected.length} of {allPerms.length} selected
          </span>
        </div>

        {/* Permissions list */}
        <div className="space-y-2 max-h-80 overflow-y-auto border border-gray-200 p-3 rounded">
          {allPerms.length === 0 && (
            <div className="text-sm text-gray-500">No permissions defined.</div>
          )}

          {allPerms.map((p) => (
            <label
              key={p.id}
              className="flex items-start gap-3 text-sm text-gray-800"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={selected.includes(p.id)}
                onChange={() => toggle(p.id)}
                disabled={isAdmin} // admin doesn't need per-permission toggles
              />
              <div>
                <div className="font-medium">{p.name}</div>
                {p.description && (
                  <div className="text-xs text-gray-500">{p.description}</div>
                )}
              </div>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={isAdmin}>
            {isAdmin ? "Admin Has All Access" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
