import { defineConfig } from 'vite'

export default defineConfig({
  // relative base so the built site works from any static host or subpath
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          gsap: ['gsap', 'lenis'],
        },
      },
    },
  },
})
