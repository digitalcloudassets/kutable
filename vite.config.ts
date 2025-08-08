import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      "/api/admin/create-user": {
        target: "http://localhost:9999",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/admin\/create-user$/, "/.netlify/functions/admin-create-user")
      }
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
