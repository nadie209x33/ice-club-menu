import { handle } from 'hono/cloudflare-pages';
import app from '../../server/app';

// Entrada de Pages Functions: toda petición a /api/* se delega en la aplicación de Hono.
export const onRequest = handle(app);
