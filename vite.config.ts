import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Production optimizations
  build: {
    target: 'es2020',
    sourcemap: false, // Disable source maps in production for security
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          stripe: ['@stripe/stripe-js', '@stripe/react-stripe-js'],
          supabase: ['@supabase/supabase-js'],
          charts: ['recharts'],
          date: ['date-fns'],
          forms: ['react-hook-form', '@hookform/resolvers', 'yup']
        },
        // Optimize chunk naming for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Optimize CSS
    cssCodeSplit: true,
    // Asset handling
    assetsDir: 'assets',
    // Chunk size warnings
    chunkSizeWarningLimit: 1000
  },
  
  // Define aliases for cleaner imports
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@pages': resolve(__dirname, './src/pages'),
      '@utils': resolve(__dirname, './src/utils'),
      '@lib': resolve(__dirname, './src/lib'),
      '@hooks': resolve(__dirname, './src/hooks')
    }
  },
  
  server: {
    // Development server configuration
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
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
  
  // Production preview settings
  preview: {
    port: 4173,
    strictPort: true,
    host: true
  },
  
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'date-fns'
    ]
  },
  
  // Environment variable configuration
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0')
  }
});
