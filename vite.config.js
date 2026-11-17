import { defineConfig, loadEnv } from 'vite';

import react from '@vitejs/plugin-react';

import tailwindcss from '@tailwindcss/vite';

 

export default defineConfig(({ mode }) => {

  const env = loadEnv(mode, process.cwd(), '');

 

  const apiUrl = env.VITE_API_BASE_URL;

 

  return {

    plugins: [react(), tailwindcss()],

    define: {
      // xlsx-js-style (and stream-browserify) reference Node.js globals that
      // don't exist in the browser. Polyfill them at build time.
      global: 'globalThis',
    },

    resolve: {
      alias: {
        // Map the Node.js `stream` built-in to its browser-compatible polyfill.
        stream: 'stream-browserify',
      },
    },

    server: {

      host: true,

      port: 5173,

      proxy: {

        '/AapdaSetu/backend': {

          target: new URL(apiUrl).origin,

          changeOrigin: true,

          secure: false,

        },

      },

    },

  };

});
