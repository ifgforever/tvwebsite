/** Project CRUD, revisions and sourcing overrides. */
import { Hono } from 'hono';
import { createProject } from '../../shared/defaults';
import type { Project } from '../../shared/types';
import { deleteProject, listProjects, loadProject, saveProject } from '../db';
import type { Env } from '../env';

export const projects = new Hono<{ Bindings: Env }>();

projects.get('/projects', async (c) => c.json({ projects: await listProjects(c.env) }));

projects.post('/projects', async (c) => {
  const body = await c.req.json<Partial<Project>>().catch(() => ({} as Partial<Project>));
  // A client-generated project (offline-first) arrives whole; otherwise seed one.
  const project = body.design ? (body as Project) : createProject(body);
  await saveProject(c.env, project, 'Created');
  return c.json({ project }, 201);
});

projects.get('/projects/:id', async (c) => {
  const project = await loadProject(c.env, c.req.param('id'));
  if (!project) return c.json({ error: 'Project not found' }, 404);
  const overrides = await c.env.DB.prepare('SELECT sku, supplier FROM sourcing_overrides WHERE project_id = ?')
    .bind(project.id).all<{ sku: string; supplier: string }>();
  const sourcingOverrides: Record<string, string> = {};
  for (const r of overrides.results || []) sourcingOverrides[r.sku] = r.supplier;
  return c.json({ project, sourcingOverrides });
});

projects.put('/projects/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ project: Project; note?: string }>();
  if (!body?.project) return c.json({ error: 'Missing project' }, 400);
  const project = { ...body.project, id };
  const { revisionId } = await saveProject(c.env, project, body.note || '');
  return c.json({ ok: true, revisionId, updatedAt: new Date().toISOString() });
});

projects.delete('/projects/:id', async (c) => {
  await deleteProject(c.env, c.req.param('id'));
  return c.json({ ok: true });
});

projects.get('/projects/:id/revisions', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, note, created_at FROM revisions WHERE project_id = ? ORDER BY created_at DESC LIMIT 40',
  ).bind(c.req.param('id')).all<Record<string, any>>();
  return c.json({ revisions: (results || []).map((r) => ({ id: r.id, note: r.note, createdAt: r.created_at })) });
});

projects.get('/projects/:id/revisions/:revisionId', async (c) => {
  const row = await c.env.DB.prepare('SELECT snapshot_json FROM revisions WHERE id = ? AND project_id = ?')
    .bind(c.req.param('revisionId'), c.req.param('id')).first<{ snapshot_json: string }>();
  if (!row) return c.json({ error: 'Revision not found' }, 404);
  return c.json({ snapshot: JSON.parse(row.snapshot_json) });
});

projects.put('/projects/:id/sourcing', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ overrides: Record<string, string> }>();
  const stmts = [c.env.DB.prepare('DELETE FROM sourcing_overrides WHERE project_id = ?').bind(id)];
  for (const [sku, supplier] of Object.entries(body.overrides || {})) {
    stmts.push(c.env.DB.prepare('INSERT INTO sourcing_overrides (project_id, sku, supplier) VALUES (?1,?2,?3)').bind(id, sku, supplier));
  }
  await c.env.DB.batch(stmts);
  return c.json({ ok: true });
});
