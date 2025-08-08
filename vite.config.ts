import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      "/api/admin/create-user": {
        target: "http://localhost:9999",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/admin\/create-user$/, "/.netlify/functions/admin-create-user")
      },
      // Direct proxy for admin-create-user
      '/api/admin/create-user': {
        target: 'http://localhost:9999',
        changeOrigin: true,
        rewrite: () => '/.netlify/functions/admin-create-user'
      },
      // Optional: catch-all for any /api/* function
      '/api/': {
        target: 'http://localhost:9999',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\//, '/.netlify/functions/')
      }
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
