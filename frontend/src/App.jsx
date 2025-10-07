import React from "react";
import Sidebar from "./components/Sidebar";
import DashboardPage from "./pages/DashboardPage";

export default function App() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 main-panel p-6">
        <DashboardPage />
      </div>
    </div>
  );
}
