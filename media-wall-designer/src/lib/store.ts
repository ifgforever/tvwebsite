/**
 * Project store.
 *
 * One design in memory, an undo stack over it, and a debounced autosave. Drags
 * mutate transiently and commit once on release, so undo steps match what the
 * user thinks they did rather than every pixel of a pointer move.
 */
import { useSyncExternalStore } from 'react';
import type { Design, DesignComponent, EstimateSettings, PhotoRef, Project, RenderingRef } from '@shared/types';
import { api, getConnection, onConnectionChange } from './api';
import { localDb } from './localdb';

export type SaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'offline' | 'error';

export interface StoreState {
  project: Project | null;
  loading: boolean;
  error: string | null;
  selection: string[];
  saveState: SaveState;
  lastSavedAt: string | null;
  canUndo: boolean;
  canRedo: boolean;
  sourcingOverrides: Record<string, string>;
  connection: ReturnType<typeof getConnection>;
}

const HISTORY_LIMIT = 80;
const AUTOSAVE_MS = 1100;

let state: StoreState = {
  project: null, loading: false, error: null, selection: [], saveState: 'clean',
  lastSavedAt: null, canUndo: false, canRedo: false, sourcingOverrides: {}, connection: getConnection(),
};

let past: Design[] = [];
let future: Design[] = [];
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function emit() { listeners.forEach((l) => l()); }
function set(patch: Partial<StoreState>) { state = { ...state, ...patch }; emit(); }

onConnectionChange((connection) => set({ connection }));

const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const getSnapshot = () => state;

export function useStore(): StoreState { return useSyncExternalStore(subscribe, getSnapshot, getSnapshot); }

function scheduleSave(note = '') {
  if (saveTimer) clearTimeout(saveTimer);
  set({ saveState: 'dirty' });
  // Write to the local mirror straight away — the debounce is about not
  // hammering the network, not about risking the user's work. If the phone
  // dies mid-edit, the last change is already on the device.
  if (state.project) void localDb.put(state.project, true).catch(() => {});
  saveTimer = setTimeout(() => { void flush(note); }, AUTOSAVE_MS);
}

export async function flush(note = ''): Promise<void> {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  const project = state.project;
  if (!project) return;
  set({ saveState: 'saving' });
  const stamped = { ...project, updatedAt: new Date().toISOString() };
  try {
    const { savedRemote } = await api.save(stamped, note);
    set({ project: stamped, saveState: savedRemote ? 'saved' : 'offline', lastSavedAt: stamped.updatedAt });
  } catch (err) {
    set({ saveState: 'error', error: err instanceof Error ? err.message : 'Save failed' });
  }
}

function pushHistory(design: Design) {
  past = [...past.slice(-(HISTORY_LIMIT - 1)), design];
  future = [];
}

export const store = {
  async load(id: string) {
    set({ loading: true, error: null, selection: [] });
    past = []; future = [];
    const out = await api.get(id);
    if (!out) { set({ loading: false, error: 'Project not found', project: null }); return; }
    set({
      project: out.project, sourcingOverrides: out.sourcingOverrides || {},
      loading: false, saveState: 'clean', canUndo: false, canRedo: false, lastSavedAt: out.project.updatedAt,
    });
  },

  clear() { past = []; future = []; set({ project: null, selection: [], saveState: 'clean' }); },

  setProject(project: Project) { set({ project }); },

  /** Patch the project shell (customer, name, status, notes). */
  patchProject(patch: Partial<Project>, note = '') {
    if (!state.project) return;
    set({ project: { ...state.project, ...patch } });
    scheduleSave(note);
  },

  /** Replace the design, pushing an undo step. */
  commitDesign(next: Design, note = '') {
    if (!state.project) return;
    pushHistory(state.project.design);
    set({ project: { ...state.project, design: next }, canUndo: true, canRedo: false });
    scheduleSave(note);
  },

  /** Mutate the design without an undo step — used during a drag. */
  setDesignTransient(next: Design) {
    if (!state.project) return;
    set({ project: { ...state.project, design: next } });
  },

  /** Take the undo snapshot before a transient sequence starts. */
  beginInteraction() {
    if (!state.project) return;
    pushHistory(state.project.design);
    set({ canUndo: true, canRedo: false });
  },

  endInteraction(note = '') { scheduleSave(note); },

  updateComponents(fn: (c: DesignComponent) => DesignComponent, ids?: string[], note = '') {
    if (!state.project) return;
    const idSet = ids ? new Set(ids) : null;
    const next: Design = {
      ...state.project.design,
      components: state.project.design.components.map((c) => (!idSet || idSet.has(c.id) ? fn(c) : c)),
    };
    store.commitDesign(next, note);
  },

  updateComponentsTransient(fn: (c: DesignComponent) => DesignComponent, ids?: string[]) {
    if (!state.project) return;
    const idSet = ids ? new Set(ids) : null;
    store.setDesignTransient({
      ...state.project.design,
      components: state.project.design.components.map((c) => (!idSet || idSet.has(c.id) ? fn(c) : c)),
    });
  },

  addComponents(components: DesignComponent[], note = 'Add') {
    if (!state.project) return;
    store.commitDesign({ ...state.project.design, components: [...state.project.design.components, ...components] }, note);
    set({ selection: components.map((c) => c.id) });
  },

  removeComponents(ids: string[]) {
    if (!state.project) return;
    const keep = new Set(ids);
    store.commitDesign(
      {
        ...state.project.design,
        components: state.project.design.components.filter((c) => !keep.has(c.id)),
        lighting: state.project.design.lighting
          .map((z) => ({ ...z, targets: z.targets.filter((t) => !keep.has(t)) }))
          .filter((z) => z.targets.length > 0 || z.kind === 'cove' || z.kind === 'perimeter'),
      },
      'Delete',
    );
    set({ selection: [] });
  },

  patchWall(patch: Partial<Design['wall']>, note = 'Wall') {
    if (!state.project) return;
    store.commitDesign({ ...state.project.design, wall: { ...state.project.design.wall, ...patch } }, note);
  },

  patchDesign(patch: Partial<Design>, note = 'Design') {
    if (!state.project) return;
    store.commitDesign({ ...state.project.design, ...patch }, note);
  },

  patchSettings(patch: Partial<EstimateSettings>, note = 'Pricing') {
    if (!state.project) return;
    set({ project: { ...state.project, estimateSettings: { ...state.project.estimateSettings, ...patch } } });
    scheduleSave(note);
  },

  addPhoto(photo: PhotoRef, makeBase = false) {
    if (!state.project) return;
    const design = makeBase ? { ...state.project.design, basePhotoId: photo.id } : state.project.design;
    set({ project: { ...state.project, photos: [...state.project.photos, photo], design } });
    scheduleSave('Photo');
  },

  removePhoto(id: string) {
    if (!state.project) return;
    const design = state.project.design.basePhotoId === id
      ? { ...state.project.design, basePhotoId: null, calibration: null }
      : state.project.design;
    set({ project: { ...state.project, photos: state.project.photos.filter((p) => p.id !== id), design } });
    scheduleSave('Photo removed');
    void api.deletePhoto(id);
  },

  addRendering(r: RenderingRef) {
    if (!state.project) return;
    set({ project: { ...state.project, renderings: [r, ...state.project.renderings] } });
  },

  setSourcingOverride(sku: string, supplier: string) {
    const next = { ...state.sourcingOverrides, [sku]: supplier };
    set({ sourcingOverrides: next });
    if (state.project) void api.saveSourcing(state.project.id, next);
  },

  select(ids: string[]) { set({ selection: ids }); },
  toggleSelect(id: string, additive: boolean) {
    const cur = state.selection;
    if (!additive) { set({ selection: [id] }); return; }
    set({ selection: cur.includes(id) ? cur.filter((i) => i !== id) : [...cur, id] });
  },

  undo() {
    if (!state.project || past.length === 0) return;
    const prev = past[past.length - 1];
    past = past.slice(0, -1);
    future = [state.project.design, ...future].slice(0, HISTORY_LIMIT);
    set({ project: { ...state.project, design: prev }, canUndo: past.length > 0, canRedo: true });
    scheduleSave('Undo');
  },

  redo() {
    if (!state.project || future.length === 0) return;
    const next = future[0];
    future = future.slice(1);
    past = [...past, state.project.design];
    set({ project: { ...state.project, design: next }, canUndo: true, canRedo: future.length > 0 });
    scheduleSave('Redo');
  },
};
