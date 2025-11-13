import { useEffect, useMemo, useState } from "react";
import { Card, Title, Text, Button, TextInput } from "@tremor/react";
import { apiRaw as api } from "../../utils/api";
import {
  PencilIcon,
  TrashIcon,
  Cog6ToothIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import RoleForm from "./RoleForm";

/* Simple Confirm Modal (same pattern as UserManagement) */
function Confirm({ open, title, body, onConfirm, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-[1000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6">
        <div className="flex justify-between mb-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="text-gray-500 text-xl" onClick={onClose}>✕</button>
        </div>
        <p className="text-gray-700 text-sm">{body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button color="red" onClick={onConfirm}>Delete</Button>
        </div>
      </div>
    </div>
  );
}

export default function RolesManagement() {
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState("");

  // pagination (manual)
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // modals
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  // delete confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  useEffect(() => {
    loadRoles();
  }, []);

  async function loadRoles() {
    try {
      const res = await api.get("/roles"); // expects [{id, name, description}]
      const data = res.data?.data || res.data || [];
      setRoles(Array.isArray(data) ? data : []);
      setPage(1);
    } catch (err) {
      console.error("Failed loading roles:", err);
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return roles;
    const q = search.toLowerCase();
    return roles.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
    );
  }, [roles, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // actions
  const openAddRole = () => {
    setSelectedRole(null);
    setShowRoleModal(true);
  };

  const openEditRole = (role) => {
    setSelectedRole(role);
    setShowRoleModal(true);
  };

  const openDelete = (role) => {
    setToDelete(role);
    setConfirmOpen(true);
  };

  async function doDelete() {
    try {
      await api.delete(`/roles/${toDelete.id}`);
      setConfirmOpen(false);
      setToDelete(null);
      await loadRoles();
    } catch (e) {
      alert(e?.response?.data?.message || "Delete failed");
    }
  }

  const onRoleSaved = async () => {
    setShowRoleModal(false);
    await loadRoles();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 w-full">
        <div>
          <Title className="text-2xl font-bold">Roles & Permissions</Title>
          <Text className="text-gray-600">Manage system roles and permissions</Text>
        </div>

        {/* ✅ Add Role button — always visible and clickable */}
        <Button icon={PlusIcon} color="blue" onClick={openAddRole}>
          Add Role
        </Button>
      </div>

      {/* Search + Pagination row */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2">
            <TextInput
              placeholder="Search roles…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-64"
            />
            {/* Show count ONLY when searching */}
            {search.trim() && (
              <span className="text-sm text-gray-500">
                {filtered.length} result{filtered.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {/* Manual pagination (Quartz style) */}
          <div className="flex items-center gap-3">
            <Button
              size="xs"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
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
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Roles table */}
      <Card className="p-0 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-700 font-semibold">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Role</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-left w-56">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">{r.id}</td>
                <td className="px-3 py-2 capitalize">{r.name}</td>
                <td className="px-3 py-2">{r.description || "-"}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-3">
                    <button
                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                      onClick={() => openEditRole(r)}
                    >
                      <PencilIcon className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      className="text-gray-700 hover:underline inline-flex items-center gap-1"
                      onClick={() => alert("TODO: open permissions modal")}
                    >
                      <Cog6ToothIcon className="h-4 w-4" />
                      Permissions
                    </button>
                    <button
                      className="text-red-600 hover:underline inline-flex items-center gap-1"
                      onClick={() => openDelete(r)}
                    >
                      <TrashIcon className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {paginated.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                  No roles found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Add/Edit Role Modal (custom fixed overlay to avoid overlap issues) */}
      <RoleForm
        open={showRoleModal}
        initial={selectedRole}
        onClose={() => setShowRoleModal(false)}
        onSaved={onRoleSaved}
      />

      {/* Delete confirm */}
      <Confirm
        open={confirmOpen}
        title="Delete Role?"
        body={`This will permanently delete the role "${toDelete?.name}".`}
        onConfirm={doDelete}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
