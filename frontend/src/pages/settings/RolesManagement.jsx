// frontend/src/pages/settings/RolesManagement.jsx
import { useEffect, useState } from "react";
import { Card, Title, Button, TextInput } from "@tremor/react";
import { apiRaw as api } from "../../utils/api";
import PermissionsModal from "./PermissionsModal";
import {
  PencilIcon,
  TrashIcon,
  Cog6ToothIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
/* -------------------------------------------------------
   Confirm Modal
------------------------------------------------------- */
function Confirm({ open, title, body, onConfirm, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6">
        <div className="flex justify-between mb-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="text-gray-500 text-xl" onClick={onClose}>✕</button>
        </div>
        <p className="text-gray-700 text-sm">{body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>

          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded shadow"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   Add/Edit Role Modal
------------------------------------------------------- */
function RoleForm({ open, initial, onSave, onClose }) {
  const [form, setForm] = useState({ name: "", description: "" });
  const isEdit = Boolean(initial?.id);

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name || "",
        description: initial.description || "",
      });
    } else {
      setForm({ name: "", description: "" });
    }
  }, [initial, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-xl p-6">
        <div className="flex justify-between mb-3">
          <h3 className="text-lg font-semibold">{isEdit ? "Edit Role" : "Add Role"}</h3>
          <button className="text-gray-500 text-xl" onClick={onClose}>✕</button>
        </div>

        <div className="space-y-3">
          <label>
            <span className="text-sm text-gray-600">Role Name</span>
            <TextInput
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Enter role name"
            />
          </label>

          <label>
            <span className="text-sm text-gray-600">Description</span>
            <TextInput
              value={form.description}
              onChange={(e) =>
                setForm((s) => ({ ...s, description: e.target.value }))
              }
              placeholder="Short description"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)}>
            {isEdit ? "Update" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   MAIN PAGE
------------------------------------------------------- */
export default function RolesManagement() {
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const [permOpen, setPermOpen] = useState(false);
  const [permRole, setPermRole] = useState(null);

  const pageSize = 10;

  useEffect(() => {
    loadRoles();
  }, []);

  async function loadRoles() {
    try {
      const res = await api.get("/roles");
      const data = res.data?.data || res.data || [];
      setRoles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed loading roles:", err);
    }
  }

  function openAddRole() {
    setSelectedRole(null);
    setFormOpen(true);
  }

  async function saveRole(form) {
    try {
      if (selectedRole?.id) {
        await api.put(`/roles/${selectedRole.id}`, form);
	alert("Role updated successfully!");
      } else {
        await api.post("/roles", form);
	alert("Role created successfully!");

      }

      setFormOpen(false);
      loadRoles();
    } catch (err) {
      alert(err.response?.data?.message || "Save failed");
    }
  }

  async function deleteRole() {
    try {
      await api.delete(`/roles/${confirmTarget.id}`);
      setConfirmOpen(false);
      loadRoles();
    } catch {
      alert("Delete failed");
    }
  }

  const filtered = roles.filter((r) =>
    r.name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <Title className="text-xl font-bold">Roles & Permissions</Title>

      <Card className="p-4">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <div className="text-gray-700">Manage system roles</div>

          <button
            onClick={openAddRole}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5 text-white" />
            <span>Add Role</span>
          </button>
        </div>

        {/* SEARCH + PAGINATION */}
        <div className="flex justify-between items-center mb-4">
          <TextInput
            placeholder="Search roles…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />

          <div className="flex items-center gap-3">
            <Button
              size="xs"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </Button>

            <span className="text-sm text-gray-700">
              Page {page} of {totalPages}
            </span>

            <Button
              size="xs"
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>

        {/* TABLE */}
        <table className="w-full text-sm border rounded overflow-hidden">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Role Name</th>
              <th className="p-2 text-left">Description</th>
              <th className="p-2 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginated.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="p-2">{r.id}</td>
                <td className="p-2 capitalize">{r.name}</td>
                <td className="p-2">{r.description || "-"}</td>

                <td className="p-2 text-center">
                  <div className="flex justify-center gap-4">

                    {/* EDIT */}
                    <button
                      className="text-blue-600"
                      onClick={() => {
                        setSelectedRole(r);
                        setFormOpen(true);
                      }}
                    >
                      Edit
                    </button>

                    {/* PERMISSIONS */}
                    <button
  className="text-gray-700 flex items-center gap-1"
  onClick={() => {
    setPermRole(r);
    setPermOpen(true);
  }}
>
  <Cog6ToothIcon className="h-4 w-4 inline-block" />
  <span>Permissions</span>
</button>

                    {/* DELETE */}
                    <button
                      className="text-red-600"
                      onClick={() => {
                        setConfirmTarget(r);
                        setConfirmOpen(true);
                      }}
                    >
                      Delete
                    </button>

                  </div>
                </td>
              </tr>
            ))}

            {paginated.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-500">
                  No roles found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* ROLE EDIT / ADD MODAL */}
      <RoleForm
        open={formOpen}
        initial={selectedRole}
        onSave={saveRole}
        onClose={() => {
          setFormOpen(false);
          setSelectedRole(null);
        }}
      />

      {/* DELETE CONFIRM */}
      <Confirm
        open={confirmOpen}
        title="Delete Role?"
        body={`This will permanently delete "${confirmTarget?.name}".`}
        onConfirm={deleteRole}
        onClose={() => setConfirmOpen(false)}
      />

      {/* PERMISSIONS MODAL */}
      <PermissionsModal
        open={permOpen}
        role={permRole}
        onClose={() => setPermOpen(false)}
      />
    </div>
  );
}
