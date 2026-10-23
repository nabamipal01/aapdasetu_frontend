import { defineConfig, loadEnv } from 'vite';

import react from '@vitejs/plugin-react';

import tailwindcss from '@tailwindcss/vite';

 

export default defineConfig(({ mode }) => {

  const env = loadEnv(mode, process.cwd(), '');

 

  const apiUrl = env.VITE_API_BASE_URL;

 

  return {

    plugins: [react(), tailwindcss()],

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
