// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProductList from "./pages/products/ProductList";
import ProductForm from "./pages/products/ProductForm";
import InventoryPage from "./pages/inventory/InventoryPage";
import InventoryUploadPage from "./pages/inventory/InventoryUploadPage";
import InventoryManualPage from "./pages/inventory/InventoryManualPage";
import OrdersPage from "./pages/orders/OrdersPage";
import PrivateRoute from "./components/PrivateRoute";
import Sidebar from "./components/Sidebar";
import { AuthProvider } from "./contexts/AuthContext";

function Layout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar /> {/* Sidebar now has Dashboard, Products, Inventory, Orders, Logout */}
      <main className="main-panel flex-1 p-6 bg-sky-50">{children}</main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/products"
            element={
              <PrivateRoute>
                <Layout>
                  <ProductList />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/products/new"
            element={
              <PrivateRoute>
                <Layout>
                  <ProductForm />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <PrivateRoute>
                <Layout>
                  <InventoryPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/inventory/upload"
            element={
              <PrivateRoute>
                <Layout>
                  <InventoryUploadPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/inventory/manual"
            element={
              <PrivateRoute>
                <Layout>
                  <InventoryManualPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <PrivateRoute>
                <Layout>
                  <OrdersPage />
                </Layout>
              </PrivateRoute>
            }
          />

          {/* Redirect old /inventory-upload */}
          <Route path="/inventory-upload" element={<Navigate to="/inventory/upload" replace />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
