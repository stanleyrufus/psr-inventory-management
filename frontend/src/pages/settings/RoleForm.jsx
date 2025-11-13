import { createPortal } from "react-dom";
import { useState, useEffect } from "react";
import { Button, TextInput, Textarea } from "@tremor/react";
import { apiRaw as api } from "../../utils/api";

/* Custom modal (fixed overlay) to guarantee proper centering/z-index */
export default function RoleForm({ open, onClose, onSaved, initial = {} }) {
  const isEdit = Boolean(initial?.id);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return; // avoid flicker when closed
    if (initial && initial.id) {
      setFormData({
        name: initial.name || "",
        description: initial.description || "",
      });
    } else {
      setFormData({ name: "", description: "" });
    }
    setMessage("");
    setErrors({});
  }, [initial, open]);

  if (!open) return null;

  function validate() {
    const errs = {};
    if (!formData.name.trim()) errs.name = "Role name is required.";
    return errs;
  }

  async function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    try {
      setSaving(true);
      if (isEdit) {
        await api.put(`/roles/${initial.id}`, formData);
      } else {
        await api.post("/roles", formData);
      }
      setMessage("Role saved successfully.");
      setErrors({});
      onSaved && onSaved();
    } catch (err) {
      console.error("Failed saving role:", err);
      setMessage(
        err?.response?.data?.message || "Failed to save role. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

 if (!open) return null;

return createPortal(
  <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4">
    <div className="w-full max-w-lg rounded-xl bg-white shadow-xl ring-1 ring-gray-200 p-6 space-y-4">
      
      <h2 className="text-xl font-semibold">
        {isEdit ? "Edit Role" : "Add New Role"}
      </h2>

      {/* Role Name */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Role Name</label>
        <TextInput
          placeholder="Enter role name (e.g., admin)"
          value={formData.name}
          onChange={(e) =>
            setFormData({ ...formData, name: e.target.value })
          }
        />
        {errors.name && (
          <p className="text-red-600 text-xs">{errors.name}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Description (optional)</label>
        <Textarea
          placeholder="Short description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
      </div>

      {/* Message */}
      {message && (
        <p
          className={`text-sm ${
            message.includes("success") ? "text-green-600" : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Close
        </Button>

        {!message.includes("success") && (
          <Button color="blue" loading={saving} onClick={handleSave}>
            {isEdit ? "Update Role" : "Add Role"}
          </Button>
        )}
      </div>

    </div>
  </div>,
  document.getElementById("modal-root") // ✅ THIS IS THE PORTAL TARGET
);

}
