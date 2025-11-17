// frontend/src/components/Sidebar.jsx
import React, { useContext } from "react";
import { Link, useLocation } from "react-router-dom";

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
  const location = useLocation();

  return (
    <aside className="w-64 bg-psr-primary text-white flex flex-col h-screen overflow-hidden">

      {/* ⭐ REDUCED HEADER HEIGHT */}
      <div className="px-5 py-4 border-b border-white/10 shrink-1">
        <div className="text-lg font-bold">PSR Automation Inc.</div>
        
      </div>

      {/* NAV */}
      <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
        <NavItem to="/" active={location.pathname === "/"}>Dashboard</NavItem>
        <NavItem to="/products" active={location.pathname.startsWith("/products")}>Products</NavItem>
        <NavItem to="/parts" active={location.pathname.startsWith("/parts")}>Inventory / Parts</NavItem>
        <NavItem to="/vendors" active={location.pathname.startsWith("/vendors")}>Vendors</NavItem>
        <NavItem to="/purchase-orders" active={location.pathname.startsWith("/purchase-orders")}>
          Purchase Orders
        </NavItem>
        <NavItem to="/sales-orders" active={location.pathname.startsWith("/sales-orders")}>
          Sales Orders
        </NavItem>
        <NavItem to="/reports" active={location.pathname.startsWith("/reports")}>Reports</NavItem>
        <NavItem to="/settings" active={location.pathname.startsWith("/settings")}>Settings</NavItem>
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
