import React, { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const NavItem = ({ to, children, onClick }) => (
  <Link
    to={to || "#"}
    onClick={onClick}
    className="block py-3 px-4 rounded-lg hover:bg-white/10 text-white"
  >
    {children}
  </Link>
);

export default function Sidebar() {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="w-64 bg-psr-primary text-white flex flex-col">
      {/* Header */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="text-xl font-bold">PSR Automation Inc</div>
        <div className="text-xs text-psr-muted mt-1">Inventory Management System</div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1 flex-1">
        <NavItem to="/">Dashboard</NavItem>
        <NavItem to="/products">Products</NavItem>
        <NavItem to="/parts">Inventory / Parts</NavItem>
        <NavItem to="/sales-orders">Sales Orders</NavItem>
        <NavItem to="/purchase-orders">Purchase Orders</NavItem>
        <NavItem to="/reports">Reports</NavItem>
        <NavItem to="/settings">Settings</NavItem>
        <NavItem onClick={handleLogout}>Logout</NavItem>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="text-sm">Admin</div>
        <div className="text-xs text-psr-muted">admin@psr.com</div>
      </div>
    </aside>
  );
}
