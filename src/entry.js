import { installDesignPreview } from './design-preview.js';

if (import.meta.env.VITE_CONNECTED_FRONTEND !== 'true') await installDesignPreview();
await import('./product/main');
