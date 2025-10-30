import { defineConfig } from 'vite';

export default defineConfig({
  // Set base so built assets work under GitHub Pages repo path
  base: '/suburb-explorer-web/',
  server: {
    host: true,
    // Allow Cloudflare tunnel hosts to access the dev server
    // Accept any subdomain of trycloudflare.com
    allowedHosts: ['.trycloudflare.com', 'localhost', '127.0.0.1'],
    hmr: {
      // Helps HMR over HTTPS tunnels
      protocol: 'wss',
      clientPort: 443,
    },
  },
  build: {
    sourcemap: true,
  },
});


