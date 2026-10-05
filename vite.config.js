import { defineConfig } from 'vite';

export default defineConfig({
  build: { rolldownOptions: { input: { panel: 'index.html', docs: 'docs/index.html', app: 'app/index.html' } } },
  server: {
    host: '127.0.0.1',
    port: 4318,
    strictPort: true,
    fs: { deny: ['.env', '.env.*', '**/.git/**', '**/*.sqlite', '**/*.pem', '**/*.key'] },
  },
});
