/**
 * Media Wall Designer API.
 *
 * Cloudflare Worker with static assets. /api/* is handled here; everything else
 * falls through to the SPA build in ./dist.
 */
import { Hono } from 'hono';
import { projects } from './routes/projects';
import { photos } from './routes/photos';
import { renderings } from './routes/renderings';
import type { Env } from './env';

const app = new Hono<{ Bindings: Env }>();

app.get('/api/health', async (c) => {
  let db = false;
  try {
    await c.env.DB.prepare('SELECT 1').first();
    db = true;
  } catch { /* reported as false */ }
  return c.json({
    ok: true,
    db,
    storage: c.env.PHOTOS ? 'r2' : 'd1',
    aiProvider: c.env.AI_IMAGE_PROVIDER || null,
    time: new Date().toISOString(),
  });
});

app.route('/api', projects);
app.route('/api', photos);
app.route('/api', renderings);

app.notFound((c) => (c.req.path.startsWith('/api') ? c.json({ error: 'Not found' }, 404) : c.env.ASSETS.fetch(c.req.raw)));

app.onError((err, c) => {
  console.error('API error', err);
  return c.json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500);
});

export default app;
