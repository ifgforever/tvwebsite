/**
 * The editor canvas.
 *
 * Pointer-driven move and resize in real inches, with centre/edge/object
 * snapping, alignment guides and a live dimension read-out. Everything commits
 * back to the model — the canvas never holds a truth of its own.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Design, DesignComponent } from '@shared/types';
import { snapRect, type Rect, type SnapGuide } from '@shared/geometry';
import { inchesToFraction, snap } from '@shared/units';
import { store } from '../lib/store';
import { shade, alpha } from '../render/defs';

export interface CanvasSettings {
  grid: number;
  snapToGrid: boolean;
  snapToCenter: boolean;
  snapToObjects: boolean;
  showDevices: boolean;
  showGrid: boolean;
  realistic: boolean;
}

export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
  grid: 1, snapToGrid: true, snapToCenter: true, snapToObjects: true,
  showDevices: true, showGrid: true, realistic: false,
};

type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface DragState {
  mode: 'move' | 'resize';
  handle?: Handle;
  startX: number;
  startY: number;
  originals: Map<string, Rect>;
  moved: boolean;
}

const TYPE_COLOR: Record<string, string> = {
  tv: '#6B7E94', fireplace: '#D2703F', niche: '#C8A94A', soundbar: '#8496AA',
  shelf: '#9C8A6A', shelf_column: '#A98455', cabinet: '#8C6E4A', panel: '#7A6A52',
  hearth: '#9AA0A8', outlet: '#D2703F', lowvolt: '#6B7E94', switch: '#D2703F',
  junction: '#C8A94A', equipment: '#7A7A86', custom: '#8A8A96',
};

export function DesignCanvas({ design, selection, settings }: {
  design: Design; selection: string[]; settings: CanvasSettings;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [px, setPx] = useState(900);
  const [guides, setGuides] = useState<SnapGuide[]>([]);
  const [hud, setHud] = useState<{ x: number; y: number; text: string } | null>(null);
  const drag = useRef<DragState | null>(null);

  const { wall } = design;
  const marginIn = Math.max(6, wall.widthIn * 0.05);
  const vbW = wall.widthIn + marginIn * 2;
  const vbH = wall.heightIn + marginIn * 2;
  const scale = px / vbW; // pixels per inch
  const sy = (y: number, h = 0) => wall.heightIn - y - h;

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setPx(el.clientWidth || 900));
    ro.observe(el);
    setPx(el.clientWidth || 900);
    return () => ro.disconnect();
  }, []);

  const toInches = useCallback((e: { clientX: number; clientY: number }) => {
    const el = wrapRef.current!;
    const r = el.getBoundingClientRect();
    const ix = ((e.clientX - r.left) / r.width) * vbW - marginIn;
    const iy = wall.heightIn - (((e.clientY - r.top) / r.height) * vbH - marginIn);
    return { x: ix, y: iy };
  }, [vbW, vbH, marginIn, wall.heightIn]);

  const editable = design.components.filter((c) => settings.showDevices || !isDevice(c));
  const selected = editable.filter((c) => selection.includes(c.id));

  const beginDrag = (e: React.PointerEvent, mode: 'move' | 'resize', handle?: Handle, id?: string) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const target = id ? design.components.find((c) => c.id === id) : null;
    if (target?.locked) return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);

    let ids = selection;
    if (id && !selection.includes(id)) {
      ids = e.shiftKey ? [...selection, id] : [id];
      store.select(ids);
    }
    const pt = toInches(e);
    const originals = new Map<string, Rect>();
    for (const c of design.components) if (ids.includes(c.id) && !c.locked) originals.set(c.id, { x: c.x, y: c.y, w: c.w, h: c.h });
    if (originals.size === 0) return;
    drag.current = { mode, handle, startX: pt.x, startY: pt.y, originals, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const pt = toInches(e);
    let dx = pt.x - d.startX;
    let dy = pt.y - d.startY;
    if (!d.moved) {
      if (Math.abs(dx) * scale < 3 && Math.abs(dy) * scale < 3) return;
      d.moved = true;
      store.beginInteraction();
    }

    const ids = [...d.originals.keys()];
    const others = design.components
      .filter((c) => !ids.includes(c.id) && !isDevice(c))
      .map((c) => ({ x: c.x, y: c.y, w: c.w, h: c.h }));

    if (d.mode === 'move') {
      const lead = d.originals.get(ids[0])!;
      const moving: Rect = { x: lead.x + dx, y: lead.y + dy, w: lead.w, h: lead.h };
      const res = snapRect(moving, others, wall, { ...settings, tolIn: 6 / scale });
      dx = res.x - lead.x;
      dy = res.y - lead.y;
      setGuides(res.guides);
      store.updateComponentsTransient((c) => {
        const o = d.originals.get(c.id);
        return o ? { ...c, x: snap(o.x + dx), y: snap(o.y + dy) } : c;
      }, ids);
      setHud({ x: lead.x + dx + lead.w / 2, y: lead.y + dy + lead.h, text: `X ${inchesToFraction(snap(lead.x + dx))}   Y ${inchesToFraction(snap(lead.y + dy))}` });
    } else {
      const h = d.handle!;
      store.updateComponentsTransient((c) => {
        const o = d.originals.get(c.id);
        if (!o) return c;
        let { x, y, w, hgt } = { x: o.x, y: o.y, w: o.w, hgt: o.h };
        if (h.includes('e')) w = Math.max(1, o.w + dx);
        if (h.includes('w')) { w = Math.max(1, o.w - dx); x = o.x + (o.w - w); }
        if (h.includes('n')) hgt = Math.max(1, o.h + dy);
        if (h.includes('s')) { hgt = Math.max(1, o.h - dy); y = o.y + (o.h - hgt); }
        if (settings.snapToGrid) { w = Math.round(w / settings.grid) * settings.grid; hgt = Math.round(hgt / settings.grid) * settings.grid; }
        return { ...c, x: snap(x), y: snap(y), w: snap(w), h: snap(hgt) };
      }, ids);
      const first = d.originals.get(ids[0])!;
      const live = design.components.find((c) => c.id === ids[0]);
      if (live) setHud({ x: live.x + live.w / 2, y: live.y + live.h, text: `${inchesToFraction(live.w)} × ${inchesToFraction(live.h)}` });
      else setHud({ x: first.x, y: first.y, text: '' });
    }
  };

  const endDrag = () => {
    if (drag.current?.moved) store.endInteraction('Move');
    drag.current = null;
    setGuides([]);
    setHud(null);
  };

  // Keyboard nudge and shortcuts live with the canvas so they work on desktop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? store.redo() : store.undo(); return; }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); store.redo(); return; }
      if (!selection.length) return;
      if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelection(design, selection); return; }
      if (e.key === 'Escape') { store.select([]); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); store.removeComponents(selection); return; }
      const step = e.shiftKey ? 6 : e.altKey ? 0.0625 : 1;
      const map: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
      const delta = map[e.key];
      if (delta) {
        e.preventDefault();
        store.updateComponents((c) => (c.locked ? c : { ...c, x: snap(c.x + delta[0]), y: snap(c.y + delta[1]) }), selection, 'Nudge');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selection, design]);

  const handleSizeIn = 11 / scale;

  return (
    <div
      ref={wrapRef}
      className={`stage${settings.showGrid && !settings.realistic ? ' blueprint' : ''}`}
      style={{ position: 'relative' }}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerDown={(e) => { if (e.target === e.currentTarget || (e.target as Element).id === 'stage-bg') store.select([]); }}
    >
      <svg viewBox={`${-marginIn} ${-marginIn} ${vbW} ${vbH}`} style={{ width: '100%', display: 'block' }}>
        <rect id="stage-bg" x={-marginIn} y={-marginIn} width={vbW} height={vbH} fill="transparent" />

        {/* Room datum */}
        <line x1={-marginIn} y1={sy(0)} x2={wall.widthIn + marginIn} y2={sy(0)} stroke="#3C3C46" strokeWidth={0.5} />
        <line x1={-marginIn} y1={sy(wall.ceilingHeightIn)} x2={wall.widthIn + marginIn} y2={sy(wall.ceilingHeightIn)} stroke="#3C3C46" strokeWidth={0.3} strokeDasharray="3 2" />

        {/* Wall body */}
        <rect x={0} y={0} width={wall.widthIn} height={wall.heightIn} fill={settings.realistic ? wall.colorHex : 'rgba(76,123,168,0.10)'} stroke="#4C7BA8" strokeWidth={0.4} />
        {wall.baseboardKeep && wall.baseboardHeightIn > 0 && (
          <rect x={0} y={sy(wall.baseboardHeightIn)} width={wall.widthIn} height={wall.baseboardHeightIn} fill="rgba(245,240,232,0.14)" />
        )}
        {/* Stud module ticks — a quiet reminder of where framing lands */}
        {settings.showGrid && Array.from({ length: Math.floor(wall.widthIn / wall.studSpacing) }).map((_, i) => (
          <line key={i} x1={(i + 1) * wall.studSpacing} y1={0} x2={(i + 1) * wall.studSpacing} y2={wall.heightIn} stroke="rgba(76,123,168,0.22)" strokeWidth={0.18} />
        ))}
        <line x1={wall.widthIn / 2} y1={-marginIn * 0.7} x2={wall.widthIn / 2} y2={wall.heightIn + marginIn * 0.5} stroke="rgba(200,169,74,0.5)" strokeWidth={0.25} strokeDasharray="6 2 1 2" />

        {/* Components */}
        {editable.map((c) => {
          const isSel = selection.includes(c.id);
          const color = TYPE_COLOR[c.type] || '#8A8A96';
          const dev = isDevice(c);
          return (
            <g key={c.id} onPointerDown={(e) => beginDrag(e, 'move', undefined, c.id)} style={{ cursor: c.locked ? 'not-allowed' : 'move' }}>
              <rect
                x={c.x} y={sy(c.y + c.h)} width={c.w} height={c.h}
                fill={dev ? 'transparent' : alpha(color, settings.realistic ? 0.55 : 0.24)}
                stroke={isSel ? '#E5C97A' : color}
                strokeWidth={isSel ? 0.6 : dev ? 0.35 : 0.3}
                strokeDasharray={dev ? '1.6 1' : c.type === 'tv' ? '3 1.4' : undefined}
                rx={dev ? 0.6 : 0}
              />
              {c.w * scale > 44 && c.h * scale > 18 && (
                <text x={c.x + c.w / 2} y={sy(c.y + c.h) + c.h / 2 + 1} textAnchor="middle"
                  fill={isSel ? '#F5F0E8' : shade(color, 60)}
                  // Fit to the box: mono glyphs are ~0.6em wide, so the label
                  // has to shrink for anything long in a narrow object.
                  fontSize={Math.min(c.h * 0.34, (c.w * 0.92) / (c.label.length * 0.6), 4.5)}
                  fontFamily="'JetBrains Mono', monospace" style={{ pointerEvents: 'none' }}>
                  {c.label}
                </text>
              )}
              {c.locked && (
                <text x={c.x + c.w - 1.4} y={sy(c.y + c.h) + 3.4} textAnchor="end" fill="#C8A94A" fontSize={3} style={{ pointerEvents: 'none' }}>🔒</text>
              )}
            </g>
          );
        })}

        {/* Selection handles */}
        {selected.filter((c) => !c.locked).map((c) => {
          const hs = handleSizeIn;
          const pts: [Handle, number, number][] = [
            ['nw', c.x, sy(c.y + c.h)], ['n', c.x + c.w / 2, sy(c.y + c.h)], ['ne', c.x + c.w, sy(c.y + c.h)],
            ['w', c.x, sy(c.y + c.h / 2)], ['e', c.x + c.w, sy(c.y + c.h / 2)],
            ['sw', c.x, sy(c.y)], ['s', c.x + c.w / 2, sy(c.y)], ['se', c.x + c.w, sy(c.y)],
          ];
          return (
            <g key={`h-${c.id}`}>
              <rect x={c.x} y={sy(c.y + c.h)} width={c.w} height={c.h} fill="none" stroke="#E5C97A" strokeWidth={0.35} />
              {selected.length === 1 && pts.map(([h, hx, hy]) => (
                <rect key={h} x={hx - hs / 2} y={hy - hs / 2} width={hs} height={hs}
                  fill="#0A0A0A" stroke="#E5C97A" strokeWidth={0.3} rx={hs * 0.18}
                  style={{ cursor: `${h}-resize` }}
                  onPointerDown={(e) => beginDrag(e, 'resize', h, c.id)} />
              ))}
            </g>
          );
        })}

        {/* Snap guides */}
        {guides.map((g, i) => (
          <g key={i}>
            {g.axis === 'x'
              ? <line x1={g.at} y1={-marginIn} x2={g.at} y2={wall.heightIn + marginIn} stroke="#E5C97A" strokeWidth={0.22} strokeDasharray="2 1.4" />
              : <line x1={-marginIn} y1={sy(g.at)} x2={wall.widthIn + marginIn} y2={sy(g.at)} stroke="#E5C97A" strokeWidth={0.22} strokeDasharray="2 1.4" />}
          </g>
        ))}

        {/* Live spacing between selected siblings */}
        {selected.length === 1 && !isDevice(selected[0]) && (
          <NeighbourSpacing target={selected[0]} design={design} sy={sy} />
        )}
      </svg>

      {hud && (
        <div className="hud" style={{
          left: `${((hud.x + marginIn) / vbW) * 100}%`,
          top: `${((wall.heightIn - hud.y + marginIn) / vbH) * 100}%`,
          transform: 'translate(-50%, -140%)',
        }}>{hud.text}</div>
      )}
    </div>
  );
}

/** Dimension the gap to the nearest neighbour left, right, above and below. */
function NeighbourSpacing({ target, design, sy }: { target: DesignComponent; design: Design; sy: (y: number, h?: number) => number }) {
  const others = design.components.filter((c) => c.id !== target.id && !isDevice(c));
  const cy = target.y + target.h / 2;
  const cx = target.x + target.w / 2;

  const left = others.filter((c) => c.x + c.w <= target.x + 0.1 && c.y < target.y + target.h && c.y + c.h > target.y)
    .sort((a, b) => (target.x - (b.x + b.w)) - (target.x - (a.x + a.w)))[0];
  const right = others.filter((c) => c.x >= target.x + target.w - 0.1 && c.y < target.y + target.h && c.y + c.h > target.y)
    .sort((a, b) => (a.x - (target.x + target.w)) - (b.x - (target.x + target.w)))[0];
  const below = others.filter((c) => c.y + c.h <= target.y + 0.1 && c.x < target.x + target.w && c.x + c.w > target.x)
    .sort((a, b) => (target.y - (b.y + b.h)) - (target.y - (a.y + a.h)))[0];
  const above = others.filter((c) => c.y >= target.y + target.h - 0.1 && c.x < target.x + target.w && c.x + c.w > target.x)
    .sort((a, b) => (a.y - (target.y + target.h)) - (b.y - (target.y + target.h)))[0];

  const seg = (x1: number, y1: number, x2: number, y2: number, text: string, key: string) => (
    <g key={key}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#7FC98A" strokeWidth={0.25} />
      <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 0.8} fill="#7FC98A" fontSize={2.8} textAnchor="middle" fontFamily="'JetBrains Mono', monospace">{text}</text>
    </g>
  );

  return (
    <g style={{ pointerEvents: 'none' }}>
      {left && seg(left.x + left.w, sy(cy), target.x, sy(cy), inchesToFraction(target.x - (left.x + left.w)), 'l')}
      {right && seg(target.x + target.w, sy(cy), right.x, sy(cy), inchesToFraction(right.x - (target.x + target.w)), 'r')}
      {below && seg(cx, sy(below.y + below.h), cx, sy(target.y), inchesToFraction(target.y - (below.y + below.h)), 'b')}
      {above && seg(cx, sy(target.y + target.h), cx, sy(above.y), inchesToFraction(above.y - (target.y + target.h)), 'a')}
      {!left && seg(0, sy(cy), target.x, sy(cy), inchesToFraction(target.x), 'wl')}
      {!right && seg(target.x + target.w, sy(cy), design.wall.widthIn, sy(cy), inchesToFraction(design.wall.widthIn - target.x - target.w), 'wr')}
      {!below && seg(cx, sy(0), cx, sy(target.y), inchesToFraction(target.y), 'wb')}
    </g>
  );
}

export const isDevice = (c: DesignComponent) =>
  c.type === 'outlet' || c.type === 'lowvolt' || c.type === 'switch' || c.type === 'junction' || c.type === 'equipment';

export function duplicateSelection(design: Design, selection: string[]) {
  const picked = design.components.filter((c) => selection.includes(c.id));
  if (!picked.length) return;
  const copies = picked.map((c) => ({
    ...c,
    id: `${c.type}_${Math.random().toString(36).slice(2, 9)}`,
    label: `${c.label} copy`,
    x: snap(Math.min(c.x + 6, design.wall.widthIn - c.w)),
    y: snap(Math.max(0, c.y - 6)),
    locked: false,
  })) as DesignComponent[];
  store.addComponents(copies, 'Duplicate');
}
