// ✅ React entry point for PSR Inventory & Purchase Order Management Portal
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // Handles client-side routing (URL navigation)
import App from "./App"; // Main app component that contains routes, layout, etc.
import "./index.css"; // Global CSS (Tailwind + custom styles)

// ✅ Create React root and render the entire app
ReactDOM.createRoot(document.getElementById("root")).render(
  // React.StrictMode is a development tool that helps detect potential issues
  // Note: It intentionally renders components twice in DEV (not in PROD)
  // This can cause fast "blinking" or "flicker" effects during debugging,
  // but it’s safe and does not affect production behavior.
  <React.StrictMode>
    {/* BrowserRouter enables navigation between pages without reloading the browser */}
    <BrowserRouter>
      {/* Main application that includes routes (login, dashboard, products, etc.) */}
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

/*
📘 NOTES:
- The `root` div is defined in /index.html and acts as the single mounting point for React.
- If you experience fast blinking or double-render in DEV mode, it’s due to StrictMode behavior.
  You can temporarily disable it by commenting out <React.StrictMode> for smoother UI testing:
  
  // ReactDOM.createRoot(document.getElementById("root")).render(
  //   <BrowserRouter>
  //     <App />
  //   </BrowserRouter>
  // );

- Leave StrictMode enabled for final builds — it improves code stability and helps catch warnings.
*/
