import { defineConfig } from 'vite';

// Separate build for service worker (TS → JS), output sw.js at project root of dist
export default defineConfig({
  build: {
    sourcemap: false,
    rollupOptions: {
      input: 'src/sw.ts',
      output: {
        entryFileNames: 'sw.js',
      },
    },
    outDir: 'dist',
    emptyOutDir: false,
  },
});


