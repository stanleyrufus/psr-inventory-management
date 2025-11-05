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

// ✅ Reports
import ReportsIndex from "../pages/reports/ReportsIndex";
import LowStockReport from "../pages/reports/LowStockReport";
import PurchaseOrderReport from "../pages/reports/PurchaseOrderReport";
import StockMovementReport from "../pages/reports/StockMovementReport";


// ✅ Purchase Orders
import PurchaseOrderList from "../pages/purchaseOrders/PurchaseOrderList";
import PurchaseOrderForm from "../pages/purchaseOrders/PurchaseOrderForm";
import PurchaseOrderDetails from "../pages/purchaseOrders/PurchaseOrderDetails";
import PurchaseOrderEdit from "../pages/purchaseOrders/PurchaseOrderEdit";
import PurchaseOrderBulkUpload from "../pages/purchaseOrders/PurchaseOrderBulkUpload";

// ✅ Vendors
import VendorsPage from "../pages/vendors/VendorsPage";
import VendorForm from "../pages/vendors/VendorForm";
import VendorDetails from "../pages/vendors/VendorDetails";
import VendorBulkUpload from "../pages/vendors/VendorBulkUpload";
import VendorEdit from "../pages/vendors/VendorEdit";

// ✅ Products
import ProductDetail from "../pages/ProductDetail";

export default function AppRoutes() {
  const { user } = useContext(AuthContext);

  // ✅ Layout for authenticated pages
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

      {/* ---------- Dashboard ---------- */}
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

      {/* ---------- Products ---------- */}
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
        path="/products/:id"
        element={
          user ? (
            <PrivateLayout>
              <ProductDetail />
            </PrivateLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* ---------- Parts ---------- */}
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

      {/* ---------- Sales Orders ---------- */}
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

      {/* ---------- Purchase Orders ---------- */}
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
  path="/purchase-orders/bulk-upload"
  element={
    user ? (
      <PrivateLayout>
        <PurchaseOrderBulkUpload />
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

      {/* ---------- Vendors ---------- */}
      <Route
        path="/vendors"
        element={
          user ? (
            <PrivateLayout>
              <VendorsPage />
            </PrivateLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/vendors/new"
        element={
          user ? (
            <PrivateLayout>
              <VendorForm />
            </PrivateLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/vendors/bulk-upload"
        element={
          user ? (
            <PrivateLayout>
              <VendorBulkUpload />
            </PrivateLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/vendors/edit/:id"
        element={
          user ? (
            <PrivateLayout>
              <VendorEdit />
            </PrivateLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/vendors/:id"
        element={
          user ? (
            <PrivateLayout>
              <VendorDetails />
            </PrivateLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* ---------- Reports ---------- */}
      <Route
  path="/reports"
  element={
    user ? (
      <PrivateLayout>
        <ReportsIndex />
      </PrivateLayout>
    ) : (
      <Navigate to="/login" replace />
    )
  }
/>


{/* --------- Reports: Sub Routes --------- */}
<Route
  path="/reports/low-stock"
  element={
    user ? (
      <PrivateLayout>
        <LowStockReport />
      </PrivateLayout>
    ) : (
      <Navigate to="/login" replace />
    )
  }
/>

<Route
  path="/reports/purchase-orders"
  element={
    user ? (
      <PrivateLayout>
        <PurchaseOrderReport />
      </PrivateLayout>
    ) : (
      <Navigate to="/login" replace />
    )
  }
/>

<Route
  path="/reports/stock-movement"
  element={
    user ? (
      <PrivateLayout>
        <StockMovementReport />
      </PrivateLayout>
    ) : (
      <Navigate to="/login" replace />
    )
  }
/>


      {/* ---------- Settings ---------- */}
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

      {/* ---------- Fallback ---------- */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
