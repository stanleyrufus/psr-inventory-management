import React, { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import DashboardPage from "../pages/DashboardPage";
import ProductsPage from "../pages/ProductsPage";
import PartsPage from "../pages/PartsPage";
import SalesOrderPage from "../pages/SalesOrderPage";
import ReportsPage from "../pages/Reports";
import SettingsPage from "../pages/Settings";
import Login from "../pages/Login";
import { AuthContext } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";

// ✅ Purchase Orders
import PurchaseOrderList from "../pages/purchaseOrders/PurchaseOrderList";
import PurchaseOrderForm from "../pages/purchaseOrders/PurchaseOrderForm";
import PurchaseOrderDetails from "../pages/purchaseOrders/PurchaseOrderDetails";
import PurchaseOrderEdit from "../pages/purchaseOrders/PurchaseOrderEdit"; // ✅ new

export default function AppRoutes() {
  const { user } = useContext(AuthContext);

  const PrivateLayout = ({ children }) => (
    <div className="flex h-screen bg-psr-sky">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );

  return (
    <Routes>
      {/* ---------- Public ---------- */}
      <Route
        path="/login"
        element={!user ? <Login /> : <Navigate to="/" replace />}
      />

      {/* ---------- Private ---------- */}
      <Route
        path="/"
        element={
          user ? (
            <PrivateLayout>
              <DashboardPage />
            </PrivateLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/products"
        element={
          user ? (
            <PrivateLayout>
              <ProductsPage />
            </PrivateLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/parts"
        element={
          user ? (
            <PrivateLayout>
              <PartsPage />
            </PrivateLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/sales-orders"
        element={
          user ? (
            <PrivateLayout>
              <SalesOrderPage />
            </PrivateLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* ---------- ✅ Purchase Orders ---------- */}
      <Route
        path="/purchase-orders"
        element={
          user ? (
            <PrivateLayout>
              <PurchaseOrderList />
            </PrivateLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/purchase-orders/new"
        element={
          user ? (
            <PrivateLayout>
              <PurchaseOrderForm />
            </PrivateLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      {/* ⚙️ Important: place EDIT before ID to prevent collision */}
      <Route
        path="/purchase-orders/edit/:id"
        element={
          user ? (
            <PrivateLayout>
              <PurchaseOrderEdit />
            </PrivateLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/purchase-orders/:id"
        element={
          user ? (
            <PrivateLayout>
              <PurchaseOrderDetails />
            </PrivateLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/reports"
        element={
          user ? (
            <PrivateLayout>
              <ReportsPage />
            </PrivateLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/settings"
        element={
          user ? (
            <PrivateLayout>
              <SettingsPage />
            </PrivateLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
