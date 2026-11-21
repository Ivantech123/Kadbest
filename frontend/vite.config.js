import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// сборка — в ../backend/web, её отдаёт сам сервер; в dev /v1 и /mcp проксируются на шлюз
export default defineConfig({
  plugins: [react()],
  build: { outDir: '../backend/web', emptyOutDir: true },
  server: { port: 5173, strictPort: true, proxy: { '/v1': 'http://127.0.0.1:8090', '/mcp': 'http://127.0.0.1:8090' } },
});
