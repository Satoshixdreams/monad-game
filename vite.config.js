import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    hmr: {
      overlay: false
    }
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['ethers', 'axios']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['ethers', 'axios', 'react', 'react-dom']
  }
});