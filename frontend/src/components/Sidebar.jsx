// frontend/src/components/Sidebar.jsx
import React, { useContext, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";

const NavItem = ({ to, children, onClick, active }) => (
  <Link
    to={to || "#"}
    onClick={onClick}
    className={`block py-3 px-4 rounded-lg transition-colors ${
      active
        ? "bg-white text-psr-primary font-semibold"
        : "hover:bg-white/10 text-white"
    }`}
  >
    {children}
  </Link>
);

function AdminToast({ show, onClose, message }) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => onClose(), 2000);
    return () => clearTimeout(t);
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed top-5 right-5 z-50">
      <div className="bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg border border-gray-700">
        {message}
      </div>
    </div>
  );
}

export default function Sidebar() {
  const location = useLocation();
  const { user } = useContext(AuthContext);

    const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("Access denied");

  const guardPermissionClick = (permName, message) => (e) => {
    if (hasPermission(permName)) return;
    e.preventDefault();
    setToastMessage(message || "Access denied");
    setShowToast(true);
  };

  return (
    <aside className="w-64 bg-psr-primary text-white flex flex-col h-screen overflow-hidden">
      <AdminToast
        show={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
      />
      {/* ⭐ REDUCED HEADER HEIGHT */}
      <div className="px-5 py-4 border-b border-white/10 shrink-0">
        <div className="text-lg font-bold">PSR Automation Inc.</div>
      </div>

      {/* NAV */}
      <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
        <NavItem to="/" active={location.pathname === "/"}>
          Dashboard
        </NavItem>

        <NavItem to="/products" active={location.pathname.startsWith("/products")}>
          Products
        </NavItem>

        <NavItem to="/parts" active={location.pathname.startsWith("/parts")}>
          Inventory / Parts
        </NavItem>

        <NavItem to="/vendors" active={location.pathname.startsWith("/vendors")}>
          Vendors
        </NavItem>

        <NavItem
          to="/purchase-orders"
          active={location.pathname.startsWith("/purchase-orders")}
        >
          Purchase Orders
        </NavItem>

        <NavItem
          to="/sales-orders"
          active={location.pathname.startsWith("/sales-orders")}
        >
          Sales Orders
        </NavItem>

        {/* ✅ Admin-only: block click for non-admin */}
                <NavItem
          to={hasPermission("view_reports") ? "/reports" : "#"}
          onClick={
            hasPermission("view_reports")
              ? undefined
              : guardPermissionClick("view_reports", "Reports access required")
          }
          active={location.pathname.startsWith("/reports")}
        >
          Reports
        </NavItem>

        {/* ✅ Admin-only: block click for non-admin */}
                <NavItem
          to={hasPermission("manage_settings") ? "/settings" : "#"}
          onClick={
            hasPermission("manage_settings")
              ? undefined
              : guardPermissionClick("manage_settings", "Settings access required")
          }
          active={location.pathname.startsWith("/settings")}
        >
          Settings
        </NavItem>
      </nav>

      {/* ⭐ REDUCED FOOTER HEIGHT + CONTACT INFO */}
      <div className="mt-auto p-3 border-t border-white/10 text-[15px] leading-tight">
        <div className="font-semibold text-white">Contact</div>
        <div className="text-white/80">📞 952-233-1441</div>
        <div className="text-white/80">✉️ info@psrautomation.com</div>
      </div>
    </aside>
  );
}