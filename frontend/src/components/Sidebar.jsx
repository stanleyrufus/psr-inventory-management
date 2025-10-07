import React from "react";

const NavItem = ({ children }) => (
  <div className="py-3 px-4 rounded-lg hover:bg-white/10 cursor-pointer text-white">
    {children}
  </div>
);

export default function Sidebar() {
  return (
    <aside className="w-64 bg-psr-primary text-white flex flex-col">
      <div className="px-6 py-6 border-b border-white/10">
        <div className="text-xl font-bold">PSR Inventory</div>
        <div className="text-xs text-psr-muted mt-1">Automation Systems</div>
      </div>

      <nav className="p-4 space-y-1 flex-1">
        <NavItem>Dashboard</NavItem>
        <NavItem>Products</NavItem>
        <NavItem>Inventory</NavItem>
        <NavItem>Sales Orders</NavItem>
        <NavItem>Purchase Orders</NavItem>
        <NavItem>Reports</NavItem>
        <NavItem>Settings</NavItem>
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="text-sm">Admin</div>
        <div className="text-xs text-psr-muted">admin@psr.com</div>
      </div>
    </aside>
  );
}
