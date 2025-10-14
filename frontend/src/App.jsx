import React from "react";
import Sidebar from "./components/Sidebar";
import AppRoutes from "./routes/AppRoutes";

export default function App() {
  return (
    <div className="flex h-screen bg-psr-sky">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <AppRoutes />
      </main>
    </div>
  );
}
