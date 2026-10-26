import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages serves the app under /<repo>/. VITE_BASE_PATH lets CI set it;
// local dev defaults to "/".
export default defineConfig(({ command }) => ({
  base: process.env.VITE_BASE_PATH ?? (command === 'build' ? '/bobba_zone/' : '/'),
  plugins: [react(), tailwindcss()],
  build: { sourcemap: false, target: 'es2022', chunkSizeWarningLimit: 700 },
}));
