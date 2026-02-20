import React, { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import DashboardPage from "../pages/DashboardPage";
import ProductsPage from "../pages/ProductsPage";
import PartsPage from "../pages/PartsPage";
import SalesOrderPage from "../pages/SalesOrderPage";
import Login from "../pages/Login";
import MonitoringPage from "../pages/MonitoringPage";

import { AuthContext } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import AdminRoute from "../components/AdminRoute";

/* Settings Pages */
import SettingsIndex from "../pages/settings/SettingsIndex";
import UserManagement from "../pages/settings/UserManagement";
import RolesManagement from "../pages/settings/RolesManagement";
import SystemPreferences from "../pages/settings/SystemPreferences";

/* Reports */
import ReportsIndex from "../pages/reports/ReportsIndex";
import LowStockReport from "../pages/reports/LowStockReport";
import PurchaseOrderReport from "../pages/reports/PurchaseOrderReport";
import StockMovementReport from "../pages/reports/StockMovementReport";
import VendorPurchaseSummary from "../pages/reports/VendorPurchaseSummary";
import PartPurchaseSummary from "../pages/reports/PartPurchaseSummary";

/* Purchase Orders */
import PurchaseOrderList from "../pages/purchaseOrders/PurchaseOrderList";
import PurchaseOrderForm from "../pages/purchaseOrders/PurchaseOrderForm";
import PurchaseOrderDetails from "../pages/purchaseOrders/PurchaseOrderDetails";
import PurchaseOrderEdit from "../pages/purchaseOrders/PurchaseOrderEdit";
import PurchaseOrderBulkUpload from "../pages/purchaseOrders/PurchaseOrderBulkUpload";
import SendRfqPage from "../pages/purchaseOrders/SendRfqPage";
import PoImportFromPdfPage from "../pages/purchaseOrders/PoImportFromPdfPage";
import PoImportFromExcelPage from "../pages/purchaseOrders/PoImportFromExcelPage";

/* Vendors */
import VendorsPage from "../pages/vendors/VendorsPage";
import VendorForm from "../pages/vendors/VendorForm";
import VendorDetails from "../pages/vendors/VendorDetails";
import VendorBulkUpload from "../pages/vendors/VendorBulkUpload";
import VendorEdit from "../pages/vendors/VendorEdit";

/* Products */
import ProductDetail from "../pages/ProductDetail";

export default function AppRoutes() {
  const { user } = useContext(AuthContext);

  // PrivateLayout inside AppRoutes.jsx
  const PrivateLayout = ({ children }) => {
    const { user, logout } = useContext(AuthContext);

    return (
      <div className="flex h-screen bg-psr-sky overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* MAIN AREA */}
        <main className="flex-1 flex flex-col">
          <header
            className="
              w-full
              bg-blue-50
              border-b border-white/10
              px-6
              py-3.5
              flex
              justify-between
              items-center
              shadow-sm
            "
          >
            {/* Center Title */}
            <div className="flex-1 text-center">
              <h1
                className="text-xl font-bold text-gray-700 tracking-wide"
                style={{ fontFamily: "Times New Roman, serif" }}
              >
                Inventory & Purchase Order Management Portal
              </h1>
            </div>

            {/* User + Logout */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700 font-medium">
                {user?.username} ({user?.role})
              </span>

              <button
                onClick={logout}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded shadow"
              >
                Logout
              </button>
            </div>
          </header>

          {/* PAGE CONTENT */}
          <div className="flex-1 pt-2 px-6 pb-6 overflow-y-auto">{children}</div>
        </main>
      </div>
    );
  };

  const Protected = (element) =>
    user ? element : <Navigate to="/login" replace />;

  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={!user ? <Login /> : <Navigate to="/" replace />}
      />

      {/* Dashboard */}
      <Route
        path="/"
        element={Protected(
          <PrivateLayout>
            <DashboardPage />
          </PrivateLayout>
        )}
      />

      {/* Products */}
      <Route
        path="/products"
        element={Protected(
          <PrivateLayout>
            <ProductsPage />
          </PrivateLayout>
        )}
      />
      <Route
        path="/products/:id"
        element={Protected(
          <PrivateLayout>
            <ProductDetail />
          </PrivateLayout>
        )}
      />

      {/* Parts */}
      <Route
        path="/parts"
        element={Protected(
          <PrivateLayout>
            <PartsPage />
          </PrivateLayout>
        )}
      />

      {/* Sales Orders */}
      <Route
        path="/sales-orders"
        element={Protected(
          <PrivateLayout>
            <SalesOrderPage />
          </PrivateLayout>
        )}
      />

      {/* Purchase Orders */}
      <Route
        path="/purchase-orders"
        element={Protected(
          <PrivateLayout>
            <PurchaseOrderList />
          </PrivateLayout>
        )}
      />

      <Route
        path="/purchase-orders/:id/send-rfq"
        element={Protected(
          <PrivateLayout>
            <SendRfqPage />
          </PrivateLayout>
        )}
      />

      <Route
        path="/purchase-orders/bulk-upload"
        element={Protected(
          <PrivateLayout>
            <PurchaseOrderBulkUpload />
          </PrivateLayout>
        )}
      />

      {/* ✅ Import routes MUST be above /purchase-orders/:id */}
      <Route
        path="/purchase-orders/import-from-pdf"
        element={Protected(
          <PrivateLayout>
            <PoImportFromPdfPage />
          </PrivateLayout>
        )}
      />

      <Route
        path="/purchase-orders/import-from-excel"
        element={Protected(
          <PrivateLayout>
            <PoImportFromExcelPage />
          </PrivateLayout>
        )}
      />

      <Route
        path="/purchase-orders/new"
        element={Protected(
          <PrivateLayout>
            <PurchaseOrderForm />
          </PrivateLayout>
        )}
      />
      <Route
        path="/purchase-orders/edit/:id"
        element={Protected(
          <PrivateLayout>
            <PurchaseOrderEdit />
          </PrivateLayout>
        )}
      />
      <Route
        path="/purchase-orders/:id"
        element={Protected(
          <PrivateLayout>
            <PurchaseOrderDetails />
          </PrivateLayout>
        )}
      />

      {/* Vendors */}
      <Route
        path="/vendors"
        element={Protected(
          <PrivateLayout>
            <VendorsPage />
          </PrivateLayout>
        )}
      />
      <Route
        path="/vendors/new"
        element={Protected(
          <PrivateLayout>
            <VendorForm />
          </PrivateLayout>
        )}
      />
      <Route
        path="/vendors/bulk-upload"
        element={Protected(
          <PrivateLayout>
            <VendorBulkUpload />
          </PrivateLayout>
        )}
      />
      <Route
        path="/vendors/edit/:id"
        element={Protected(
          <PrivateLayout>
            <VendorEdit />
          </PrivateLayout>
        )}
      />
      <Route
        path="/vendors/:id"
        element={Protected(
          <PrivateLayout>
            <VendorDetails />
          </PrivateLayout>
        )}
      />

      {/* ==========================
          ✅ Reports (ADMIN ONLY)
         ========================== */}
      <Route
        path="/reports"
        element={Protected(
          <AdminRoute>
            <PrivateLayout>
              <ReportsIndex />
            </PrivateLayout>
          </AdminRoute>
        )}
      />
      <Route
        path="/reports/low-stock"
        element={Protected(
          <AdminRoute>
            <PrivateLayout>
              <LowStockReport />
            </PrivateLayout>
          </AdminRoute>
        )}
      />
      <Route
        path="/reports/purchase-orders"
        element={Protected(
          <AdminRoute>
            <PrivateLayout>
              <PurchaseOrderReport />
            </PrivateLayout>
          </AdminRoute>
        )}
      />
      <Route
        path="/reports/vendor-summary"
        element={Protected(
          <AdminRoute>
            <PrivateLayout>
              <VendorPurchaseSummary />
            </PrivateLayout>
          </AdminRoute>
        )}
      />
      <Route
        path="/reports/part-summary"
        element={Protected(
          <AdminRoute>
            <PrivateLayout>
              <PartPurchaseSummary />
            </PrivateLayout>
          </AdminRoute>
        )}
      />
      <Route
        path="/reports/stock-movement"
        element={Protected(
          <AdminRoute>
            <PrivateLayout>
              <StockMovementReport />
            </PrivateLayout>
          </AdminRoute>
        )}
      />

      {/* ==========================
          ✅ Settings (ADMIN ONLY)
         ========================== */}
      <Route
        path="/settings"
        element={Protected(
          <AdminRoute>
            <PrivateLayout>
              <SettingsIndex />
            </PrivateLayout>
          </AdminRoute>
        )}
      />
      <Route
        path="/settings/users"
        element={Protected(
          <AdminRoute>
            <PrivateLayout>
              <UserManagement />
            </PrivateLayout>
          </AdminRoute>
        )}
      />
      <Route
        path="/settings/roles"
        element={Protected(
          <AdminRoute>
            <PrivateLayout>
              <RolesManagement />
            </PrivateLayout>
          </AdminRoute>
        )}
      />
      <Route
        path="/settings/system"
        element={Protected(
          <AdminRoute>
            <PrivateLayout>
              <SystemPreferences />
            </PrivateLayout>
          </AdminRoute>
        )}
      />

      {/* Monitoring under settings => also admin only */}
      <Route
        path="/settings/monitoring"
        element={Protected(
          <AdminRoute>
            <PrivateLayout>
              <MonitoringPage />
            </PrivateLayout>
          </AdminRoute>
        )}
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
