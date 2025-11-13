import React, { useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

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

export default function Sidebar() {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    // ✅ Sidebar is fixed-height and does NOT scroll unless nav becomes too long
    <aside className="w-64 bg-psr-primary text-white flex flex-col h-screen overflow-hidden">

      {/* Header */}
      <div className="px-6 py-6 border-b border-white/10 shrink-0">
        <div className="text-xl font-bold">PSR Automation Inc</div>
        <div className="text-xs text-psr-muted mt-1">
          Inventory Management System
        </div>
      </div>

      {/* Nav Items (scrolls only if necessary) */}
      <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
        <NavItem to="/" active={location.pathname === "/"}>Dashboard</NavItem>
        <NavItem to="/products" active={location.pathname.startsWith("/products")}>Products</NavItem>
        <NavItem to="/parts" active={location.pathname.startsWith("/parts")}>Inventory / Parts</NavItem>
        <NavItem to="/vendors" active={location.pathname.startsWith("/vendors")}>Vendors</NavItem>
        <NavItem to="/purchase-orders" active={location.pathname.startsWith("/purchase-orders")}>Purchase Orders</NavItem>
        <NavItem to="/reports" active={location.pathname.startsWith("/reports")}>Reports</NavItem>
        <NavItem to="/settings" active={location.pathname.startsWith("/settings")}>Settings</NavItem>
        <NavItem onClick={handleLogout}>Logout</NavItem>
      </nav>

      {/* Footer (fixed at bottom) */}
      <div className="mt-auto p-4 border-t border-white/10 shrink-0">
        <div className="text-sm">Admin</div>
        <div className="text-xs text-psr-muted">admin@psr.com</div>
      </div>

    </aside>
  );
}
