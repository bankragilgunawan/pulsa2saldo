import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    // BARIS DI BAWAH INI SANGAT PENTING
    base: './pulsa2saldo/', 
    plugins: [react(), tailwindcss()],
    define: {
          define: {
      'process.env.GEMINI_API_KEY': JSON.stringify("AIzaSyBci1WRxZXetgQC4dE5z-G_1Q5Dc1AZcog"),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
