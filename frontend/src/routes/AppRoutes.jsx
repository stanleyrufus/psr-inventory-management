import React, { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import DashboardPage from "../pages/DashboardPage";
import ProductsPage from "../pages/ProductsPage";
import PartsPage from "../pages/PartsPage";
import SalesOrderPage from "../pages/SalesOrderPage";
import ReportsPage from "../pages/Reports";
import Login from "../pages/Login";

import { AuthContext } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";

/* Settings Pages */
import SettingsIndex from "../pages/settings/SettingsIndex";
import UserManagement from "../pages/settings/UserManagement";
import RolesManagement from "../pages/settings/RolesManagement";
import SystemSettings from "../pages/settings/SystemSettings";

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

  const PrivateLayout = ({ children }) => (
    <div className="flex h-screen bg-psr-sky overflow-hidden">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto">{children}</main>
    </div>
  );

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

      {/* ✅ FIXED — WRAPPED SendRfqPage IN Protected + PrivateLayout */}
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

      {/* Reports */}
      <Route
        path="/reports"
        element={Protected(
          <PrivateLayout>
            <ReportsIndex />
          </PrivateLayout>
        )}
      />
      <Route
        path="/reports/low-stock"
        element={Protected(
          <PrivateLayout>
            <LowStockReport />
          </PrivateLayout>
        )}
      />
      <Route
        path="/reports/purchase-orders"
        element={Protected(
          <PrivateLayout>
            <PurchaseOrderReport />
          </PrivateLayout>
        )}
      />
      <Route
        path="/reports/vendor-summary"
        element={Protected(
          <PrivateLayout>
            <VendorPurchaseSummary />
          </PrivateLayout>
        )}
      />
      <Route
        path="/reports/part-summary"
        element={Protected(
          <PrivateLayout>
            <PartPurchaseSummary />
          </PrivateLayout>
        )}
      />
      <Route
        path="/reports/stock-movement"
        element={Protected(
          <PrivateLayout>
            <StockMovementReport />
          </PrivateLayout>
        )}
      />

      {/* Settings */}
      <Route
        path="/settings"
        element={Protected(
          <PrivateLayout>
            <SettingsIndex />
          </PrivateLayout>
        )}
      />

      <Route
        path="/settings/users"
        element={Protected(
          <PrivateLayout>
            <UserManagement />
          </PrivateLayout>
        )}
      />

      <Route
        path="/settings/roles"
        element={Protected(
          <PrivateLayout>
            <RolesManagement />
          </PrivateLayout>
        )}
      />

      <Route
        path="/settings/system"
        element={Protected(
          <PrivateLayout>
            <SystemSettings />
          </PrivateLayout>
        )}
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
