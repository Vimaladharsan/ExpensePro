import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3030,
    // Requests to /api go to the Express backend, so the React code can call fetch('/api/...')
    proxy: { '/api': 'http://localhost:5050' },
  },
  build: { chunkSizeWarningLimit: 800 },
});
