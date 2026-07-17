import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// IMPORTANT: set `base` to your GitHub Pages subpath.
// If your repo is https://github.com/USER/morning-report, base = '/morning-report/'
// For a custom domain or user page, use '/'.
export default defineConfig({
  plugins: [react()],
  base: '/morning-report/',
});
