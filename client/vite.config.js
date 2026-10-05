import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// API_URL lets you point the dev proxy at a server on another port.
const apiUrl = process.env.API_URL || 'http://localhost:5000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': apiUrl,
      '/uploads': apiUrl,
    },
  },
});
