import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The React dev server proxies API + websocket traffic to the backend
// (src/server.js, default http://localhost:3000) so the browser sees a single
// origin — no CORS, no hard-coded backend URL in the app.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3000', changeOrigin: true, ws: true },
    },
  },
});
