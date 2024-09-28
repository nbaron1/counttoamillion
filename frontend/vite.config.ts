import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import vitePluginBundleObfuscator from 'vite-plugin-bundle-obfuscator';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    vitePluginBundleObfuscator({
      enable: true,
      log: true,
      autoExcludeNodeModules: true,
      excludes: [],
      options: {},
    }),
  ],
  server: {
    port: 3000,
  },
});
