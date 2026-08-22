/**
 * Framing generator.
 *
 * Turns the dimensioned design into every physical stick of lumber, positioned
 * in the same elevation coordinate space as the design itself. The framing
 * drawing renders this list; the cut list consumes the same list. There is no
 * second, hand-maintained idea of what gets built.
 *
 * Layout follows real practice: end studs at each end, interior studs laid out
 * so their CENTRES fall on the 16"/24" module (first mark at 15-1/4"), openings
 * framed with side verticals plus a header and sill, stacked niches sharing
 * their column verticals so they frame as a ladder — which is exactly how the
 * reference wall was built.
 */
import type { Design, FireplaceComponent, FramingMember, NicheComponent, DesignComponent } from '../types';
import { LUMBER } from '../catalog';
import { studDepth } from '../defaults';
import { snap } from '../units';

const FACE = 1.5; // 2x lumber face width seen in elevation

export interface Opening {
  id: string;
  kind: 'niche' | 'fireplace' | 'custom';
  label: string;
  /** Framed rough opening (finished size + drywall returns, or the manufacturer's RO). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** True when the numbers came from a manufacturer document rather than a guess. */
  verified: boolean;
}

export interface FramingResult {
  members: FramingMember[];
  openings: Opening[];
  studLines: number[];
  stats: {
    studCount: number;
    crippleCount: number;
    plateLf: number;
    headerCount: number;
    totalLf: number;
    boardFeet: number;
    lumberLabel: string;
    framedDepth: number;
    studLength: number;
    topOfStuds: number;
  };
}

const lumberFace = (design: Design) => (design.wall.lumber === 'custom' ? FACE : LUMBER[design.wall.lumber].actualW);

/** Rough openings: niches grow by the drywall return on every side; the fireplace uses the manual. */
export function computeOpenings(design: Design): Opening[] {
  const dw = design.wall.drywallThickness;
  const out: Opening[] = [];

  for (const c of design.components) {
    if (c.type === 'niche') {
      const n = c as NicheComponent;
      out.push({
        id: n.id, kind: 'niche', label: n.label,
        x: snap(n.x - dw), y: snap(n.y - dw), w: snap(n.w + dw * 2), h: snap(n.h + dw * 2),
        verified: true,
      });
    } else if (c.type === 'fireplace') {
      const f = c as FireplaceComponent;
      const hasRo = f.props.roughWIn != null && f.props.roughHIn != null;
      // No rough opening is ever inferred from the advertised size. Until the
      // manual is entered we frame to the drawn box and flag it, loudly.
      out.push({
        id: f.id, kind: 'fireplace', label: f.label,
        x: hasRo ? snap(f.x + f.w / 2 - f.props.roughWIn! / 2) : snap(f.x - dw),
        y: hasRo ? f.y : snap(f.y - dw),
        w: hasRo ? f.props.roughWIn! : snap(f.w + dw * 2),
        h: hasRo ? f.props.roughHIn! : snap(f.h + dw * 2),
        verified: hasRo && f.props.specsVerified,
      });
    } else if (c.type === 'custom' && (c as any).props?.recessed) {
      out.push({ id: c.id, kind: 'custom', label: c.label, x: snap(c.x - dw), y: snap(c.y - dw), w: snap(c.w + dw * 2), h: snap(c.h + dw * 2), verified: true });
    }
  }
  return out.sort((a, b) => a.x - b.x || a.y - b.y);
}

interface Interval { a: number; b: number }

const mergeIntervals = (list: Interval[]): Interval[] => {
  const s = [...list].sort((p, q) => p.a - q.a);
  const out: Interval[] = [];
  for (const i of s) {
    const last = out[out.length - 1];
    if (last && i.a <= last.b + 0.01) last.b = Math.max(last.b, i.b);
    else out.push({ ...i });
  }
  return out;
};

export function generateFraming(design: Design): FramingResult {
  const { wall } = design;
  const face = lumberFace(design);
  const W = wall.widthIn;
  const H = wall.heightIn;
  const lumber = wall.lumber;
  const members: FramingMember[] = [];
  let seq = 0;
  const add = (m: Omit<FramingMember, 'id' | 'lumber' | 'qty'> & { qty?: number; lumber?: FramingMember['lumber'] }) => {
    members.push({ id: `fm${++seq}`, lumber: m.lumber ?? lumber, qty: m.qty ?? 1, ...m } as FramingMember);
  };

  const plateCount = wall.doubleTopPlate ? 2 : 1;
  const topOfStuds = snap(H - face * plateCount);
  const studLength = snap(topOfStuds - face);
  const openings = computeOpenings(design);

  /* ---- plates ---- */
  add({ kind: 'bottom_plate', x: 0, y: 0, w: W, h: face, orientation: 'horizontal', lengthIn: W,
        note: wall.ptBottomPlate ? 'Bottom plate — pressure treated at slab' : 'Bottom plate' });
  add({ kind: 'top_plate', x: 0, y: snap(H - face), w: W, h: face, orientation: 'horizontal', lengthIn: W, note: 'Top plate — fasten to ceiling framing' });
  if (wall.doubleTopPlate) {
    add({ kind: 'cap_plate', x: 0, y: snap(H - face * 2), w: W, h: face, orientation: 'horizontal', lengthIn: W, note: 'Second top plate' });
  }

  /* ---- vertical layout lines ---- */
  const xs: number[] = [0, snap(W - face)];
  for (let i = 1; ; i++) {
    const x = snap(i * wall.studSpacing - face / 2);
    if (x + face > W - 0.25) break;
    xs.push(x);
  }
  // Openings need a vertical each side, and cripple lines across wide openings.
  for (const o of openings) {
    xs.push(snap(o.x - face), snap(o.x + o.w));
    for (let x = snap(o.x + wall.studSpacing - face / 2); x + face < o.x + o.w; x += wall.studSpacing) xs.push(snap(x));
  }
  const studLines: number[] = [];
  for (const x of xs.sort((a, b) => a - b)) {
    if (x < -0.01 || x + face > W + 0.01) continue;
    if (!studLines.some((s) => Math.abs(s - x) < 1.0)) studLines.push(x);
  }

  /* ---- vertical members, segmented around openings ---- */
  const isSideOf = (x: number) => openings.find((o) => Math.abs(x + face - o.x) < 0.6 || Math.abs(x - (o.x + o.w)) < 0.6);
  let studCount = 0;
  let crippleCount = 0;

  for (const x of studLines) {
    const blocked = mergeIntervals(
      openings
        .filter((o) => x + face > o.x + 0.01 && x < o.x + o.w - 0.01)
        .map((o) => ({ a: snap(o.y - face), b: snap(o.y + o.h + face) })),
    );
    const segments: Interval[] = [];
    let cursor = face;
    for (const b of blocked) {
      if (b.a - cursor > 2.5) segments.push({ a: cursor, b: Math.min(b.a, topOfStuds) });
      cursor = Math.max(cursor, b.b);
    }
    if (topOfStuds - cursor > 2.5) segments.push({ a: cursor, b: topOfStuds });

    const side = isSideOf(x);
    for (const s of segments) {
      const len = snap(s.b - s.a);
      if (len < 2.5) continue;
      const full = Math.abs(len - studLength) < 0.6;
      const kind: FramingMember['kind'] = full ? (side ? 'king_stud' : 'stud') : blocked.length ? 'cripple' : 'stud';
      if (full) studCount++; else crippleCount++;
      add({
        kind, x, y: snap(s.a), w: face, h: len, orientation: 'vertical', lengthIn: len,
        note: full
          ? side ? `Full-height stud at ${side.label}` : `Stud @ ${wall.studSpacing}" O.C.`
          : `Cripple${blocked.length ? ' at opening' : ''}`,
      });
    }
  }

  /* ---- headers, sills and jacks per opening ---- */
  let headerCount = 0;
  for (const o of openings) {
    const spanW = snap(o.w + face * 2);
    headerCount++;
    add({
      kind: 'header', x: snap(o.x - face), y: snap(o.y + o.h), w: spanW, h: face, orientation: 'horizontal',
      lengthIn: spanW, note: `Header over ${o.label}${o.kind === 'fireplace' ? ' — verify against manual' : ''}`,
    });
    add({
      kind: 'sill', x: snap(o.x - face), y: snap(o.y - face), w: spanW, h: face, orientation: 'horizontal',
      lengthIn: spanW, note: `Sill under ${o.label}`,
    });
    // A jack under each header end when the opening does not start at the floor.
    if (o.y - face > face + 2) {
      for (const jx of [snap(o.x - face), snap(o.x + o.w)]) {
        const len = snap(o.y - face - face);
        if (len > 2.5) add({ kind: 'jack_stud', x: jx, y: face, w: face, h: len, orientation: 'vertical', lengthIn: len, note: `Jack at ${o.label}`, qty: 0 });
      }
    }
  }
  // Jacks with qty 0 are drawing-only ghosts of the segmented studs; drop them.
  for (let i = members.length - 1; i >= 0; i--) if (members[i].qty === 0) members.splice(i, 1);

  /* ---- blocking for hung equipment ---- */
  const bays: { a: number; b: number }[] = [];
  const sortedLines = [...studLines].sort((a, b) => a - b);
  for (let i = 0; i < sortedLines.length - 1; i++) bays.push({ a: sortedLines[i] + face, b: sortedLines[i + 1] });

  const blockingRow = (
    y: number, fromX: number, toX: number, kind: FramingMember['kind'], note: string,
  ) => {
    for (const bay of bays) {
      const a = Math.max(bay.a, fromX);
      const b = Math.min(bay.b, toX);
      if (b - a < 3) continue;
      const clear = snap(bay.b - bay.a);
      add({ kind, x: snap(bay.a), y: snap(y), w: clear, h: face, orientation: 'horizontal', lengthIn: clear, note });
    }
  };

  const tv = design.components.find((c) => c.type === 'tv');
  if (tv) {
    const cy = tv.y + tv.h / 2;
    const vesaH = Math.max(8, (tv as any).props.vesaH || 12);
    const pad = 6;
    const rows = [snap(cy + vesaH / 2 - face / 2), snap(cy - vesaH / 2 - face / 2)];
    for (const [i, ry] of rows.entries()) {
      blockingRow(ry, tv.x - pad, tv.x + tv.w + pad, 'tv_blocking', `TV mount blocking ${i === 0 ? 'upper' : 'lower'} — ${tv.label}`);
    }
    // A wider backer band so the mount can shift on install day.
    blockingRow(snap(cy - face / 2), tv.x - pad, tv.x + tv.w + pad, 'tv_blocking', 'TV mount blocking — centre band');
  }

  const sb = design.components.find((c) => c.type === 'soundbar');
  if (sb) blockingRow(snap(sb.y + sb.h / 2 - face / 2), sb.x - 4, sb.x + sb.w + 4, 'soundbar_blocking', `Soundbar blocking — ${sb.label}`);

  if (wall.midBlocking) {
    const midY = snap(H / 2 - face / 2);
    const occupied = (y: number, a: number, b: number) =>
      openings.some((o) => y + face > o.y - face && y < o.y + o.h + face && b > o.x && a < o.x + o.w) ||
      members.some((m) => m.orientation === 'horizontal' && (m.kind === 'tv_blocking' || m.kind === 'soundbar_blocking') && Math.abs(m.y - y) < 8 && b > m.x && a < m.x + m.w);
    for (const bay of bays) {
      if (bay.b - bay.a < 3) continue;
      if (occupied(midY, bay.a, bay.b)) continue;
      const clear = snap(bay.b - bay.a);
      add({ kind: 'blocking', x: snap(bay.a), y: midY, w: clear, h: face, orientation: 'horizontal', lengthIn: clear, note: 'Horizontal blocking / drywall backing' });
    }
  }

  /* ---- stats ---- */
  const totalLf = members.reduce((s, m) => s + (m.lengthIn * m.qty) / 12, 0);
  const depth = studDepth(wall);
  const boardFeet = members.reduce((s, m) => s + ((face * depth * m.lengthIn) / 144) * m.qty, 0);

  return {
    members,
    openings,
    studLines,
    stats: {
      studCount,
      crippleCount,
      plateLf: snap((W * (plateCount + 1)) / 12),
      headerCount,
      totalLf: Math.round(totalLf * 10) / 10,
      boardFeet: Math.round(boardFeet * 10) / 10,
      lumberLabel: wall.lumber === 'custom' ? 'Custom' : LUMBER[wall.lumber].label,
      framedDepth: depth,
      studLength,
      topOfStuds,
    },
  };
}

/** Members grouped for the framing legend on the drawing. */
export function framingLegend(res: FramingResult) {
  const groups = new Map<string, { kind: string; count: number; lf: number }>();
  for (const m of res.members) {
    const key = m.kind;
    const g = groups.get(key) || { kind: key, count: 0, lf: 0 };
    g.count += m.qty;
    g.lf += (m.lengthIn * m.qty) / 12;
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.lf - a.lf);
}

export const MEMBER_LABEL: Record<string, string> = {
  bottom_plate: 'Bottom plate',
  top_plate: 'Top plate',
  cap_plate: 'Cap plate',
  stud: 'Stud',
  king_stud: 'King stud',
  jack_stud: 'Jack stud',
  cripple: 'Cripple',
  header: 'Header',
  sill: 'Sill',
  ladder_rung: 'Ladder rung',
  niche_side: 'Niche side',
  blocking: 'Blocking',
  tv_blocking: 'TV blocking',
  soundbar_blocking: 'Soundbar blocking',
  furring: 'Furring',
};

export function unusedComponents(components: DesignComponent[]) { return components.length; }
