import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { hasPermission } from "../utils/permissions";

function PermissionRequiredModal({ open, onClose, message }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-lg shadow-lg w-[92%] max-w-md p-5">
        <div className="text-lg font-bold text-gray-900">
          Access denied
        </div>
        <div className="mt-2 text-sm text-gray-700">
          {message || "You do not have permission to view this page."}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-psr-primary text-white hover:opacity-90"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminRoute({
  children,
  permission,
  message = "You do not have permission to view this page.",
}) {
  const allowed = permission ? hasPermission(permission) : false;

  const [show, setShow] = useState(false);
  const [redirect, setRedirect] = useState(false);

  useEffect(() => {
    if (!allowed) setShow(true);
  }, [allowed]);

  if (allowed) return children;

  if (redirect) return <Navigate to="/" replace />;

  return (
    <PermissionRequiredModal
      open={show}
      message={message}
      onClose={() => {
        setShow(false);
        setRedirect(true);
      }}
    />
  );
}