import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({mode}) => {
  // loadEnv memastikan Vite mencari API Key di sistem (GitHub Secrets)
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    // base ini sangat penting agar file-file kamu tidak Error 404 di domain
    base: '/pulsa2saldo/', 
    
    plugins: [react(), tailwindcss()],
    
    define: {
      // Menghubungkan API Key ke aplikasi
      'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
    },
    
    resolve: {
      alias: {
        // Memudahkan aplikasi mencari folder internal
        '@': path.resolve(__dirname, '.'),
      },
    },
    
    server: {
      // Pengaturan standar dari Google AI Studio
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
