/* C:\Users\stanl\Documents\psr-inventory-management\frontend\src\routes\AppRoutes */

import React, { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import VendorPartsLatestReport from "../pages/reports/VendorPartsLatestReport";

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

  const PrivateLayout = ({ children }) => {
    const { user, logout } = useContext(AuthContext);

    return (
<div className="flex h-screen overflow-hidden bg-psr-primary">
        <Sidebar />

<main className="flex-1 flex flex-col min-w-0">
<header
  className="
    w-full
    bg-psr-primary
    border-b border-white/10
    px-6
    py-3.5
    flex
    items-center
    justify-between
    shadow-sm
  "
>
  {/* LEFT: Logo + Title */}
  <div className="flex items-center gap-3">
    
    {/* Logo (same style as login) */}
    <div className="h-9 w-16 flex items-center justify-center overflow-hidden rounded-md">
      <img
        src="/images/psr-logo.png"
        alt="PSR Logo"
        className="h-full w-full object-cover rounded-md shadow-[0_0_10px_rgba(59,130,246,0.4)]"
      />
    </div>

    {/* Title */}
    <h1 className="text-lg md:text-xl font-semibold text-white tracking-wide m-0">
      Inventory &amp; Purchase Order Management Portal
    </h1>
  </div>

  {/* RIGHT: User + Logout */}
  <div className="flex items-center gap-4">
    <span className="text-sm text-white/90 font-medium whitespace-nowrap">
      {user?.username} ({user?.role})
    </span>

    <button
      onClick={logout}
      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded transition"
    >
      Logout
    </button>
  </div>
</header>

<div className="flex-1 pt-2 px-6 pb-6 overflow-y-auto bg-psr-sky">
  {children}
</div>
        </main>
      </div>
    );
  };

  const Protected = (element) =>
    user ? element : <Navigate to="/login" replace />;

  return (
    <Routes>
      <Route
        path="/login"
        element={!user ? <Login /> : <Navigate to="/" replace />}
      />

      <Route
        path="/"
        element={Protected(
          <PrivateLayout>
            <DashboardPage />
          </PrivateLayout>
        )}
      />

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

      <Route
        path="/parts"
        element={Protected(
          <PrivateLayout>
            <PartsPage />
          </PrivateLayout>
        )}
      />

      <Route
        path="/sales-orders"
        element={Protected(
          <PrivateLayout>
            <SalesOrderPage />
          </PrivateLayout>
        )}
      />

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

  <Route
  path="/reports"
  element={Protected(
    <AdminRoute permission="view_reports" message="Reports access required.">
      <PrivateLayout>
        <ReportsIndex />
      </PrivateLayout>
    </AdminRoute>
  )}
/>
      <Route
  path="/reports/low-stock"
  element={Protected(
    <AdminRoute permission="view_reports" message="Reports access required.">
      <PrivateLayout>
        <LowStockReport />
      </PrivateLayout>
    </AdminRoute>
  )}
/>
     <Route
  path="/reports/purchase-orders"
  element={Protected(
    <AdminRoute permission="view_reports" message="Reports access required.">
      <PrivateLayout>
        <PurchaseOrderReport />
      </PrivateLayout>
    </AdminRoute>
  )}
/>

<Route
  path="/reports/vendor-parts-latest"
  element={<VendorPartsLatestReport />}
/>
     <Route
  path="/reports/vendor-summary"
  element={Protected(
    <AdminRoute permission="view_reports" message="Reports access required.">
      <PrivateLayout>
        <VendorPurchaseSummary />
      </PrivateLayout>
    </AdminRoute>
  )}
/>
     <Route
  path="/reports/part-summary"
  element={Protected(
    <AdminRoute permission="view_reports" message="Reports access required.">
      <PrivateLayout>
        <PartPurchaseSummary />
      </PrivateLayout>
    </AdminRoute>
  )}
/>
   <Route
  path="/reports/stock-movement"
  element={Protected(
    <AdminRoute permission="view_reports" message="Reports access required.">
      <PrivateLayout>
        <StockMovementReport />
      </PrivateLayout>
    </AdminRoute>
  )}
/>

      <Route
  path="/settings"
  element={Protected(
    <AdminRoute permission="manage_settings" message="Settings access required.">
      <PrivateLayout>
        <SettingsIndex />
      </PrivateLayout>
    </AdminRoute>
  )}
/>
      <Route
  path="/settings/users"
  element={Protected(
    <AdminRoute permission="manage_settings" message="Settings access required.">
      <PrivateLayout>
        <UserManagement />
      </PrivateLayout>
    </AdminRoute>
  )}
/>
     <Route
  path="/settings/roles"
  element={Protected(
    <AdminRoute permission="manage_settings" message="Settings access required.">
      <PrivateLayout>
        <RolesManagement />
      </PrivateLayout>
    </AdminRoute>
  )}
/>
      <Route
  path="/settings/system"
  element={Protected(
    <AdminRoute permission="manage_settings" message="Settings access required.">
      <PrivateLayout>
        <SystemPreferences />
      </PrivateLayout>
    </AdminRoute>
  )}
/>

      <Route
  path="/settings/monitoring"
  element={Protected(
    <AdminRoute permission="manage_settings" message="Settings access required.">
      <PrivateLayout>
        <MonitoringPage />
      </PrivateLayout>
    </AdminRoute>
  )}
/>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}