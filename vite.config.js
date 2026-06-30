import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 4318,
    strictPort: true,
    fs: { deny: ['.env', '.env.*', '**/.git/**', '**/*.sqlite', '**/*.pem', '**/*.key'] },
  },
});
