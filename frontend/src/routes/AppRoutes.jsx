import React, { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import DashboardPage from "../pages/DashboardPage";
import ProductsPage from "../pages/ProductsPage";
import PartsPage from "../pages/PartsPage";
import SalesOrderPage from "../pages/SalesOrderPage";
import PurchaseOrderPage from "../pages/PurchaseOrderPage";
import Login from "../pages/Login";
import { AuthContext } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";

export default function AppRoutes() {
  const { user } = useContext(AuthContext); // get user from AuthContext

  // Private layout for logged-in users
  const PrivateLayout = ({ children }) => (
    <div className="flex h-screen bg-psr-sky">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );

  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />

      {/* Private routes */}
      <Route
        path="/"
        element={user ? <PrivateLayout><DashboardPage /></PrivateLayout> : <Navigate to="/login" />}
      />
      <Route
        path="/products"
        element={user ? <PrivateLayout><ProductsPage /></PrivateLayout> : <Navigate to="/login" />}
      />
      <Route
        path="/parts"
        element={user ? <PrivateLayout><PartsPage /></PrivateLayout> : <Navigate to="/login" />}
      />
      <Route
        path="/sales-orders"
        element={user ? <PrivateLayout><SalesOrderPage /></PrivateLayout> : <Navigate to="/login" />}
      />
      <Route
        path="/purchase-orders"
        element={user ? <PrivateLayout><PurchaseOrderPage /></PrivateLayout> : <Navigate to="/login" />}
      />
    </Routes>
  );
}
