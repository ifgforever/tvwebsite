/**
 * Repository — one interface, two transports.
 *
 * Server first. If the Worker is unreachable the same calls run against
 * IndexedDB and the UI flips to an "offline, saving locally" state. Nothing in
 * the screens knows or cares which one is live.
 */
import type { Project } from '@shared/types';
import { localDb } from './localdb';

export interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  customerName: string;
  address: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
  widthIn?: number;
  heightIn?: number;
  nicheCount?: number;
  photoCount?: number;
  thumbUrl?: string | null;
  local?: boolean;
}

export type ConnectionState = 'online' | 'offline' | 'checking';

let connection: ConnectionState = 'checking';
const listeners = new Set<(s: ConnectionState) => void>();

export const getConnection = () => connection;
export function onConnectionChange(fn: (s: ConnectionState) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function setConnection(s: ConnectionState) {
  if (connection === s) return;
  connection = s;
  listeners.forEach((l) => l(s));
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: init?.body instanceof FormData ? init?.headers : { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try { message = JSON.parse(text).error || text; } catch { /* plain text */ }
    throw new Error(message || `Request failed (${res.status})`);
  }
  setConnection('online');
  return res.json() as Promise<T>;
}

export async function checkHealth(): Promise<{ ok: boolean; db: boolean; storage: string; aiProvider: string | null } | null> {
  try {
    const h = await req<{ ok: boolean; db: boolean; storage: string; aiProvider: string | null }>('/api/health');
    setConnection('online');
    return h;
  } catch {
    setConnection('offline');
    return null;
  }
}

export const api = {
  async list(): Promise<ProjectSummary[]> {
    try {
      const { projects } = await req<{ projects: ProjectSummary[] }>('/api/projects');
      const localOnly = (await localDb.all())
        .filter((r) => !projects.some((p) => p.id === r.id))
        .map(toSummary);
      return [...localOnly, ...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } catch {
      setConnection('offline');
      return (await localDb.all()).map(toSummary).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
  },

  async get(id: string): Promise<{ project: Project; sourcingOverrides: Record<string, string> } | null> {
    try {
      const out = await req<{ project: Project; sourcingOverrides: Record<string, string> }>(`/api/projects/${id}`);
      await localDb.put(out.project, false);
      return out;
    } catch {
      setConnection('offline');
      const rec = await localDb.get(id);
      return rec ? { project: rec.project, sourcingOverrides: {} } : null;
    }
  },

  async create(project: Project): Promise<Project> {
    await localDb.put(project, true);
    try {
      const { project: saved } = await req<{ project: Project }>('/api/projects', { method: 'POST', body: JSON.stringify(project) });
      await localDb.put(saved, false);
      return saved;
    } catch {
      setConnection('offline');
      return project;
    }
  },

  async save(project: Project, note = ''): Promise<{ savedRemote: boolean }> {
    await localDb.put(project, true);
    try {
      await req(`/api/projects/${project.id}`, { method: 'PUT', body: JSON.stringify({ project, note }) });
      await localDb.put(project, false);
      return { savedRemote: true };
    } catch {
      setConnection('offline');
      return { savedRemote: false };
    }
  },

  async remove(id: string) {
    await localDb.remove(id);
    try { await req(`/api/projects/${id}`, { method: 'DELETE' }); } catch { setConnection('offline'); }
  },

  async uploadPhoto(projectId: string, blob: Blob, meta: { kind: string; width: number; height: number; caption?: string }) {
    const form = new FormData();
    form.set('file', blob, 'photo.jpg');
    form.set('kind', meta.kind);
    form.set('width', String(meta.width));
    form.set('height', String(meta.height));
    form.set('caption', meta.caption || '');
    try {
      return await req<{ id: string; url: string; kind: string; width: number; height: number; caption: string; createdAt: string }>(
        `/api/projects/${projectId}/photos`, { method: 'POST', body: form },
      );
    } catch (err) {
      // Keep the photo locally and hand back an object URL so the UI carries on.
      setConnection('offline');
      const id = `local_${Date.now().toString(36)}`;
      await localDb.putPhoto(id, projectId, blob, { kind: meta.kind, width: meta.width, height: meta.height, caption: meta.caption || '' });
      if (err instanceof Error && /0\.9 MB|413/.test(err.message)) throw err;
      return { id, url: URL.createObjectURL(blob), kind: meta.kind, width: meta.width, height: meta.height, caption: meta.caption || '', createdAt: new Date().toISOString() };
    }
  },

  async deletePhoto(id: string) {
    try { await req(`/api/photos/${id}`, { method: 'DELETE' }); } catch { setConnection('offline'); }
  },

  async renderPrompt(projectId: string, variant = 1) {
    return req<{ prompt: string; negativePrompt: string; facts: string[]; providerConfigured: boolean }>(
      `/api/projects/${projectId}/render-prompt?variant=${variant}`,
    );
  },

  async requestRendering(projectId: string, body: { variant?: number; roomStyle?: string; revisionId?: string }) {
    const res = await fetch(`/api/projects/${projectId}/renderings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return res.json() as Promise<{ id: string; variant: number; status: string; url: string | null; prompt: string; provider: string; error?: string }>;
  },

  async saveSourcing(projectId: string, overrides: Record<string, string>) {
    try { await req(`/api/projects/${projectId}/sourcing`, { method: 'PUT', body: JSON.stringify({ overrides }) }); } catch { /* local only */ }
  },

  /** Push everything created while offline. */
  async syncPending(): Promise<{ pushed: number; failed: number }> {
    const dirty = await localDb.dirty();
    let pushed = 0;
    let failed = 0;
    for (const rec of dirty) {
      try {
        await req(`/api/projects/${rec.id}`, { method: 'PUT', body: JSON.stringify({ project: rec.project, note: 'Synced from offline' }) });
        await localDb.put(rec.project, false);
        pushed++;
      } catch {
        failed++;
      }
    }
    for (const photo of await localDb.pendingPhotos()) {
      try {
        const form = new FormData();
        form.set('file', photo.blob, 'photo.jpg');
        form.set('kind', photo.kind);
        form.set('width', String(photo.width));
        form.set('height', String(photo.height));
        await req(`/api/projects/${photo.projectId}/photos`, { method: 'POST', body: form });
        await localDb.markPhotoSynced(photo.id);
      } catch { /* try again next time */ }
    }
    return { pushed, failed };
  },
};

function toSummary(r: { project: Project; savedAt: string; dirty: boolean }): ProjectSummary {
  const p = r.project;
  return {
    id: p.id, name: p.name, status: p.status, customerName: p.customer.name,
    address: [p.customer.address, p.customer.city].filter(Boolean).join(', '),
    phone: p.customer.phone, createdAt: p.createdAt, updatedAt: p.updatedAt,
    widthIn: p.design.wall.widthIn, heightIn: p.design.wall.heightIn,
    nicheCount: p.design.components.filter((c) => c.type === 'niche').length,
    photoCount: p.photos.length, thumbUrl: null, local: r.dirty,
  };
}
