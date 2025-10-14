// src/components/Sidebar.jsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Sidebar() {
  const { logout } = useAuth(); // Make sure your AuthContext provides logout
  const navigate = useNavigate();

  const menuItems = [
    { name: "Dashboard", path: "/" },
    { name: "Products", path: "/products" },
    { name: "Inventory", path: "/inventory" },
    { name: "Sales Orders", path: "/orders" },
    { name: "Purchase Orders", path: "/purchase-orders" },
    { name: "Reports", path: "/reports" },
    { name: "Settings", path: "/settings" },
  ];

  const handleLogout = () => {
    logout(); // Clear user session
    navigate("/login");
  };

  return (
    <aside className="w-64 bg-[#1E2A38] text-white flex flex-col min-h-screen">
      {/* Logo / Brand */}
      <div className="text-2xl font-bold p-4 border-b border-gray-700">
        PSR Inventory
      </div>

      {/* Menu items */}
      <nav className="flex-1 p-2 flex flex-col gap-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `block px-4 py-3 rounded-md transition duration-200 ${
                isActive
                  ? "bg-[#F9A825] text-black font-semibold"
                  : "hover:bg-[#324158]"
              }`
            }
          >
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* Contact + Logout */}
      <div className="p-4 border-t border-gray-700 flex flex-col gap-2">
        <div className="text-sm text-gray-300">Contact: admin@psr.com</div>
        <button
          onClick={handleLogout}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-md transition duration-200"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
