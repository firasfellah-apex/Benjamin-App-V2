import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` and `VITE_APP_TARGET` in the current working directory.
  // Vite automatically loads .env files in this order:
  // 1. .env
  // 2. .env.local
  // 3. .env.[mode]
  // 4. .env.[mode].local
  //
  // For multi-app setup:
  // - .env.local contains shared variables (Supabase, Google Maps, etc.)
  // - .env.customer.local, .env.runner.local, .env.admin.local contain app-specific overrides
  // - VITE_APP_TARGET determines which app-specific env file to load
  
  // Detect app target from environment or mode
  // This will be used later when split configs are created
  const env = loadEnv(mode, process.cwd(), '');
  const appTarget = env.VITE_APP_TARGET || mode.split('.')[0]; // e.g., 'customer' from 'customer.local'
  
  // Log in dev for debugging
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Vite Config] Mode: ${mode}, App Target: ${appTarget || 'default'}`);
  }

  return {
    plugins: [
      react(),
      svgr({
        svgrOptions: {
          icon: true,
          exportType: 'named',
          namedExport: 'ReactComponent'
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      },
      dedupe: ['react', 'react-dom']
    },
    optimizeDeps: {
      include: ['@radix-ui/react-switch', 'react', 'react-dom']
    },
    // Expose VITE_APP_TARGET to the app
    define: {
      'import.meta.env.VITE_APP_TARGET': JSON.stringify(appTarget || ''),
    },
  };
});
