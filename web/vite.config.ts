import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  // The app imports ../shared (attribute vocabulary) and ../eval (fixtures) from outside web/.
  server: { fs: { allow: ['..'] } },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        eval: resolve(__dirname, 'eval.html'),
      },
    },
  },
});
