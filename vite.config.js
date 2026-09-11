import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000
  },
  server: {
    host: '0.0.0.0',
    port: 5173
  }
});
