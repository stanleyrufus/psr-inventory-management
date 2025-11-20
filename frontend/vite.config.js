import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  // ✅ REQUIRED for production hosting (Nginx)
  base: "/",

  // ✅ Ensure correct build folder
  build: {
    outDir: "dist",
  },

  // Dev server (local only)
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: [
      "sueann-unextricable-yuette.ngrok-free.dev"
    ]
  },
});
