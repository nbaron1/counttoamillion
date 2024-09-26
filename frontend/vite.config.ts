import { sentryVitePlugin } from '@sentry/vite-plugin';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: 'folds-fp',
      project: 'counttoamillion-frontend',
      url: 'https://sentry.io/',
    }),
  ],
  server: {
    port: 3000,
  },
  build: {
    sourcemap: true,
  },
});
