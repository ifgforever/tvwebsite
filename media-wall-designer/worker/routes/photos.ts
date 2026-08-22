/** Photo upload / serve. R2 when bound, D1 blob otherwise. */
import { Hono } from 'hono';
import { uid } from '../../shared/id';
import type { Env } from '../env';

export const photos = new Hono<{ Bindings: Env }>();

const MAX_D1_BYTES = 900_000; // D1 caps a single value around 1 MB

photos.post('/projects/:id/photos', async (c) => {
  const projectId = c.req.param('id');
  const exists = await c.env.DB.prepare('SELECT id FROM projects WHERE id = ?').bind(projectId).first();
  if (!exists) return c.json({ error: 'Project not found' }, 404);

  const form = await c.req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return c.json({ error: 'No file' }, 400);

  const kind = String(form.get('kind') || 'before');
  const caption = String(form.get('caption') || '');
  const width = Number(form.get('width') || 0);
  const height = Number(form.get('height') || 0);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const id = uid('ph');
  const now = new Date().toISOString();

  let storage = 'd1';
  let storageKey: string | null = null;

  if (c.env.PHOTOS) {
    storage = 'r2';
    storageKey = `${projectId}/${id}`;
    await c.env.PHOTOS.put(storageKey, bytes, { httpMetadata: { contentType: file.type || 'image/jpeg' } });
  } else if (bytes.byteLength > MAX_D1_BYTES) {
    return c.json({
      error: `Image is ${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB. Without an R2 bucket bound, images must be under 0.9 MB — the app downscales before upload, so this usually means the client-side resize was skipped.`,
    }, 413);
  }

  await c.env.DB.batch([
    c.env.DB.prepare(
      'INSERT INTO photos (id, project_id, kind, mime, width, height, caption, storage, storage_key, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)',
    ).bind(id, projectId, kind, file.type || 'image/jpeg', width, height, caption, storage, storageKey, now),
    ...(storage === 'd1' ? [c.env.DB.prepare('INSERT INTO photo_blobs (photo_id, data) VALUES (?1, ?2)').bind(id, bytes)] : []),
  ]);

  return c.json({ id, url: `/api/photos/${id}`, kind, width, height, caption, createdAt: now, transform: null });
});

photos.get('/photos/:id', async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare('SELECT * FROM photos WHERE id = ?').bind(id).first<Record<string, any>>();
  if (!row) return c.text('Not found', 404);

  const headers = {
    'Content-Type': row.mime || 'image/jpeg',
    'Cache-Control': 'public, max-age=31536000, immutable',
  };

  if (row.storage === 'r2' && c.env.PHOTOS && row.storage_key) {
    const obj = await c.env.PHOTOS.get(row.storage_key);
    if (!obj) return c.text('Not found', 404);
    return new Response(obj.body, { headers });
  }
  const blob = await c.env.DB.prepare('SELECT data FROM photo_blobs WHERE photo_id = ?').bind(id).first<{ data: ArrayBuffer }>();
  if (!blob) return c.text('Not found', 404);
  return new Response(blob.data, { headers });
});

photos.patch('/photos/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ caption?: string; kind?: string; transform?: unknown }>();
  await c.env.DB.prepare(
    'UPDATE photos SET caption = COALESCE(?2, caption), kind = COALESCE(?3, kind), transform_json = COALESCE(?4, transform_json) WHERE id = ?1',
  ).bind(id, body.caption ?? null, body.kind ?? null, body.transform ? JSON.stringify(body.transform) : null).run();
  return c.json({ ok: true });
});

photos.delete('/photos/:id', async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare('SELECT storage, storage_key FROM photos WHERE id = ?').bind(id).first<Record<string, any>>();
  if (row?.storage === 'r2' && c.env.PHOTOS && row.storage_key) await c.env.PHOTOS.delete(row.storage_key);
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM photo_blobs WHERE photo_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(id),
  ]);
  return c.json({ ok: true });
});
