import { defineConfig } from 'vite';

export default defineConfig({
  envDir: false,
  envPrefix: 'OMNIA_PUBLIC_',
  build: {
    sourcemap: false,
    target: 'es2022',
  },
});
