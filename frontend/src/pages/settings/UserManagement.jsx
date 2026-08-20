// frontend/src/pages/settings/UserManagement.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, TextInput, Badge } from "@tremor/react";
import api from "../../utils/api";
import { PlusIcon } from "@heroicons/react/24/outline";


/* -------------------------------------------------------
   Confirm Modal
------------------------------------------------------- */
function Confirm({ open, title, body, onConfirm, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6">
        <div className="flex justify-between mb-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="text-gray-500 text-xl" onClick={onClose}>✕</button>
        </div>

        <p className="text-gray-700 text-sm">{body}</p>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirm}>Confirm</Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   Reset Password Modal
------------------------------------------------------- */
function ResetPasswordModal({ open, user, onSubmit, onClose }) {
  const [pwd, setPwd] = useState("");

  useEffect(() => setPwd(""), [open]);

  if (!open || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6">

        <div className="flex justify-between mb-3">
          <h3 className="text-lg font-semibold">Reset Password</h3>
          <button className="text-gray-500 text-xl" onClick={onClose}>✕</button>
        </div>

        <p className="text-gray-700 text-sm mb-3">
          Set a new password for <strong>{user.email}</strong>
        </p>

        <TextInput
          type="password"
          placeholder="New password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
        />

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSubmit(pwd)}>Update</Button>
        </div>

      </div>
    </div>
  );
}

/* -------------------------------------------------------
   Add/Edit User Form Modal
------------------------------------------------------- */
function UserForm({ open, initial, roles, onSave, onClose }) {
  const defaultRole = roles?.[0]?.name || "viewer";

  const [form, setForm] = useState({
    username: "",
    email: "",
    role: defaultRole,
    password: "",
  });

  useEffect(() => {
    if (initial && initial.id) {
      setForm({
        username: initial.username || "",
        email: initial.email || "",
        role: initial.role || defaultRole,
        password: "",
      });
    } else {
      setForm({
        username: "",
        email: "",
        role: defaultRole,
        password: "",
      });
    }
  }, [initial, roles]);

  if (!open) return null;

  const isEdit = Boolean(initial?.id);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-xl p-6">

        <div className="flex justify-between mb-3">
          <h3 className="text-lg font-semibold">{isEdit ? "Edit User" : "Add User"}</h3>
          <button className="text-gray-500 text-xl" onClick={onClose}>✕</button>
        </div>

        <div className="space-y-3">

          <label>
            <span className="text-sm text-gray-600">Username</span>
            <TextInput
              value={form.username}
              onChange={(e) => setForm(s => ({ ...s, username: e.target.value }))}
            />
          </label>

          <label>
            <span className="text-sm text-gray-600">Email</span>
            <TextInput
              type="email"
              value={form.email}
              onChange={(e) => setForm(s => ({ ...s, email: e.target.value }))}
            />
          </label>

          <label>
            <span className="text-sm text-gray-600">Role</span>
            <select
              className="border rounded px-2 py-2 w-full"
              value={form.role}
              onChange={(e) => setForm(s => ({ ...s, role: e.target.value }))}
            >
              {(roles || []).map(r => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
            </select>
          </label>

          {!isEdit && (
            <label>
              <span className="text-sm text-gray-600">Temporary Password</span>
              <TextInput
                type="password"
                value={form.password}
                onChange={(e) => setForm(s => ({ ...s, password: e.target.value }))}
              />
            </label>
          )}

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
   MAIN PAGE — User Management
------------------------------------------------------- */
export default function UserManagement() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);

  const [formOpen, setFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formKey, setFormKey] = useState(0);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [u, r] = await Promise.all([
        api.get("/users"),
        api.get("/roles"),
      ]);
      setUsers(u.data || []);
      setRoles(r.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load users or roles");
    }
  }

  const openAddUser = () => {
    setSelectedUser(null);
    setFormKey(k => k + 1);
    setFormOpen(true);
  };

  const openEditUser = (user) => {
    setSelectedUser(user);
    setFormKey(k => k + 1);
    setFormOpen(true);
  };

  async function saveUser(form) {
  try {
    let msg = "";

    if (selectedUser?.id) {
      // UPDATE
      await api.put(`/users/${selectedUser.id}`, {
        username: form.username,
        email: form.email,
        role: form.role,
      });
      msg = "User updated successfully!";
    } else {
      // CREATE
      await api.post("/users", {
        username: form.username,
        email: form.email,
        password: form.password,
        role: form.role,
      });
      msg = "User created successfully!";
    }

    alert(msg); // 🔥 SUCCESS POPUP

    setFormOpen(false);
    setSelectedUser(null);
    loadAll();

  } catch (e) {
    alert(e.response?.data?.message || "Save failed");
  }
}


  async function deleteUser() {
    try {
      await api.delete(`/users/${confirmTarget.id}`);
      setConfirmOpen(false);
      loadAll();
    } catch {
      alert("Delete failed");
    }
  }

  async function resetPassword(pwd) {
    try {
      await api.patch(`/users/${resetTarget.id}/reset-password`, { password: pwd });
      setResetOpen(false);
      alert("Password updated");
    } catch (e) {
      alert("Reset failed");
    }
  }

  const badgeColor = (role) =>
    role === "admin" ? "red" :
    role === "manager" ? "orange" : "blue";

  return (
    <div className="p-4 md:p-6 lg:p-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            User Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage application users
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <button
            onClick={openAddUser}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5 text-white" />
            <span>Add User</span>
          </button>

          <button
            onClick={() => navigate("/settings")}
            className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors whitespace-nowrap"
          >
            ← Back to Settings
          </button>
        </div>
      </div>

      {/* Content Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5">

        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr>
              <th className="h-9 px-3 py-0 text-left text-[13px] font-bold text-gray-900 bg-gray-50 align-middle leading-none whitespace-nowrap border-b border-gray-300 border-r border-gray-200 last:border-r-0">Username</th>
              <th className="h-9 px-3 py-0 text-left text-[13px] font-bold text-gray-900 bg-gray-50 align-middle leading-none whitespace-nowrap border-b border-gray-300 border-r border-gray-200 last:border-r-0">Email</th>
              <th className="h-9 px-3 py-0 text-left text-[13px] font-bold text-gray-900 bg-gray-50 align-middle leading-none whitespace-nowrap border-b border-gray-300 border-r border-gray-200 last:border-r-0">Role</th>
              <th className="h-9 px-3 py-0 text-center text-[13px] font-bold text-gray-900 bg-gray-50 align-middle leading-none whitespace-nowrap border-b border-gray-300 border-r border-gray-200 last:border-r-0">Actions</th>
            </tr>
          </thead>

          <tbody>
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="h-9 px-3 py-0 text-[13px] text-gray-800 align-middle leading-none border-b border-gray-200 border-r border-gray-100 last:border-r-0">{u.username}</td>
                <td className="h-9 px-3 py-0 text-[13px] text-gray-800 align-middle leading-none border-b border-gray-200 border-r border-gray-100 last:border-r-0">{u.email}</td>
                <td className="h-9 px-3 py-0 text-[13px] text-gray-800 align-middle leading-none border-b border-gray-200 border-r border-gray-100 last:border-r-0"><Badge color={badgeColor(u.role)}>{u.role}</Badge></td>

                <td className="h-9 px-3 py-0 text-[13px] text-gray-800 align-middle leading-none border-b border-gray-200 border-r border-gray-100 last:border-r-0 text-center">
                  <div className="flex gap-3 justify-center">

                    <button className="text-blue-600" onClick={() => openEditUser(u)}>
                      Edit
                    </button>

                    <button
                      className="text-orange-600"
                      onClick={() => { setResetTarget(u); setResetOpen(true); }}
                    >
                      Reset Password
                    </button>

                    <button
                      className="text-red-600"
                      onClick={() => { setConfirmTarget(u); setConfirmOpen(true); }}
                    >
                      Delete
                    </button>

                  </div>
                </td>
              </tr>
            ))}

            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            )}

          </tbody>
        </table>

      </div>

      {/* Modals */}
      <UserForm
        key={formKey}
        open={formOpen}
        initial={selectedUser}
        roles={roles}
        onSave={saveUser}
        onClose={() => setFormOpen(false)}
      />

      <ResetPasswordModal
        open={resetOpen}
        user={resetTarget}
        onSubmit={resetPassword}
        onClose={() => setResetOpen(false)}
      />

      <Confirm
        open={confirmOpen}
        title="Delete User?"
        body={`This will permanently delete ${confirmTarget?.email}`}
        onConfirm={deleteUser}
        onClose={() => setConfirmOpen(false)}
      />

    </div>
  );
}
