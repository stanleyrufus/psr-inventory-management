import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,       // listen on all network interfaces
    port: 5173,
    strictPort: true, // optional: fail if port is already in use
    allowedHosts: [
      'sueann-unextricable-yuette.ngrok-free.dev'
    ]
  }
})
