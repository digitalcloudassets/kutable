// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import { resolve } from "path";
var __vite_injected_original_dirname = "/home/project";
var vite_config_default = defineConfig({
  // Production optimizations
  build: {
    target: "es2020",
    sourcemap: false,
    // Disable source maps in production for security
    minify: "terser",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          stripe: ["@stripe/stripe-js", "@stripe/react-stripe-js"],
          supabase: ["@supabase/supabase-js"],
          charts: ["recharts"],
          date: ["date-fns"],
          forms: ["react-hook-form", "@hookform/resolvers", "yup"]
        },
        // Optimize chunk naming for better caching
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]"
      }
    },
    // Optimize CSS
    cssCodeSplit: true,
    // Asset handling
    assetsDir: "assets",
    // Chunk size warnings
    chunkSizeWarningLimit: 1e3
  },
  // Define aliases for cleaner imports
  resolve: {
    alias: {
      "@": resolve(__vite_injected_original_dirname, "./src"),
      "@components": resolve(__vite_injected_original_dirname, "./src/components"),
      "@pages": resolve(__vite_injected_original_dirname, "./src/pages"),
      "@utils": resolve(__vite_injected_original_dirname, "./src/utils"),
      "@lib": resolve(__vite_injected_original_dirname, "./src/lib"),
      "@hooks": resolve(__vite_injected_original_dirname, "./src/hooks")
    }
  },
  server: {
    // Development server configuration
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      // Direct proxy for admin-create-user
      "/api/admin/create-user": {
        target: "http://localhost:9999",
        changeOrigin: true,
        rewrite: () => "/.netlify/functions/admin-create-user"
      },
      // Optional: catch-all for any /api/* function
      "/api/": {
        target: "http://localhost:9999",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\//, "/.netlify/functions/")
      }
    }
  },
  // Production preview settings
  preview: {
    port: 4173,
    strictPort: true,
    host: true
  },
  optimizeDeps: {
    exclude: ["lucide-react"],
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "react-hot-toast",
      "react-router",
      "@supabase/supabase-js",
      "date-fns"
    ]
  },
  // Environment variable configuration
  define: {
    __BUILD_TIME__: JSON.stringify((/* @__PURE__ */ new Date()).toISOString()),
    __VERSION__: JSON.stringify(process.env.npm_package_version || "1.0.0")
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgLy8gUHJvZHVjdGlvbiBvcHRpbWl6YXRpb25zXG4gIGJ1aWxkOiB7XG4gICAgdGFyZ2V0OiAnZXMyMDIwJyxcbiAgICBzb3VyY2VtYXA6IGZhbHNlLCAvLyBEaXNhYmxlIHNvdXJjZSBtYXBzIGluIHByb2R1Y3Rpb24gZm9yIHNlY3VyaXR5XG4gICAgbWluaWZ5OiAndGVyc2VyJyxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgdmVuZG9yOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsICdyZWFjdC1yb3V0ZXItZG9tJ10sXG4gICAgICAgICAgc3RyaXBlOiBbJ0BzdHJpcGUvc3RyaXBlLWpzJywgJ0BzdHJpcGUvcmVhY3Qtc3RyaXBlLWpzJ10sXG4gICAgICAgICAgc3VwYWJhc2U6IFsnQHN1cGFiYXNlL3N1cGFiYXNlLWpzJ10sXG4gICAgICAgICAgY2hhcnRzOiBbJ3JlY2hhcnRzJ10sXG4gICAgICAgICAgZGF0ZTogWydkYXRlLWZucyddLFxuICAgICAgICAgIGZvcm1zOiBbJ3JlYWN0LWhvb2stZm9ybScsICdAaG9va2Zvcm0vcmVzb2x2ZXJzJywgJ3l1cCddXG4gICAgICAgIH0sXG4gICAgICAgIC8vIE9wdGltaXplIGNodW5rIG5hbWluZyBmb3IgYmV0dGVyIGNhY2hpbmdcbiAgICAgICAgY2h1bmtGaWxlTmFtZXM6ICdhc3NldHMvW25hbWVdLVtoYXNoXS5qcycsXG4gICAgICAgIGVudHJ5RmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uanMnLFxuICAgICAgICBhc3NldEZpbGVOYW1lczogJ2Fzc2V0cy9bbmFtZV0tW2hhc2hdLltleHRdJ1xuICAgICAgfVxuICAgIH0sXG4gICAgLy8gT3B0aW1pemUgQ1NTXG4gICAgY3NzQ29kZVNwbGl0OiB0cnVlLFxuICAgIC8vIEFzc2V0IGhhbmRsaW5nXG4gICAgYXNzZXRzRGlyOiAnYXNzZXRzJyxcbiAgICAvLyBDaHVuayBzaXplIHdhcm5pbmdzXG4gICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAxMDAwXG4gIH0sXG4gIFxuICAvLyBEZWZpbmUgYWxpYXNlcyBmb3IgY2xlYW5lciBpbXBvcnRzXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgJ0AnOiByZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJyksXG4gICAgICAnQGNvbXBvbmVudHMnOiByZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL2NvbXBvbmVudHMnKSxcbiAgICAgICdAcGFnZXMnOiByZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3BhZ2VzJyksXG4gICAgICAnQHV0aWxzJzogcmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy91dGlscycpLFxuICAgICAgJ0BsaWInOiByZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL2xpYicpLFxuICAgICAgJ0Bob29rcyc6IHJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvaG9va3MnKVxuICAgIH1cbiAgfSxcbiAgXG4gIHNlcnZlcjoge1xuICAgIC8vIERldmVsb3BtZW50IHNlcnZlciBjb25maWd1cmF0aW9uXG4gICAgaG9zdDogdHJ1ZSxcbiAgICBwb3J0OiA1MTczLFxuICAgIHN0cmljdFBvcnQ6IHRydWUsXG4gICAgcHJveHk6IHtcbiAgICAgIC8vIERpcmVjdCBwcm94eSBmb3IgYWRtaW4tY3JlYXRlLXVzZXJcbiAgICAgICcvYXBpL2FkbWluL2NyZWF0ZS11c2VyJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0Ojk5OTknLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHJld3JpdGU6ICgpID0+ICcvLm5ldGxpZnkvZnVuY3Rpb25zL2FkbWluLWNyZWF0ZS11c2VyJ1xuICAgICAgfSxcbiAgICAgIC8vIE9wdGlvbmFsOiBjYXRjaC1hbGwgZm9yIGFueSAvYXBpLyogZnVuY3Rpb25cbiAgICAgICcvYXBpLyc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDo5OTk5JyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpXFwvLywgJy8ubmV0bGlmeS9mdW5jdGlvbnMvJylcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFxuICAvLyBQcm9kdWN0aW9uIHByZXZpZXcgc2V0dGluZ3NcbiAgcHJldmlldzoge1xuICAgIHBvcnQ6IDQxNzMsXG4gICAgc3RyaWN0UG9ydDogdHJ1ZSxcbiAgICBob3N0OiB0cnVlXG4gIH0sXG4gIFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBleGNsdWRlOiBbJ2x1Y2lkZS1yZWFjdCddLFxuICAgIGluY2x1ZGU6IFtcbiAgICAgICdyZWFjdCcsXG4gICAgICAncmVhY3QtZG9tJyxcbiAgICAgICdyZWFjdC1yb3V0ZXItZG9tJyxcbiAgICAgICdyZWFjdC1ob3QtdG9hc3QnLFxuICAgICAgJ3JlYWN0LXJvdXRlcicsXG4gICAgICAnQHN1cGFiYXNlL3N1cGFiYXNlLWpzJyxcbiAgICAgICdkYXRlLWZucydcbiAgICBdXG4gIH0sXG4gIFxuICAvLyBFbnZpcm9ubWVudCB2YXJpYWJsZSBjb25maWd1cmF0aW9uXG4gIGRlZmluZToge1xuICAgIF9fQlVJTERfVElNRV9fOiBKU09OLnN0cmluZ2lmeShuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkpLFxuICAgIF9fVkVSU0lPTl9fOiBKU09OLnN0cmluZ2lmeShwcm9jZXNzLmVudi5ucG1fcGFja2FnZV92ZXJzaW9uIHx8ICcxLjAuMCcpXG4gIH1cbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF5TixTQUFTLG9CQUFvQjtBQUN0UCxTQUFTLGVBQWU7QUFEeEIsSUFBTSxtQ0FBbUM7QUFHekMsSUFBTyxzQkFBUSxhQUFhO0FBQUE7QUFBQSxFQUUxQixPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixXQUFXO0FBQUE7QUFBQSxJQUNYLFFBQVE7QUFBQSxJQUNSLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGNBQWM7QUFBQSxVQUNaLFFBQVEsQ0FBQyxTQUFTLGFBQWEsa0JBQWtCO0FBQUEsVUFDakQsUUFBUSxDQUFDLHFCQUFxQix5QkFBeUI7QUFBQSxVQUN2RCxVQUFVLENBQUMsdUJBQXVCO0FBQUEsVUFDbEMsUUFBUSxDQUFDLFVBQVU7QUFBQSxVQUNuQixNQUFNLENBQUMsVUFBVTtBQUFBLFVBQ2pCLE9BQU8sQ0FBQyxtQkFBbUIsdUJBQXVCLEtBQUs7QUFBQSxRQUN6RDtBQUFBO0FBQUEsUUFFQSxnQkFBZ0I7QUFBQSxRQUNoQixnQkFBZ0I7QUFBQSxRQUNoQixnQkFBZ0I7QUFBQSxNQUNsQjtBQUFBLElBQ0Y7QUFBQTtBQUFBLElBRUEsY0FBYztBQUFBO0FBQUEsSUFFZCxXQUFXO0FBQUE7QUFBQSxJQUVYLHVCQUF1QjtBQUFBLEVBQ3pCO0FBQUE7QUFBQSxFQUdBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsTUFDL0IsZUFBZSxRQUFRLGtDQUFXLGtCQUFrQjtBQUFBLE1BQ3BELFVBQVUsUUFBUSxrQ0FBVyxhQUFhO0FBQUEsTUFDMUMsVUFBVSxRQUFRLGtDQUFXLGFBQWE7QUFBQSxNQUMxQyxRQUFRLFFBQVEsa0NBQVcsV0FBVztBQUFBLE1BQ3RDLFVBQVUsUUFBUSxrQ0FBVyxhQUFhO0FBQUEsSUFDNUM7QUFBQSxFQUNGO0FBQUEsRUFFQSxRQUFRO0FBQUE7QUFBQSxJQUVOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQSxJQUNaLE9BQU87QUFBQTtBQUFBLE1BRUwsMEJBQTBCO0FBQUEsUUFDeEIsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsU0FBUyxNQUFNO0FBQUEsTUFDakI7QUFBQTtBQUFBLE1BRUEsU0FBUztBQUFBLFFBQ1AsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsU0FBUyxDQUFDLFNBQVMsS0FBSyxRQUFRLFlBQVksc0JBQXNCO0FBQUEsTUFDcEU7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBO0FBQUEsRUFHQSxTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsSUFDWixNQUFNO0FBQUEsRUFDUjtBQUFBLEVBRUEsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLGNBQWM7QUFBQSxJQUN4QixTQUFTO0FBQUEsTUFDUDtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUE7QUFBQSxFQUdBLFFBQVE7QUFBQSxJQUNOLGdCQUFnQixLQUFLLFdBQVUsb0JBQUksS0FBSyxHQUFFLFlBQVksQ0FBQztBQUFBLElBQ3ZELGFBQWEsS0FBSyxVQUFVLFFBQVEsSUFBSSx1QkFBdUIsT0FBTztBQUFBLEVBQ3hFO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
