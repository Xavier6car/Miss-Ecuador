import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages sirve el sitio en https://<usuario>.github.io/Miss-Ecuador/,
  // así que los assets deben resolverse bajo ese subpath.
  base: '/Miss-Ecuador/',
})
