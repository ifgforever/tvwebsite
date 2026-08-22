/** Pure elevation geometry: rects, snapping, alignment, distribution, layout generators. */
import type { DesignComponent, Design, NicheComponent, Wall } from './types';
import { snap } from './units';

export interface Rect { x: number; y: number; w: number; h: number }

export const rectOf = (c: { x: number; y: number; w: number; h: number }): Rect => ({ x: c.x, y: c.y, w: c.w, h: c.h });
export const right = (r: Rect) => r.x + r.w;
export const top = (r: Rect) => r.y + r.h;
export const centerX = (r: Rect) => r.x + r.w / 2;
export const centerY = (r: Rect) => r.y + r.h / 2;

export const intersects = (a: Rect, b: Rect, tol = 0) =>
  a.x < right(b) - tol && right(a) > b.x + tol && a.y < top(b) - tol && top(a) > b.y + tol;

export const contains = (outer: Rect, inner: Rect, tol = 0.001) =>
  inner.x >= outer.x - tol && inner.y >= outer.y - tol && right(inner) <= right(outer) + tol && top(inner) <= top(outer) + tol;

export const wallRect = (wall: Wall): Rect => ({ x: 0, y: 0, w: wall.widthIn, h: wall.heightIn });

/** Screen mapping — the ONE place elevation y-up becomes screen y-down. */
export function toScreen(r: Rect, wall: Wall, scale: number, pad = 0): Rect {
  return { x: pad + r.x * scale, y: pad + (wall.heightIn - r.y - r.h) * scale, w: r.w * scale, h: r.h * scale };
}
export function fromScreenPoint(px: number, py: number, wall: Wall, scale: number, pad = 0) {
  return { x: (px - pad) / scale, y: wall.heightIn - (py - pad) / scale };
}

/* ------------------------------------------------------------------ snapping */

export interface SnapGuide { axis: 'x' | 'y'; at: number; kind: 'center' | 'edge' | 'grid' | 'spacing'; label?: string }

export interface SnapResult { x: number; y: number; guides: SnapGuide[] }

/**
 * Snap a moving rect against: wall centre, wall edges, sibling edges/centres,
 * and the grid. Tolerance is in inches so it stays honest at any zoom.
 */
export function snapRect(
  moving: Rect,
  others: Rect[],
  wall: Wall,
  opts: { grid: number; snapToGrid: boolean; snapToCenter: boolean; snapToObjects: boolean; tolIn: number },
): SnapResult {
  const guides: SnapGuide[] = [];
  let { x, y } = moving;
  const tol = opts.tolIn;

  const candX: { target: number; value: number; kind: SnapGuide['kind']; label?: string }[] = [];
  const candY: typeof candX = [];

  if (opts.snapToCenter) {
    candX.push({ target: wall.widthIn / 2 - moving.w / 2, value: wall.widthIn / 2, kind: 'center', label: 'WALL ℄' });
    candY.push({ target: wall.heightIn / 2 - moving.h / 2, value: wall.heightIn / 2, kind: 'center', label: 'WALL ℄' });
  }
  if (opts.snapToObjects) {
    candX.push({ target: 0, value: 0, kind: 'edge' }, { target: wall.widthIn - moving.w, value: wall.widthIn, kind: 'edge' });
    candY.push({ target: 0, value: 0, kind: 'edge' }, { target: wall.heightIn - moving.h, value: wall.heightIn, kind: 'edge' });
    for (const o of others) {
      candX.push(
        { target: o.x, value: o.x, kind: 'edge' },
        { target: right(o) - moving.w, value: right(o), kind: 'edge' },
        { target: right(o), value: right(o), kind: 'edge' },
        { target: o.x - moving.w, value: o.x, kind: 'edge' },
        { target: centerX(o) - moving.w / 2, value: centerX(o), kind: 'center' },
      );
      candY.push(
        { target: o.y, value: o.y, kind: 'edge' },
        { target: top(o) - moving.h, value: top(o), kind: 'edge' },
        { target: top(o), value: top(o), kind: 'edge' },
        { target: o.y - moving.h, value: o.y, kind: 'edge' },
        { target: centerY(o) - moving.h / 2, value: centerY(o), kind: 'center' },
      );
    }
  }

  const best = (cands: typeof candX, cur: number) => {
    let bestC: (typeof candX)[number] | null = null;
    let bestD = tol;
    for (const c of cands) {
      const d = Math.abs(c.target - cur);
      if (d < bestD) { bestD = d; bestC = c; }
    }
    return bestC;
  };

  const bx = best(candX, x);
  if (bx) { x = bx.target; guides.push({ axis: 'x', at: bx.value, kind: bx.kind, label: bx.label }); }
  else if (opts.snapToGrid) x = Math.round(x / opts.grid) * opts.grid;

  const by = best(candY, y);
  if (by) { y = by.target; guides.push({ axis: 'y', at: by.value, kind: by.kind, label: by.label }); }
  else if (opts.snapToGrid) y = Math.round(y / opts.grid) * opts.grid;

  return { x: snap(x), y: snap(y), guides };
}

/* ------------------------------------------------------- align & distribute */

export type AlignMode = 'left' | 'hcenter' | 'right' | 'bottom' | 'vcenter' | 'top';

export function alignComponents<T extends DesignComponent>(items: T[], mode: AlignMode, wall?: Wall): T[] {
  if (items.length === 0) return items;
  const single = items.length === 1 && wall;
  const bounds = single
    ? { x: 0, y: 0, w: wall!.widthIn, h: wall!.heightIn }
    : items.reduce(
        (acc, c) => ({
          x: Math.min(acc.x, c.x),
          y: Math.min(acc.y, c.y),
          w: 0,
          h: 0,
          x2: Math.max((acc as any).x2 ?? -Infinity, c.x + c.w),
          y2: Math.max((acc as any).y2 ?? -Infinity, c.y + c.h),
        }),
        { x: Infinity, y: Infinity, w: 0, h: 0 } as any,
      );
  const bx = bounds.x;
  const bx2 = single ? wall!.widthIn : (bounds as any).x2;
  const by = bounds.y;
  const by2 = single ? wall!.heightIn : (bounds as any).y2;

  return items.map((c) => {
    if (c.locked) return c;
    switch (mode) {
      case 'left': return { ...c, x: snap(bx) };
      case 'right': return { ...c, x: snap(bx2 - c.w) };
      case 'hcenter': return { ...c, x: snap((bx + bx2) / 2 - c.w / 2) };
      case 'bottom': return { ...c, y: snap(by) };
      case 'top': return { ...c, y: snap(by2 - c.h) };
      case 'vcenter': return { ...c, y: snap((by + by2) / 2 - c.h / 2) };
    }
  });
}

/** Equal gaps between items along an axis, outer items held. */
export function distributeComponents<T extends DesignComponent>(items: T[], axis: 'x' | 'y'): T[] {
  if (items.length < 3) return items;
  const sorted = [...items].sort((a, b) => (axis === 'x' ? a.x - b.x : a.y - b.y));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const startEdge = axis === 'x' ? first.x + first.w : first.y + first.h;
  const endEdge = axis === 'x' ? last.x : last.y;
  const inner = sorted.slice(1, -1);
  const totalSize = inner.reduce((s, c) => s + (axis === 'x' ? c.w : c.h), 0);
  const gap = (endEdge - startEdge - totalSize) / (inner.length + 1);
  let cursor = startEdge + gap;
  const moved = new Map<string, T>();
  for (const c of inner) {
    moved.set(c.id, axis === 'x' ? ({ ...c, x: snap(cursor) } as T) : ({ ...c, y: snap(cursor) } as T));
    cursor += (axis === 'x' ? c.w : c.h) + gap;
  }
  return items.map((c) => moved.get(c.id) ?? c);
}

/** The measured gap between neighbours — shown live in the editor. */
export function gapsBetween(items: Rect[], axis: 'x' | 'y'): number[] {
  const sorted = [...items].sort((a, b) => (axis === 'x' ? a.x - b.x : a.y - b.y));
  const out: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    out.push(axis === 'x' ? cur.x - right(prev) : cur.y - top(prev));
  }
  return out;
}

/* ------------------------------------------------------- niche bank layouts */

export interface NicheBankSpec {
  perSide: number;
  columns: number;
  nicheW: number;
  nicheH: number;
  depth: number;
  hGap: number;
  vGap: number;
  /** Gap between the outer wall edge and the first niche column. */
  edgeMargin: number;
  /** Vertical centre of the bank, inches AFF. */
  centerY: number;
}

/**
 * Generates the flanking niche banks seen in the reference build: N stacked
 * niches on the left, N on the right, mirrored about the wall centreline.
 */
export function layoutNicheBanks(wall: Wall, spec: NicheBankSpec): Rect[] {
  const rects: Rect[] = [];
  const rows = Math.ceil(spec.perSide / spec.columns);
  const bankW = spec.columns * spec.nicheW + (spec.columns - 1) * spec.hGap;
  const bankH = rows * spec.nicheH + (rows - 1) * spec.vGap;
  const bottom = spec.centerY - bankH / 2;

  for (const side of ['left', 'right'] as const) {
    const bankX = side === 'left' ? spec.edgeMargin : wall.widthIn - spec.edgeMargin - bankW;
    for (let i = 0; i < spec.perSide; i++) {
      const row = Math.floor(i / spec.columns);
      const col = i % spec.columns;
      rects.push({
        x: snap(bankX + col * (spec.nicheW + spec.hGap)),
        // Row 0 at the top so numbering reads top-down like the drawing.
        y: snap(bottom + (rows - 1 - row) * (spec.nicheH + spec.vGap)),
        w: spec.nicheW,
        h: spec.nicheH,
      });
    }
  }
  return rects;
}

/** Widest clear centre bay between the niche banks — what the TV/fireplace get. */
export function centerBay(design: Design): { x: number; w: number } {
  const niches = design.components.filter((c): c is NicheComponent => c.type === 'niche');
  const mid = design.wall.widthIn / 2;
  const leftEdge = Math.max(0, ...niches.filter((n) => right(rectOf(n)) <= mid).map((n) => right(rectOf(n))));
  const rightCandidates = niches.filter((n) => n.x >= mid).map((n) => n.x);
  const rightEdge = rightCandidates.length ? Math.min(...rightCandidates) : design.wall.widthIn;
  return { x: leftEdge, w: Math.max(0, rightEdge - leftEdge) };
}
