import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 8000,
    host: true,
    hmr: {
      overlay: true
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'esbuild',
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  css: {
    devSourcemap: true
  },
  esbuild: {
    target: 'es2020'
  }
})