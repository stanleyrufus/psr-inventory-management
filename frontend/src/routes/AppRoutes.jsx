import React from "react";
import { Routes, Route } from "react-router-dom";
import DashboardPage from "../pages/DashboardPage";
import ProductsPage from "../pages/ProductsPage";
import PartsPage from "../pages/PartsPage";
import SalesOrderPage from "../pages/SalesOrderPage";
import PurchaseOrderPage from "../pages/PurchaseOrderPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/parts" element={<PartsPage />} />
      <Route path="/sales-orders" element={<SalesOrderPage />} />
      <Route path="/purchase-orders" element={<PurchaseOrderPage />} />
    </Routes>
  );
}
